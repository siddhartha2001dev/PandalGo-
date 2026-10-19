import { z } from 'zod';

export const crowdReportSchema = z.object({
  crowdLevel: z.enum(['low', 'moderate', 'high'], {
    errorMap: () => ({ message: 'Please select crowd level: low, moderate, or high' }),
  }),
  estimatedWaitMinutes: z.number().min(0).max(600).nullable().optional(),
  coordinates: z
    .array(z.number())
    .length(2, 'Observation coordinates [longitude, latitude] are required')
    .refine(
      ([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90,
      'Invalid coordinate bounds'
    ),
  gpsAccuracy: z.number().nullable().optional(),
  source: z.enum(['gps', 'manual']).optional().default('gps'),
  imageReference: z.string().nullable().optional(),
});
