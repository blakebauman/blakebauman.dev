import { z } from 'zod';

/**
 * How far along a project actually is. Indexed and surfaced to the chatbot so
 * it has concrete language for the difference between something deployed and
 * something that is a working prototype — without it the model reaches for
 * "production-ready" by default and overstates the record.
 */
export const MaturitySchema = z.enum(['production', 'prototype', 'reference', 'archived']);

/**
 * Schema for a project in the resume
 */
export const ProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  context: z.string().optional(),
  tech: z.array(z.string()),
  github: z.string().optional(),
  website: z.string().optional(),
  year: z.string().optional(),
  status: z.string().optional(),
  visibility: z.string().optional(),
  // Retrieval-facing additions. All optional so existing entries keep validating.
  //
  // `highlights` exist because a single prose `description` embeds as one
  // averaged vector: a question about one specific capability matches it only
  // weakly. Each highlight becomes its own chunk.
  highlights: z.array(z.string()).optional(),
  // Alternate names a visitor might use ("the MCP gateway", "felix harness").
  // Feeds both the chunk title line and the guardrail's on-topic matching, so
  // adding a project no longer means hand-editing a keyword list.
  aliases: z.array(z.string()).optional(),
  role: z.string().optional(),
  org: z.string().optional(),
  language: z.string().optional(),
  maturity: MaturitySchema.optional(),
});

/**
 * Schema for work experience entry
 */
export const ExperienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  years: z.string(),
  description: z.string(),
  // Same reasoning as ProjectSchema.highlights: without these, "what did Blake
  // use at Capgemini?" has nothing to retrieve but one averaged paragraph.
  highlights: z.array(z.string()).optional(),
  tech: z.array(z.string()).optional(),
  location: z.string().optional(),
  clientContext: z.string().optional(),
});

/**
 * Schema for recognition/awards entry
 */
export const RecognitionSchema = z.object({
  title: z.string(),
  year: z.string(),
  description: z.string(),
});

/**
 * Schema for section intro copy
 */
export const SectionIntrosSchema = z.object({
  tools: z.string(),
  exploring: z.string(),
  projects: z.string(),
  contact: z.string(),
});

/**
 * Schema for the blockquote with highlighted word
 */
export const BlockquoteSchema = z.object({
  text: z.string(),
  highlight: z.string(),
});

/**
 * Schema for the full resume data structure
 */
export const HeroSchema = z.object({
  headline: z.string(),
  subheadline: z.string(),
});

/**
 * Schema for editorial copy used in the resume UI
 */
export const CopySchema = z.object({
  subhead: z.string(),
  positionFootnote: z.string(),
  artifactHeading: z.string(),
  artifactSubhead: z.string(),
  colophon: z.string(),
});

export const ResumeDataSchema = z.object({
  name: z.string(),
  title: z.string(),
  location: z.string(),
  hero: HeroSchema.optional(),
  email: z.string(),
  phone: z.string().optional(),
  linkedin: z.string(),
  github: z.string(),
  website: z.string(),
  skills: z.array(z.string()),
  tools: z.union([z.array(z.string()), z.record(z.string(), z.array(z.string()))]),
  exploring: z.union([z.array(z.string()), z.record(z.string(), z.array(z.string()))]),
  projects: z.array(ProjectSchema),
  experience: z.array(ExperienceSchema),
  recognition: z.array(RecognitionSchema).optional(),
  summary: z.array(z.string()),
  blockquote: BlockquoteSchema,
  sections: SectionIntrosSchema,
  copy: CopySchema.optional(),
  bluesky: z.string().optional(),
});

/**
 * Schema for chunk metadata used in vector storage
 */
export const ChunkTypeSchema = z.enum([
  'personal',
  'skills',
  'experience',
  'tools',
  'exploring',
  'projects',
  'summary',
  'recognition',
  'ai_context',
]);

// Vectorize metadata values must be primitives, so list-shaped fields (topics)
// are stored comma-joined rather than as arrays.
export const ChunkMetadataSchema = z.object({
  type: ChunkTypeSchema,
  section: z.string(),
  text: z.string(),
  // Human-readable name for the thing this chunk is about ("felix",
  // "Adobe — Principal Technical Architect"). Rendered as a source chip in the
  // UI and used as the chunk's first embedded line.
  title: z.string().optional(),
  // The entity this chunk came from, so several chunks of one project can be
  // collapsed to a single citation.
  sourceId: z.string().optional(),
  topics: z.string().optional(),
  kind: z.string().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  years: z.string().optional(),
});

/**
 * Schema for a single vector match result
 */
export const VectorMatchSchema = z.object({
  id: z.string(),
  score: z.number(),
  metadata: ChunkMetadataSchema.optional(),
});

/**
 * Schema for Vectorize query response
 */
export const VectorQueryResultSchema = z.object({
  matches: z.array(VectorMatchSchema),
  count: z.number(),
});

// Export inferred types
export type Project = z.infer<typeof ProjectSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Recognition = z.infer<typeof RecognitionSchema>;
export type ResumeData = z.infer<typeof ResumeDataSchema>;
export type Maturity = z.infer<typeof MaturitySchema>;
export type ChunkType = z.infer<typeof ChunkTypeSchema>;
export type ChunkMetadata = z.infer<typeof ChunkMetadataSchema>;
export type VectorMatch = z.infer<typeof VectorMatchSchema>;
export type VectorQueryResult = z.infer<typeof VectorQueryResultSchema>;
