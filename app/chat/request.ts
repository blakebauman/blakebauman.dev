import type { Env, ResumeData, VectorMatch } from '../types';
import {
  ChatRequestSchema,
  ChatQueryParamsSchema,
  createValidationErrorResponse,
} from '../schemas';
import resumeJson from './resume.json';

export async function requestAI({
  request,
  context,
}: {
  request: Request;
  context: { cloudflare: { env: Env } };
}) {
  // Parse JSON body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate and transform request body with Zod
  const bodyResult = ChatRequestSchema.safeParse(rawBody);
  if (!bodyResult.success) {
    return createValidationErrorResponse(bodyResult.error);
  }

  const { prompt, conversationHistory } = bodyResult.data;

  try {
    // Check if we're in development mode
    const isDev = process.env.NODE_ENV === 'development';

    // Ensure we have access to the AI service
    if (!context.cloudflare?.env?.AI?.run) {
      throw new Error(
        "AI service is not properly configured. Please ensure you're running with the correct Cloudflare bindings."
      );
    }

    // Fetch resume data from Cloudflare KV
    const resume = await context.cloudflare.env.RESUME_DATA_KV.get<ResumeData>(
      'resume_json',
      'json'
    );

    // Update KV if missing or stale (missing required fields like projects/tools)
    if (!resume || !resume.projects || !resume.tools) {
      await context.cloudflare.env.RESUME_DATA_KV.put('resume_json', JSON.stringify(resumeJson));
    }

    let relevantSections = '';
    let relevantSkills: string[] = [];

    // Use fresh resume data to ensure all fields are present
    const resumeData: ResumeData = resumeJson;

    // Only use embeddings and vector search if available and not in development
    if (!isDev && context.cloudflare?.env?.AI?.run && context.cloudflare?.env?.VECTORIZE?.query) {
      try {
        // Create embeddings for the user's prompt using Workers AI
        const embeddings = await context.cloudflare.env.AI.run('@cf/baai/bge-base-en-v1.5', {
          text: [prompt],
        });

        if (embeddings.data?.[0]) {
          // Query Vectorize to find relevant resume sections
          const vectorResults = await context.cloudflare.env.VECTORIZE.query(embeddings.data[0], {
            topK: 5, // Increased from 3 to get more context
          });

          console.log('Vector search results:', JSON.stringify(vectorResults));

          // Process matches by type
          const matchesByType = vectorResults.matches.reduce(
            (acc: Record<string, VectorMatch[]>, match: VectorMatch) => {
              const type = match.metadata?.type;
              if (type) {
                if (!acc[type]) {
                  acc[type] = [];
                }
                acc[type].push(match);
              }
              return acc;
            },
            {}
          );

          // Format relevant sections based on type
          if (matchesByType.skills || matchesByType.tools) {
            // Include skills if either skills or tools match
            relevantSkills = resumeData.skills;
          }

          if (matchesByType.tools) {
            relevantSections += `\nTools & Technologies:\n${matchesByType.tools
              .map(match => match.metadata?.text)
              .filter(Boolean)
              .join('\n\n')}`;
          }

          if (matchesByType.projects) {
            relevantSections += `\nProjects:\n${matchesByType.projects
              .map(match => match.metadata?.text)
              .filter(Boolean)
              .join('\n\n')}`;
          }

          if (matchesByType.exploring) {
            relevantSections += `\nCurrently Exploring:\n${matchesByType.exploring
              .map(match => match.metadata?.text)
              .filter(Boolean)
              .join('\n\n')}`;
          }

          if (matchesByType.experience) {
            relevantSections += `\nRelevant Experience:\n${matchesByType.experience
              .map(match => match.metadata?.text)
              .filter(Boolean)
              .join('\n\n')}`;
          }

          if (matchesByType.personal) {
            relevantSections += `\nPersonal Information:\n${matchesByType.personal
              .map(match => match.metadata?.text)
              .filter(Boolean)
              .join('\n\n')}`;
          }
        }
      } catch (error) {
        console.error('Vector search error:', error);
        // Fall back to using complete resume data
        relevantSkills = resumeData.skills || [];

        if (resumeData.tools?.length) {
          relevantSections += `\nTools & Technologies: ${resumeData.tools.join(', ')}`;
        }

        if (resumeData.projects?.length) {
          relevantSections += '\n\nProjects:';
          for (const project of resumeData.projects) {
            relevantSections += `\n\nProject: ${project.name}\nDescription: ${project.description}\nTechnologies: ${project.tech.join(', ')}\nGitHub: ${project.github}`;
          }
        }

        relevantSections += '\n\nExperience:';
        for (const exp of resumeData.experience) {
          relevantSections += `\n\nCompany: ${exp.company}\nRole: ${exp.role}\nYears: ${exp.years}\nDescription: ${exp.description}`;
        }

        if (resumeData.exploring?.length) {
          relevantSections += `\n\nCurrently Exploring: ${resumeData.exploring.join(', ')}`;
        }
      }
    } else {
      // If vector search isn't available, use the entire resume
      relevantSkills = resumeData.skills || [];

      if (resumeData.tools?.length) {
        relevantSections += `\nTools & Technologies: ${resumeData.tools.join(', ')}`;
      }

      if (resumeData.projects?.length) {
        relevantSections += '\n\nProjects:';
        for (const project of resumeData.projects) {
          relevantSections += `\n\nProject: ${project.name}\nDescription: ${project.description}\nTechnologies: ${project.tech.join(', ')}\nGitHub: ${project.github}`;
        }
      }

      relevantSections += '\n\nExperience:';
      for (const exp of resumeData.experience) {
        relevantSections += `\n\nCompany: ${exp.company}\nRole: ${exp.role}\nYears: ${exp.years}\nDescription: ${exp.description}`;
      }

      if (resumeData.exploring?.length) {
        relevantSections += `\n\nCurrently Exploring: ${resumeData.exploring.join(', ')}`;
      }
    }

    // Build experience summary from resume data for context
    const experienceSummary = resumeData.experience
      .map(exp => `${exp.role} at ${exp.company} (${exp.years})`)
      .join('\n');

    // Build system message
    const systemMessage = {
      role: 'system' as const,
      content: `You are a helpful AI assistant that answers questions about Blake Bauman's professional background.

BLAKE'S CURRENT POSITION:
${resumeData.experience[0]?.role || 'Principal Technical Architect'} at ${resumeData.experience[0]?.company || 'Adobe'}

WORK HISTORY:
${experienceSummary}

${relevantSkills.length > 0 ? `SKILLS: ${relevantSkills.join(', ')}` : ''}

${relevantSections ? `ADDITIONAL CONTEXT:\n${relevantSections}` : ''}

INSTRUCTIONS:
1. Answer based ONLY on the information provided above.
2. If specific details aren't available, say so honestly.
3. DO NOT fabricate details about employment, dates, or responsibilities.
4. Keep responses concise, professional, and conversational.
5. Focus on being helpful while staying factual.
6. When the user references previous messages, use the conversation context to provide relevant answers.`,
    };

    // Build messages array with conversation history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      systemMessage,
      // Include conversation history for context (excluding the current prompt which is added separately)
      ...conversationHistory.slice(0, -1).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: prompt },
    ];

    // Validate and parse query parameters
    const url = new URL(request.url);
    const queryResult = ChatQueryParamsSchema.safeParse({
      stream: url.searchParams.get('stream') ?? undefined,
    });
    const streamRequested = queryResult.success ? queryResult.data.stream : false;

    if (streamRequested) {
      // Use Workers AI streaming
      const stream = (await context.cloudflare.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages,
        stream: true,
      })) as ReadableStream;

      // Transform the stream to SSE format
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const transformedStream = new ReadableStream({
        async start(controller) {
          const reader = stream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                break;
              }

              // Decode the chunk and extract content
              const text = decoder.decode(value, { stream: true });

              // Workers AI streams in SSE format: data: {"response":"text"}
              const lines = text.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const jsonStr = line.slice(6);
                  if (jsonStr === '[DONE]') {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    continue;
                  }
                  try {
                    const parsed = JSON.parse(jsonStr) as { response?: string };
                    if (parsed.response) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ content: parsed.response })}\n\n`)
                      );
                    }
                  } catch {
                    // Not valid JSON, might be partial - skip
                  }
                }
              }
            }
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(transformedStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming response (fallback)
    const response = await context.cloudflare.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages,
    });

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: response.response || "Sorry, I couldn't generate a response.",
            },
          },
        ],
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error generating AI response:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate AI response',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
