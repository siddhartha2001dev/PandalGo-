import mongoose from 'mongoose';

const devBotMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system', 'tool'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000,
  },
  pujas: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Puja' },
      name: String,
      slug: String,
      locality: String,
      address: String,
      category: String,
      image: String,
      description: String,
      distanceMeters: Number,
      crowdStatus: String,
      estimatedWaitMinutes: Number,
      coordinates: [Number],
    },
  ],
  places: [
    {
      id: String,
      name: String,
      category: String,
      cuisine: String,
      address: String,
      coordinates: [Number],
      distanceMeters: Number,
      distanceText: String,
      openingHours: String,
      website: String,
      locationUrl: String,
    },
  ],
  routePlan: {
    origin: [Number],
    stops: Array,
    totalDistanceMeters: Number,
    totalDistanceText: String,
    googleMapsUrl: String,
    method: String,
  },
  locationResult: {
    query: String,
    displayName: String,
    coordinates: [Number],
    mapUrl: String,
  },
  currentNews: [
    {
      title: String,
      link: String,
      publishedAt: String,
    },
  ],
  webResults: [
    {
      title: String,
      url: String,
      snippet: String,
    },
  ],
  importPreview: {
    jobId: String,
    totalRows: Number,
    validRowsCount: Number,
    warningRowsCount: Number,
    invalidRowsCount: Number,
    duplicateRowsCount: Number,
    rows: Array,
  },
  importSummary: {
    jobId: String,
    imported: Number,
    skipped: Number,
    failed: Number,
    total: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const devBotConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['visitor', 'admin'],
      default: 'visitor',
    },
    title: {
      type: String,
      default: 'Puja Discovery Chat',
      maxlength: 120,
    },
    messages: [devBotMessageSchema],
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

devBotConversationSchema.index({ userId: 1, lastActiveAt: -1 });
devBotConversationSchema.index({ sessionId: 1, lastActiveAt: -1 });

export const DevBotConversation = mongoose.model('DevBotConversation', devBotConversationSchema);
