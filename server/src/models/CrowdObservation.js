import mongoose from 'mongoose';

const crowdObservationSchema = new mongoose.Schema(
  {
    pujaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Puja',
      required: true,
      index: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    observationLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      // GeoJSON: [longitude, latitude]
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
    gpsAccuracy: {
      type: Number,
      default: null,
    },
    crowdLevel: {
      type: String,
      enum: ['low', 'moderate', 'high'],
      required: true,
    },
    estimatedWaitMinutes: {
      type: Number,
      min: 0,
      max: 600,
      default: null,
    },
    imageReference: {
      type: String,
      default: null,
    },
    imageAnalysisResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    source: {
      type: String,
      enum: ['gps', 'manual', 'computer_vision', 'cctv'],
      default: 'gps',
    },
  },
  {
    timestamps: true,
  }
);

crowdObservationSchema.index({ observationLocation: '2dsphere' });
crowdObservationSchema.index({ pujaId: 1, createdAt: -1 });

export const CrowdObservation = mongoose.model('CrowdObservation', crowdObservationSchema);
