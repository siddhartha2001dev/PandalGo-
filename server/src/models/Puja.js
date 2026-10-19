import mongoose from 'mongoose';

const pujaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Pandal name is required'],
      trim: true,
      maxlength: 150,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: 250,
    },
    locality: {
      type: String,
      required: [true, 'Locality is required'],
      trim: true,
      maxlength: 100,
      index: true,
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
    festivalYear: {
      type: Number,
      default: () => new Date().getFullYear(),
    },
    timings: {
      type: String,
      default: 'Open 24 Hours during Puja days',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      // GeoJSON format: [longitude, latitude]
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function (coords) {
            return (
              Array.isArray(coords) &&
              coords.length === 2 &&
              coords[0] >= -180 &&
              coords[0] <= 180 &&
              coords[1] >= -90 &&
              coords[1] <= 90
            );
          },
          message: 'Coordinates must be valid [longitude, latitude]',
        },
      },
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index on location for geospatial queries ($near, $geoNear)
pujaSchema.index({ location: '2dsphere' });
pujaSchema.index({ name: 'text', locality: 'text', address: 'text', description: 'text' });

export const Puja = mongoose.model('Puja', pujaSchema);
