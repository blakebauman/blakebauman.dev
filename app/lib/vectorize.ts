import { AIContextSchema, ResumeDataSchema } from '../schemas';
import type { AIContext, Env, ResumeData } from '../types';

export class VectorizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VectorizeError';
  }
}

/**
 * Populates the Vectorize index with resume data chunks and AI context
 */
export async function populateVectorizeIndex(
  env: Env,
  resumeData: unknown,
  aiContextData?: unknown
): Promise<number> {
  // Validate resume data with Zod
  const parseResult = ResumeDataSchema.safeParse(resumeData);
  if (!parseResult.success) {
    throw new VectorizeError(`Invalid resume data: ${parseResult.error.issues[0]?.message}`);
  }

  const validatedData: ResumeData = parseResult.data;

  // Validate AI context data if provided
  let validatedAIContext: AIContext | undefined;
  if (aiContextData) {
    const aiContextResult = AIContextSchema.safeParse(aiContextData);
    if (!aiContextResult.success) {
      throw new VectorizeError(
        `Invalid AI context data: ${aiContextResult.error.issues[0]?.message}`
      );
    }
    validatedAIContext = aiContextResult.data;
  }

  try {
    // Create chunks of resume data
    const chunks = [
      {
        id: 'personal',
        text: `Name: ${validatedData.name}
Title: ${validatedData.title}
Location: ${validatedData.location}
Contact: ${validatedData.email}${validatedData.phone ? ` | ${validatedData.phone}` : ''}
Links: LinkedIn: ${validatedData.linkedin} | GitHub: ${validatedData.github} | Website: ${validatedData.website}`,
        metadata: {
          type: 'personal' as const,
          section: 'personal_info',
          text: '', // Will be set later
        },
      },
      {
        id: 'summary',
        text: `Professional Summary:\n${validatedData.summary.join('\n\n')}`,
        metadata: {
          type: 'summary' as const,
          section: 'summary',
          text: '', // Will be set later
        },
      },
      {
        id: 'skills',
        text: `Skills: ${validatedData.skills.join(', ')}`,
        metadata: {
          type: 'skills' as const,
          section: 'skills',
          text: '', // Will be set later
        },
      },
      {
        id: 'tools',
        text: `Tools and technologies currently using: ${Array.isArray(validatedData.tools) ? validatedData.tools.join(', ') : Object.values(validatedData.tools).flat().join(', ')}`,
        metadata: {
          type: 'tools' as const,
          section: 'tools',
          text: '', // Will be set later
        },
      },
      {
        id: 'exploring',
        text: `Currently exploring and learning: ${Array.isArray(validatedData.exploring) ? validatedData.exploring.join(', ') : Object.values(validatedData.exploring).flat().join(', ')}`,
        metadata: {
          type: 'exploring' as const,
          section: 'exploring',
          text: '', // Will be set later
        },
      },
      ...validatedData.projects.map((project, index) => ({
        id: `project_${index}`,
        text: `Project: ${project.name}
Description: ${project.description}
${project.context ? `Context: ${project.context}\n` : ''}Technologies: ${project.tech.join(', ')}
GitHub: ${project.github}`,
        metadata: {
          type: 'projects' as const,
          section: 'projects',
          text: '', // Will be set later
        },
      })),
      ...validatedData.experience.map((exp, index) => ({
        id: `experience_${index}`,
        text: `Company: ${exp.company}
Role: ${exp.role}
Years: ${exp.years}
Description: ${exp.description}`,
        metadata: {
          type: 'experience' as const,
          section: 'work_experience',
          company: exp.company,
          role: exp.role,
          years: exp.years,
          text: '', // Will be set later
        },
      })),
      ...(validatedData.recognition ?? []).map((item, index) => ({
        id: `recognition_${index}`,
        text: `Recognition: ${item.title}
Year: ${item.year}
Description: ${item.description}${item.team ? `\nTeam: ${item.team.join(', ')}` : ''}`,
        metadata: {
          type: 'recognition' as const,
          section: 'recognition',
          text: '', // Will be set later
        },
      })),
      // Add AI context chunks (not displayed on frontend)
      ...(validatedAIContext?.context ?? []).map(item => ({
        id: `ai_context_${item.id}`,
        text: item.text,
        metadata: {
          type: 'ai_context' as const,
          section: 'ai_context',
          text: '', // Will be set later
        },
      })),
    ];

    // Create embeddings using Workers AI
    const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: chunks.map(chunk => chunk.text),
    });

    if (!embeddings.data || embeddings.data.length !== chunks.length) {
      throw new VectorizeError('Failed to generate embeddings');
    }

    // Prepare vectors for insertion
    const vectors = chunks.map((chunk, index) => {
      const values = embeddings.data?.[index];
      if (!values) {
        throw new VectorizeError(`Missing embedding values for chunk ${chunk.id}`);
      }

      return {
        id: chunk.id,
        values,
        metadata: {
          ...chunk.metadata,
          text: chunk.text,
        },
      };
    });

    console.log(`Upserting ${vectors.length} vectors to Vectorize index`);
    const first = vectors[0];
    if (vectors.length > 0 && first?.values) {
      console.log(`Using dimensions: ${first.values.length}`);
    }

    // Insert vectors into Vectorize
    await env.VECTORIZE.upsert(vectors);

    console.log(`Successfully populated Vectorize index with ${vectors.length} vectors`);

    // Return the count for debugging
    return vectors.length;
  } catch (error) {
    console.error('Error populating Vectorize index:', error);
    throw error instanceof VectorizeError
      ? error
      : new VectorizeError(error instanceof Error ? error.message : 'Unknown error');
  }
}
