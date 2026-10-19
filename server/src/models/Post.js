import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 3000,
    },
    images: {
      type: [String],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length <= 6;
        },
        message: 'A maximum of 6 photographs can be attached to a post.',
      },
      default: [],
    },
    locality: {
      type: String,
      required: [true, 'Locality is required'],
      trim: true,
      maxlength: 100,
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      // GeoJSON: [longitude, latitude]
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },
    locationSource: {
      type: String,
      enum: ['gps', 'manual', null],
      default: null,
    },
    reportedGpsAccuracy: {
      type: Number,
      default: null,
    },
    associatedPujaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Puja',
      default: null,
      index: true,
    },
    category: {
      type: String,
      enum: [
        'Pandal Discovery',
        'Puja Experience',
        'Pandal Photography',
        'Crowd Update',
        'New Pandal Suggestion',
      ],
      default: 'Puja Experience',
      index: true,
    },
    moderationStatus: {
      type: String,
      enum: ['published', 'flagged', 'hidden'],
      default: 'published',
      index: true,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Optional 2dsphere index for location-based post queries if location exists
postSchema.index({ location: '2dsphere' });
postSchema.index({ createdAt: -1 });

export const Post = mongoose.model('Post', postSchema);
