import { parse as parseCsv } from 'csv-parse/sync';
import { processDevBotMessage } from '../services/devBotService.js';
import {
  createImportPreview,
  confirmImportJob,
} from '../services/devBotImportService.js';
import { ImportJob } from '../models/ImportJob.js';
import { DevBotConversation } from '../models/DevBotConversation.js';

/**
 * Chat endpoint with Dev Bot
 * Accessible publicly or authenticated.
 */
export async function chat(req, res, next) {
  try {
    const { message, sessionId, conversationId } = req.body;
    let normalizedCoords = null;
    const rawCoords = req.body.userCoords || req.body.userLocation;
    if (Array.isArray(rawCoords) && rawCoords.length === 2) {
      normalizedCoords = rawCoords;
    } else if (rawCoords && typeof rawCoords === 'object') {
      const lat = rawCoords.latitude ?? rawCoords.lat;
      const lng = rawCoords.longitude ?? rawCoords.lng;
      if (typeof lat === 'number' && typeof lng === 'number') {
        normalizedCoords = [lng, lat]; // GeoJSON format [longitude, latitude]
      }
    }

    const user = req.user || null;
    const ipAddress = req.ip || req.connection?.remoteAddress || '';

    const result = await processDevBotMessage({
      sessionId: sessionId || req.cookies?.devbot_session || 'guest_session',
      user,
      message,
      userCoords: normalizedCoords,
      conversationId,
      ipAddress,
    });

    const responsePayload = {
      success: true,
      reply: result.message?.content || '',
      cards: result.pujas || [],
      places: result.places || [],
      routePlan: result.routePlan || null,
      locationResult: result.locationResult || null,
      currentNews: result.currentNews || [],
      webResults: result.webResults || [],
      conversationId: result.conversationId,
      message: result.message,
      pujas: result.pujas,
      importPreview: result.importPreview,
      importSummary: result.importSummary,
    };

    res.json({
      ...responsePayload,
      data: responsePayload,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve conversation history
 */
export async function getConversation(req, res, next) {
  try {
    const { id } = req.params;
    const user = req.user || null;
    const sessionId = req.query.sessionId || req.cookies?.devbot_session;

    const filter = { _id: id };
    if (user && user.role !== 'admin') {
      filter.userId = user._id;
    } else if (!user && sessionId) {
      filter.sessionId = sessionId;
    }

    const conversation = await DevBotConversation.findOne(filter);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    res.json({ success: true, conversation });
  } catch (err) {
    next(err);
  }
}

/**
 * Clear conversation
 */
export async function deleteConversation(req, res, next) {
  try {
    const { id } = req.params;
    const user = req.user || null;

    const filter = { _id: id };
    if (user && user.role !== 'admin') {
      filter.userId = user._id;
    }

    await DevBotConversation.deleteOne(filter);
    res.json({ success: true, message: 'Conversation cleared successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Create an import preview from raw text or CSV file upload
 */
export async function createImportJobPreview(req, res, next) {
  try {
    const adminUserId = req.user._id;
    let fileRows = null;
    let source = req.body?.sourceType || 'paste';
    let rawInput = req.body?.rawInput || req.body?.rawText || '';

    // Check if file was uploaded via multipart/form-data
    if (req.file) {
      source = 'csv_upload';
      const fileBuffer = req.file.buffer;
      const fileContent = fileBuffer.toString('utf-8');
      try {
        fileRows = parseCsv(fileContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } catch (parseErr) {
        return res.status(400).json({
          success: false,
          message: `Failed to parse uploaded CSV file: ${parseErr.message}`,
        });
      }
    }

    const preview = await createImportPreview({
      adminUserId,
      rawInput,
      fileRows,
      source,
    });

    if (!preview.success) {
      return res.status(400).json(preview);
    }

    res.json(preview);
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Fetch ImportJob by Job ID
 */
export async function getImportJob(req, res, next) {
  try {
    const { jobId } = req.params;
    const job = await ImportJob.findOne({ jobId });
    if (!job) {
      return res.status(404).json({ success: false, message: `Import job "${jobId}" not found.` });
    }
    res.json({ success: true, job });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Update/Edit row fields or toggle inclusion in an ImportJob
 */
export async function updateImportJobRow(req, res, next) {
  try {
    const { jobId } = req.params;
    const { rowIndex, isIncluded, name, locality, address, category, coordinates } = req.body;

    const job = await ImportJob.findOne({ jobId });
    if (!job) {
      return res.status(404).json({ success: false, message: `Import job "${jobId}" not found.` });
    }

    const row = job.rows.find((r) => r.rowIndex === rowIndex);
    if (!row) {
      return res.status(404).json({ success: false, message: `Row index ${rowIndex} not found in job.` });
    }

    if (typeof isIncluded === 'boolean') row.isIncluded = isIncluded;
    if (name) row.name = name.trim();
    if (locality) row.locality = locality.trim();
    if (address) row.address = address.trim();
    if (category) row.category = category;
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      row.coordinates = coordinates;
      row.validationStatus = 'valid';
      row.validationErrors = [];
    }

    // Recalculate summary counts
    job.validRowsCount = job.rows.filter((r) => r.validationStatus === 'valid' && r.isIncluded).length;
    job.warningRowsCount = job.rows.filter((r) => r.validationStatus === 'warning' && r.isIncluded).length;

    await job.save();

    res.json({ success: true, row, job });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Explicitly confirm and execute batch import for an ImportJob
 */
export async function confirmImport(req, res, next) {
  try {
    const { jobId } = req.params;
    const adminUserId = req.user._id;
    const selectedRowIndexes = req.body.selectedRowIndexes || req.body.selectedRowNumbers;
    const ipAddress = req.ip || req.connection?.remoteAddress || '';

    const result = await confirmImportJob({
      jobId,
      adminUserId,
      selectedRowIndexes,
      ipAddress,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Retry failed or skipped rows
 */
export async function retryFailedRows(req, res, next) {
  try {
    const { jobId } = req.params;
    const adminUserId = req.user._id;
    const ipAddress = req.ip || req.connection?.remoteAddress || '';

    const job = await ImportJob.findOne({ jobId });
    if (!job) {
      return res.status(404).json({ success: false, message: `Import job "${jobId}" not found.` });
    }

    const failedIndexes = job.rows
      .filter((r) => r.importOutcome === 'failed')
      .map((r) => r.rowIndex);

    if (failedIndexes.length === 0) {
      return res.json({ success: true, message: 'No failed rows to retry in this job.' });
    }

    const result = await confirmImportJob({
      jobId,
      adminUserId,
      selectedRowIndexes: failedIndexes,
      ipAddress,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
