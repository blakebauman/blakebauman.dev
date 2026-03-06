import { z } from 'zod';

/**
 * Schema for a project in the resume
 */
export const ProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  context: z.string().optional(),
  tech: z.array(z.string()),
  github: z.string(),
});

/**
 * Schema for work experience entry
 */
export const ExperienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  years: z.string(),
  description: z.string(),
});

/**
 * Schema for recognition/awards entry
 */
export const RecognitionSchema = z.object({
  title: z.string(),
  year: z.string(),
  description: z.string(),
  team: z.array(z.string()).optional(),
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
  bluesky: z.string().optional(),
});

/**
 * Schema for chunk metadata used in vector storage
 */
export const ChunkMetadataSchema = z.object({
  type: z.enum([
    'personal',
    'skills',
    'experience',
    'tools',
    'exploring',
    'projects',
    'summary',
    'recognition',
    'ai_context',
  ]),
  section: z.string(),
  text: z.string(),
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
export type ChunkMetadata = z.infer<typeof ChunkMetadataSchema>;
export type VectorMatch = z.infer<typeof VectorMatchSchema>;
export type VectorQueryResult = z.infer<typeof VectorQueryResultSchema>;
