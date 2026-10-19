import { z } from 'zod';

export const submitPujaSchema = z.object({
  name: z.string().min(3, 'Pandal name must be at least 3 characters').max(150),
  description: z.string().max(2000).optional().default(''),
  address: z.string().min(5, 'Address must be at least 5 characters').max(250),
  locality: z.string().min(2, 'Locality must be at least 2 characters').max(100),
  category: z
    .enum([
      'Traditional / Heritage',
      'Theme / Contemporary',
      'Community / Baroari',
      'Bonedi Bari / Household',
      'Club / Local',
    ])
    .optional()
    .default('Community / Baroari'),
  festivalYear: z.number().int().min(2000).max(2100).optional(),
  timings: z.string().max(100).optional().default('Open 24 Hours during Puja days'),
  // Coordinates in GeoJSON order: [longitude, latitude]
    coordinates: z
    .array(z.number())
    .length(2, 'Coordinates must contain [longitude, latitude]')
    .refine(
      ([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90,
      'Invalid coordinate bounds'
    ),
  images: z.array(z.string().url('Image must be a valid URL')).optional().default([]),
  locationSource: z.enum(['gps', 'manual']).optional().default('gps'),
  reportedGpsAccuracy: z.number().optional().nullable(),
});

export const reviewPujaSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().max(500).optional().default(''),
});
