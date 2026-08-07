import type { Env, ResumeData, VectorMatch } from '../types';

export interface ResumeContext {
  relevantSkills: string[];
  relevantSections: string;
}

// Section headings for each vector match type, in output order.
//
// Every chunk type written by populateVectorizeIndex must appear here. Matches
// are grouped by `metadata.type` and then rendered by walking this table, so a
// type that is missing is retrieved from Vectorize and then silently dropped on
// the floor. `ai_context` and `recognition` were both missing, which meant the
// entire chat-only context layer (ai-context.json: the agent-infrastructure
// detail on Felix, Memoturn, Fold and Skillist, the Adobe agentic work, the
// Cloudflare and enterprise background) was indexed, matched, and then never
// reached the model. `skills` is deliberately absent: it is handled separately
// via relevantSkills just below.
const SECTION_LABELS: Array<[type: string, label: string]> = [
  ['tools', 'Tools & Technologies'],
  ['projects', 'Projects'],
  ['exploring', 'Currently Exploring'],
  ['experience', 'Relevant Experience'],
  ['recognition', 'Recognition'],
  ['ai_context', 'Additional Background'],
  ['personal', 'Personal Information'],
  ['summary', 'Professional Summary'],
];

// Format the entire resume as context — used when vector search is unavailable or fails
export function buildFullResumeContext(resumeData: ResumeData): ResumeContext {
  let relevantSections = '';

  if (resumeData.summary?.length) {
    relevantSections += `\nProfessional Summary:\n${resumeData.summary.join('\n\n')}`;
  }

  const toolsList = Array.isArray(resumeData.tools)
    ? resumeData.tools
    : resumeData.tools
      ? Object.values(resumeData.tools).flat()
      : [];
  if (toolsList.length) {
    relevantSections += `\nTools & Technologies: ${toolsList.join(', ')}`;
  }

  if (resumeData.projects?.length) {
    relevantSections += '\n\nProjects:';
    for (const project of resumeData.projects) {
      relevantSections += `\n\nProject: ${project.name}\nDescription: ${project.description}${project.context ? `\nContext: ${project.context}` : ''}\nTechnologies: ${project.tech.join(', ')}${project.year ? `\nYear: ${project.year}` : ''}${project.status ? `\nStatus: ${project.status}` : ''}${project.github ? `\nGitHub: ${project.github}` : ''}${project.website ? `\nWebsite: ${project.website}` : ''}`;
    }
  }

  relevantSections += '\n\nExperience:';
  for (const exp of resumeData.experience) {
    relevantSections += `\n\nCompany: ${exp.company}\nRole: ${exp.role}\nYears: ${exp.years}\nDescription: ${exp.description}`;
  }

  if (resumeData.exploring) {
    const exploringList = Array.isArray(resumeData.exploring)
      ? resumeData.exploring
      : Object.values(resumeData.exploring).flat();
    if (exploringList.length) {
      relevantSections += `\n\nCurrently Exploring: ${exploringList.join(', ')}`;
    }
  }

  return { relevantSkills: resumeData.skills || [], relevantSections };
}

// Embed the prompt, query Vectorize, and format matched sections.
// Falls back to the full resume context if search fails.
export async function searchResumeContext(
  env: Env,
  prompt: string,
  resumeData: ResumeData
): Promise<ResumeContext> {
  try {
    const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [prompt] });

    let relevantSections = '';
    let relevantSkills: string[] = [];

    if (embeddings.data?.[0]) {
      // Query Vectorize to find relevant resume sections
      const vectorResults = await env.VECTORIZE.query(embeddings.data[0], {
        topK: 8, // Broaden recall so short prompts still surface relevant chunks
        returnMetadata: 'all',
      });

      // Process matches by type
      const matchesByType = vectorResults.matches.reduce(
        (acc: Record<string, VectorMatch[]>, match: VectorMatch) => {
          const type = match.metadata?.type;
          if (type) {
            let arr = acc[type];
            if (!arr) acc[type] = arr = [];
            arr.push(match);
          }
          return acc;
        },
        {}
      );

      // Include skills if either skills or tools match
      if (matchesByType.skills || matchesByType.tools) {
        relevantSkills = resumeData.skills;
      }

      for (const [type, label] of SECTION_LABELS) {
        const matches = matchesByType[type];
        if (matches) {
          relevantSections += `\n${label}:\n${matches
            .map(match => match.metadata?.text)
            .filter(Boolean)
            .join('\n\n')}`;
        }
      }
    }

    return { relevantSkills, relevantSections };
  } catch (error) {
    console.error('Vector search error:', error);
    return buildFullResumeContext(resumeData);
  }
}
