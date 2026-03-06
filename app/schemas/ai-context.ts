import { z } from 'zod';

/**
 * Schema for a single AI context item
 */
export const AIContextItemSchema = z.object({
  id: z.string(),
  text: z.string(),
});

/**
 * Schema for the AI context data structure
 * This data is indexed in Vectorize but NOT displayed on the frontend
 */
export const AIContextSchema = z.object({
  context: z.array(AIContextItemSchema),
});

// Export inferred types
export type AIContextItem = z.infer<typeof AIContextItemSchema>;
export type AIContext = z.infer<typeof AIContextSchema>;
