import mongoose from 'mongoose';

const importJobRowSchema = new mongoose.Schema({
  rowIndex: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  locality: {
    type: String,
    trim: true,
    default: 'Kolkata',
  },
  address: {
    type: String,
    trim: true,
    default: '',
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  category: {
    type: String,
    enum: [
      'Traditional / Heritage',
      'Theme / Contemporary',
      'Community / Baroari',
      'Bonedi Bari / Household',
      'Club / Local',
    ],
    default: 'Community / Baroari',
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    default: null,
  },
  images: {
    type: [String],
    default: [],
  },
  timings: {
    type: String,
    default: 'Open 24 Hours during Puja days',
  },
  festivalYear: {
    type: Number,
    default: () => new Date().getFullYear(),
  },
  validationStatus: {
    type: String,
    enum: ['valid', 'warning', 'invalid', 'duplicate'],
    default: 'valid',
  },
  validationErrors: {
    type: [String],
    default: [],
  },
  duplicateMatch: {
    existingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Puja' },
    name: String,
    reason: String,
  },
  isIncluded: {
    type: Boolean,
    default: true,
  },
  importOutcome: {
    type: String,
    enum: ['pending', 'created', 'updated', 'skipped', 'failed'],
    default: 'pending',
  },
  importMessage: {
    type: String,
    default: '',
  },
});

const importJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['preview', 'confirmed', 'completed', 'partial_failure', 'failed', 'cancelled'],
      default: 'preview',
      index: true,
    },
    source: {
      type: String,
      enum: ['paste', 'pasted_text', 'csv_upload', 'file', 'xlsx_upload', 'direct_json'],
      default: 'paste',
    },
    rawSnippet: {
      type: String,
      default: '',
    },
    totalRows: {
      type: Number,
      default: 0,
    },
    validRowsCount: {
      type: Number,
      default: 0,
    },
    warningRowsCount: {
      type: Number,
      default: 0,
    },
    invalidRowsCount: {
      type: Number,
      default: 0,
    },
    duplicateRowsCount: {
      type: Number,
      default: 0,
    },
    importedRowsCount: {
      type: Number,
      default: 0,
    },
    skippedRowsCount: {
      type: Number,
      default: 0,
    },
    failedRowsCount: {
      type: Number,
      default: 0,
    },
    rows: [importJobRowSchema],
    confirmedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const ImportJob = mongoose.model('ImportJob', importJobSchema);
