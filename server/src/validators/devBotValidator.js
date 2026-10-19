import { z } from 'zod';

export const devBotChatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(4000, 'Message is too long (max 4000 characters)'),
  sessionId: z.string().optional(),
  conversationId: z.string().optional(),
  userCoords: z.union([
    z.array(z.number()).length(2),
    z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    z.object({
      lat: z.number(),
      lng: z.number(),
    }),
  ]).optional(),
  userLocation: z.union([
    z.array(z.number()).length(2),
    z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    z.object({
      lat: z.number(),
      lng: z.number(),
    }),
  ]).optional(),
});

export const devBotImportPreviewSchema = z.object({
  rawInput: z.string().min(3).max(50000).optional(),
  rawText: z.string().min(3).max(50000).optional(),
  sourceType: z.string().optional(),
}).refine((data) => data.rawInput || data.rawText, {
  message: 'Import content must not be empty (provide rawInput or rawText)',
});

export const devBotImportConfirmSchema = z.object({
  selectedRowIndexes: z.array(z.number()).optional(),
  selectedRowNumbers: z.array(z.number()).optional(),
});

export const devBotUpdateRowSchema = z.object({
  rowIndex: z.number().int().positive(),
  name: z.string().optional(),
  locality: z.string().optional(),
  address: z.string().optional(),
  category: z.string().optional(),
  coordinates: z.array(z.number()).length(2).optional(),
  isIncluded: z.boolean().optional(),
});
