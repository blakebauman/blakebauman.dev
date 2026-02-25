import type { Env, ResumeData } from '../types';

export class VectorizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VectorizeError';
  }
}

/**
 * Populates the Vectorize index with resume data chunks
 */
export async function populateVectorizeIndex(env: Env, resumeData: ResumeData): Promise<number> {
  try {
    // Create chunks of resume data
    const chunks = [
      {
        id: 'personal',
        text: `Name: ${resumeData.name}
Title: ${resumeData.title}
Location: ${resumeData.location}
Contact: ${resumeData.email} | ${resumeData.phone}
Links: LinkedIn: ${resumeData.linkedin} | GitHub: ${resumeData.github} | Website: ${resumeData.website}`,
        metadata: {
          type: 'personal' as const,
          section: 'personal_info',
          text: '', // Will be set later
        },
      },
      {
        id: 'skills',
        text: `Skills: ${resumeData.skills.join(', ')}`,
        metadata: {
          type: 'skills' as const,
          section: 'skills',
          text: '', // Will be set later
        },
      },
      {
        id: 'tools',
        text: `Tools and technologies currently using: ${resumeData.tools.join(', ')}`,
        metadata: {
          type: 'tools' as const,
          section: 'tools',
          text: '', // Will be set later
        },
      },
      {
        id: 'exploring',
        text: `Currently exploring and learning: ${resumeData.exploring.join(', ')}`,
        metadata: {
          type: 'exploring' as const,
          section: 'exploring',
          text: '', // Will be set later
        },
      },
      ...resumeData.projects.map((project, index) => ({
        id: `project_${index}`,
        text: `Project: ${project.name}
Description: ${project.description}
Technologies: ${project.tech.join(', ')}
GitHub: ${project.github}`,
        metadata: {
          type: 'projects' as const,
          section: 'projects',
          text: '', // Will be set later
        },
      })),
      ...resumeData.experience.map((exp, index) => ({
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
    if (vectors.length > 0 && vectors[0].values) {
      console.log(`Using dimensions: ${vectors[0].values.length}`);
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
