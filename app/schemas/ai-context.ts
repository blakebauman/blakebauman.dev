import { z } from 'zod';

/**
 * What an AI-context entry is for. Not cosmetic — the chunker uses it to pick a
 * heading, and the prompt leans on `scope` entries specifically.
 *
 * - `background`: narrative depth on a project, role, or theme.
 * - `faq`: a direct answer to a question visitors actually ask.
 * - `scope`: the boundaries of the record — what is deployed vs. prototyped,
 *   what is private, what is deliberately not claimed. This is the anti-
 *   hallucination layer: given explicit language for limits, the model reaches
 *   for that instead of inventing scale.
 */
export const AIContextKindSchema = z.enum(['background', 'faq', 'scope']);

/**
 * Schema for a single AI context item.
 *
 * `title` is required because it becomes the chunk's first embedded line —
 * without the entity name inside the embedded text, a chunk about edgevault
 * competes on prose alone against every other Cloudflare project.
 */
export const AIContextItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string(),
  // Feeds the guardrail's data-derived on-topic vocabulary, so the topic list
  // grows with the content instead of drifting from it.
  topics: z.array(z.string()).default([]),
  aliases: z.array(z.string()).optional(),
  kind: AIContextKindSchema.default('background'),
});

/**
 * Schema for the AI context data structure.
 * This data is indexed in Vectorize but NOT displayed on the frontend.
 */
export const AIContextSchema = z.object({
  context: z.array(AIContextItemSchema),
});

// Export inferred types
export type AIContextKind = z.infer<typeof AIContextKindSchema>;
export type AIContextItem = z.infer<typeof AIContextItemSchema>;
export type AIContext = z.infer<typeof AIContextSchema>;
