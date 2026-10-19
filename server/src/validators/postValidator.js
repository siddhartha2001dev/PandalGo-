import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().max(150).optional().default(''),
  description: z.string().min(5, 'Post description must be at least 5 characters').max(3000),
  locality: z.string().min(2, 'Locality is required').max(100),
  images: z.array(z.string()).max(6, 'Maximum 6 images allowed').optional().default([]),
  associatedPujaId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Puja ID').nullable().optional(),
  coordinates: z
    .array(z.number())
    .length(2)
    .refine(
      ([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90,
      'Invalid coordinate bounds'
    )
    .nullable()
    .optional(),
  locationSource: z.enum(['gps', 'manual']).nullable().optional(),
  reportedGpsAccuracy: z.number().nullable().optional(),
  category: z
    .enum([
      'Pandal Discovery',
      'Puja Experience',
      'Pandal Photography',
      'Crowd Update',
      'New Pandal Suggestion',
    ])
    .optional()
    .default('Puja Experience'),
});
