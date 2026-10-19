import { parse as parseCsv } from 'csv-parse/sync';
import crypto from 'crypto';
import { Puja } from '../models/Puja.js';
import { ImportJob } from '../models/ImportJob.js';
import { generateUniqueSlug } from '../controllers/pujaController.js';
import { CrowdObservation } from '../models/CrowdObservation.js';
import { validateCoordinates, geocodeLocationQuery, calculateDistanceMeters } from './devBotLocationService.js';
import { recordAuditEvent } from './devBotAuditService.js';

const VALID_CATEGORIES = [
  'Traditional / Heritage',
  'Theme / Contemporary',
  'Community / Baroari',
  'Bonedi Bari / Household',
  'Club / Local',
];

/**
 * Normalizes category string to standard enum
 */
function normalizeCategory(raw) {
  if (!raw || typeof raw !== 'string') return 'Community / Baroari';
  const lower = raw.toLowerCase();
  if (/heritage|traditional|bonedi\s*bari/i.test(lower)) {
    if (/bonedi|rajbari|household/i.test(lower)) return 'Bonedi Bari / Household';
    return 'Traditional / Heritage';
  }
  if (/theme|contemporary|modern/i.test(lower)) return 'Theme / Contemporary';
  if (/club/i.test(lower)) return 'Club / Local';
  return 'Community / Baroari';
}

/**
 * Parses raw text paste (CSV, TSV, or delimiter-separated rows) into structured candidate records
 */
export function parseRawPandalText(rawText) {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^#|^\/\//.test(l));

  if (lines.length === 0) return [];

  // Check if first line is explicitly a CSV/TSV header row
  const firstLineLower = lines[0].toLowerCase();
  const isLikelyCsvHeader =
    (firstLineLower.includes('name') || firstLineLower.includes('pandal') || firstLineLower.includes('puja')) &&
    (firstLineLower.includes(',') || firstLineLower.includes('\t'));

  if (isLikelyCsvHeader && lines.length > 1) {
    try {
      const records = parseCsv(lines.join('\n'), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      if (records.length > 0) {
        return records.map((r) => mapRecordToCandidate(r));
      }
    } catch {
      // Fallback to line-by-line delimiter parser
    }
  }

  // Fallback: Line-by-line delimiter parser
  const candidates = [];
  for (const line of lines) {
    // Strip leading list numbers like "1.", "1)", "-", "*", "1 - "
    const cleanLine = line.replace(/^(\d+[\.\)\-:]|\s*[-*•])\s*/, '').trim();
    if (!cleanLine) continue;

    let parts = [];
    if (cleanLine.includes('—')) {
      parts = cleanLine.split('—');
    } else if (cleanLine.includes('–')) {
      parts = cleanLine.split('–');
    } else if (cleanLine.includes(' - ')) {
      parts = cleanLine.split(' - ');
    } else if (cleanLine.includes('|')) {
      parts = cleanLine.split('|');
    } else if (cleanLine.includes('\t')) {
      parts = cleanLine.split('\t');
    } else if (cleanLine.includes(';')) {
      parts = cleanLine.split(';');
    } else if (cleanLine.includes(',') && !cleanLine.includes('Street') && !cleanLine.includes('Road') && !cleanLine.includes('Sarani')) {
      parts = cleanLine.split(',');
    } else {
      parts = [cleanLine];
    }

    const trimmed = parts.map((p) => p.trim()).filter(Boolean);
    if (trimmed.length > 0) {
      candidates.push({
        name: trimmed[0] || '',
        locality: trimmed[2] || trimmed[1] || 'Kolkata',
        address: trimmed[1] || trimmed[0],
        category: trimmed[3] ? normalizeCategory(trimmed[3]) : 'Community / Baroari',
        description: trimmed[4] || '',
      });
    }
  }

  return candidates;
}

/**
 * Maps varying CSV header names to standardized candidate object
 */
function mapRecordToCandidate(record) {
  const getVal = (...keys) => {
    for (const k of keys) {
      for (const [recKey, recVal] of Object.entries(record)) {
        if (recKey.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')) {
          return String(recVal || '').trim();
        }
      }
    }
    return '';
  };

  const name = getVal('name', 'pandal', 'puja', 'pandalname', 'title');
  const locality = getVal('locality', 'area', 'zone', 'neighborhood') || 'Kolkata';
  const address = getVal('address', 'street', 'location', 'landmark') || locality;
  const description = getVal('description', 'about', 'desc', 'details');
  const categoryRaw = getVal('category', 'type');
  const category = normalizeCategory(categoryRaw);
  const timings = getVal('timings', 'time', 'hours') || 'Open 24 Hours during Puja days';
  const imagesRaw = getVal('images', 'image', 'photo', 'photourl', 'imageurl');

  let coordinates = null;
  const lonRaw = getVal('longitude', 'lng', 'lon');
  const latRaw = getVal('latitude', 'lat');
  const coordsRaw = getVal('coordinates', 'coord', 'locationcoords');

  if (lonRaw && latRaw) {
    const lon = parseFloat(lonRaw);
    const lat = parseFloat(latRaw);
    if (!isNaN(lon) && !isNaN(lat)) coordinates = [lon, lat];
  } else if (coordsRaw) {
    const parts = coordsRaw.split(/[,;\s]+/).map(parseFloat).filter((n) => !isNaN(n));
    if (parts.length === 2) {
      // If first number is ~22 and second is ~88, swap because GeoJSON requires [lng, lat]
      if (parts[0] < 40 && parts[1] > 60) coordinates = [parts[1], parts[0]];
      else coordinates = [parts[0], parts[1]];
    }
  }

  return {
    name,
    locality,
    address,
    description,
    category,
    timings,
    coordinates,
    images: imagesRaw ? imagesRaw.split(/[|,;]/).map((u) => u.trim()).filter((u) => u.startsWith('http')) : [],
  };
}

/**
 * Validates candidate rows against existing database records and schema rules
 */
export async function validateCandidateRows(candidates) {
  const validatedRows = [];

  // Fetch existing pandals for duplicate detection
  const existingPujas = await Puja.find({}, { name: 1, slug: 1, location: 1, locality: 1 }).lean();

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const errors = [];
    let status = 'valid';
    let duplicateMatch = null;

    // 1. Required field checks
    if (!c.name || c.name.length < 3) {
      errors.push('Pandal name is required (min 3 characters)');
      status = 'invalid';
    }

    if (!c.locality || c.locality.length < 2) {
      errors.push('Locality is required');
      if (status !== 'invalid') status = 'warning';
    }

    if (!c.address || c.address.length < 3) {
      errors.push('Address is required');
      if (status !== 'invalid') status = 'warning';
    }

    // 2. Coordinates validation / geocoding lookup
    let coordinates = c.coordinates;
    if (coordinates) {
      const coordVal = validateCoordinates(coordinates);
      if (!coordVal.valid) {
        errors.push(coordVal.error);
        coordinates = null;
        if (status !== 'invalid') status = 'warning';
      }
    } else if (c.name && c.address) {
      // Attempt lightweight geocoding resolution
      try {
        const geo = await geocodeLocationQuery(`${c.name}, ${c.address}`);
        if (geo?.coordinates) {
          coordinates = geo.coordinates;
        } else {
          errors.push('Coordinates missing (approximate geocode unavailable; location coordinates recommended)');
          if (status !== 'invalid') status = 'warning';
        }
      } catch {
        errors.push('Coordinates missing');
        if (status !== 'invalid') status = 'warning';
      }
    }

    // 3. Duplicate check against existing DB
    if (c.name) {
      const normalizedName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existingMatch = existingPujas.find((ep) => {
        const epNorm = ep.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return epNorm === normalizedName || epNorm.includes(normalizedName) || normalizedName.includes(epNorm);
      });

      if (existingMatch) {
        status = 'duplicate';
        duplicateMatch = {
          existingId: existingMatch._id,
          name: existingMatch.name,
          reason: `Matches existing record "${existingMatch.name}" in ${existingMatch.locality || 'Kolkata'}`,
        };
        errors.push(duplicateMatch.reason);
      } else if (coordinates) {
        // Proximity check (< 60m)
        const closePuja = existingPujas.find((ep) => {
          if (ep.location?.coordinates) {
            const dist = calculateDistanceMeters(coordinates, ep.location.coordinates);
            return dist !== null && dist < 60;
          }
          return false;
        });
        if (closePuja) {
          if (status !== 'invalid') status = 'warning';
          errors.push(`Within 60m of existing pandal "${closePuja.name}". Verify exact gate location.`);
        }
      }
    }

    validatedRows.push({
      rowIndex: i + 1,
      name: c.name || '',
      locality: c.locality || 'Kolkata',
      address: c.address || '',
      description: c.description || '',
      category: VALID_CATEGORIES.includes(c.category) ? c.category : 'Community / Baroari',
      coordinates,
      images: Array.isArray(c.images) ? c.images : [],
      timings: c.timings || 'Open 24 Hours during Puja days',
      festivalYear: c.festivalYear || new Date().getFullYear(),
      validationStatus: status,
      validationErrors: errors,
      duplicateMatch,
      isIncluded: status === 'valid' || status === 'warning',
      importOutcome: 'pending',
      importMessage: '',
    });
  }

  return validatedRows;
}

/**
 * Creates an ImportJob and returns a structured preview
 */
export async function createImportPreview({ adminUserId, rawInput = '', fileRows = null, source = 'paste' }) {
  let candidates = [];
  if (fileRows && Array.isArray(fileRows) && fileRows.length > 0) {
    candidates = fileRows.map((r) => mapRecordToCandidate(r));
  } else if (rawInput) {
    candidates = parseRawPandalText(rawInput);
  }

  if (candidates.length === 0) {
    return {
      success: false,
      message: 'No readable pandal entries detected. Please provide a comma-separated, tab-separated, or line-delimited list.',
    };
  }

  const rows = await validateCandidateRows(candidates);

  const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const totalRows = rows.length;
  const validRowsCount = rows.filter((r) => r.validationStatus === 'valid').length;
  const warningRowsCount = rows.filter((r) => r.validationStatus === 'warning').length;
  const invalidRowsCount = rows.filter((r) => r.validationStatus === 'invalid').length;
  const duplicateRowsCount = rows.filter((r) => r.validationStatus === 'duplicate').length;

  const importJob = await ImportJob.create({
    jobId,
    adminUserId,
    status: 'preview',
    source,
    rawSnippet: rawInput.slice(0, 1000),
    totalRows,
    validRowsCount,
    warningRowsCount,
    invalidRowsCount,
    duplicateRowsCount,
    rows,
  });

  const summary = {
    totalRows,
    validRows: validRowsCount,
    warningRows: warningRowsCount,
    invalidRows: invalidRowsCount,
    duplicateRows: duplicateRowsCount,
  };

  const previewPayload = {
    jobId,
    totalRows,
    validRowsCount,
    warningRowsCount,
    invalidRowsCount,
    duplicateRowsCount,
    summary,
    rows,
    message: `Parsed ${totalRows} rows: ${validRowsCount} valid, ${warningRowsCount} with warnings, ${duplicateRowsCount} duplicate candidates, and ${invalidRowsCount} invalid.`,
  };

  return {
    success: true,
    ...previewPayload,
    data: previewPayload,
    preview: previewPayload,
  };
}

/**
 * Confirms and executes batch database writes for an ImportJob
 */
export async function confirmImportJob({ jobId, adminUserId, selectedRowIndexes = null, ipAddress = '' }) {
  const job = await ImportJob.findOne({ jobId });
  if (!job) {
    return { success: false, message: `Import job "${jobId}" not found.` };
  }

  if (job.status === 'completed') {
    return {
      success: true,
      message: `Job ${jobId} was already successfully imported.`,
      importedCount: job.importedRowsCount,
      skippedCount: job.skippedRowsCount,
      failedCount: job.failedRowsCount,
    };
  }

  job.status = 'confirmed';
  job.confirmedAt = new Date();

  // Filter rows marked for inclusion
  const rowsToImport = job.rows.filter((r) => {
    if (selectedRowIndexes && Array.isArray(selectedRowIndexes)) {
      return selectedRowIndexes.includes(r.rowIndex) && r.validationStatus !== 'invalid';
    }
    return r.isIncluded && r.validationStatus !== 'invalid';
  });

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const createdPujas = [];

  for (const row of rowsToImport) {
    try {
      // Re-verify slug duplicate
      const slug = await generateUniqueSlug(row.name);

      // Check if pandal with exact name already exists to avoid race-condition duplication
      const existing = await Puja.findOne({
        name: new RegExp(`^${row.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      });

      if (existing) {
        row.importOutcome = 'skipped';
        row.importMessage = `Skipped: Record "${existing.name}" already exists.`;
        skipped++;
        continue;
      }

      // Default coordinates if missing (central Kolkata fallback for discovery listing)
      const coordinates = row.coordinates && row.coordinates.length === 2 ? row.coordinates : [88.3639, 22.5726];

      const newPuja = await Puja.create({
        name: row.name,
        slug,
        locality: row.locality,
        address: row.address,
        description: row.description || `Famous ${row.locality} community Durga Puja pandal celebration.`,
        category: row.category,
        timings: row.timings || 'Open 24 Hours during Puja days',
        festivalYear: row.festivalYear || 2026,
        location: {
          type: 'Point',
          coordinates,
        },
        images:
          row.images && row.images.length > 0
            ? row.images
            : ['https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=1200&q=80'],
        status: 'approved',
        createdBy: adminUserId,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      });

      // Initial crowd baseline
      try {
        await CrowdObservation.create({
          pujaId: newPuja._id,
          reportedBy: adminUserId,
          observationLocation: {
            type: 'Point',
            coordinates,
          },
          crowdLevel: 'moderate',
          estimatedWaitMinutes: 15,
          source: 'manual',
          imageReference: newPuja.images?.[0] || null,
        });
      } catch {
        // Non-blocking crowd baseline
      }

      row.importOutcome = 'created';
      row.importMessage = `Successfully created as "${newPuja.name}" (${newPuja.slug})`;
      imported++;
      createdPujas.push(newPuja);
    } catch (err) {
      row.importOutcome = 'failed';
      row.importMessage = `Failed: ${err.message}`;
      failed++;
    }
  }

  // Update rows that were not included as skipped
  job.rows.forEach((r) => {
    if (r.importOutcome === 'pending') {
      r.importOutcome = 'skipped';
      r.importMessage = 'Excluded by administrator in preview.';
      skipped++;
    }
  });

  job.importedRowsCount = imported;
  job.skippedRowsCount = skipped;
  job.failedRowsCount = failed;
  job.status = failed > 0 ? (imported > 0 ? 'partial_failure' : 'failed') : 'completed';
  job.completedAt = new Date();
  await job.save();

  // Audit log
  await recordAuditEvent({
    actorId: adminUserId,
    action: 'DEVBOT_BULK_IMPORT',
    targetType: 'ImportJob',
    targetId: jobId,
    details: {
      totalRows: job.totalRows,
      imported,
      skipped,
      failed,
      sampleCreated: createdPujas.slice(0, 5).map((p) => p.name),
    },
    ipAddress,
  });

  const resultPayload = {
    jobId,
    status: job.status,
    total: job.totalRows,
    imported,
    skipped,
    failed,
    importedCount: imported,
    skippedCount: skipped,
    failedCount: failed,
    createdPujas: createdPujas.map((p) => ({ _id: p._id, name: p.name, slug: p.slug, locality: p.locality })),
    message: `Import complete! Added ${imported} new approved pandals to the live directory. (${skipped} skipped, ${failed} failed).`,
  };

  return {
    success: true,
    ...resultPayload,
    data: resultPayload,
  };
}
