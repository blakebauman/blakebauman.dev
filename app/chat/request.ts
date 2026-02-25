import type { Env, ResumeData, ChunkMetadata } from '../types';

interface VectorMatch {
  id: string;
  score: number;
  metadata?: ChunkMetadata;
}

// Input validation constants
const MAX_PROMPT_LENGTH = 1000;
const MIN_PROMPT_LENGTH = 2;

// Sanitize input - remove potential injection patterns and control characters
function sanitizePrompt(input: string): string {
  return (
    input
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Trim whitespace
      .trim()
      // Collapse multiple spaces/newlines
      .replace(/\s+/g, ' ')
  );
}

// Validate the prompt input
function validatePrompt(prompt: unknown): { valid: boolean; error?: string; sanitized?: string } {
  if (prompt === null || prompt === undefined) {
    return { valid: false, error: 'Prompt is required' };
  }

  if (typeof prompt !== 'string') {
    return { valid: false, error: 'Prompt must be a string' };
  }

  const sanitized = sanitizePrompt(prompt);

  if (sanitized.length < MIN_PROMPT_LENGTH) {
    return { valid: false, error: `Prompt must be at least ${MIN_PROMPT_LENGTH} characters` };
  }

  if (sanitized.length > MAX_PROMPT_LENGTH) {
    return { valid: false, error: `Prompt must be less than ${MAX_PROMPT_LENGTH} characters` };
  }

  return { valid: true, sanitized };
}

export async function requestAI({
  request,
  context,
}: {
  request: Request;
  context: { cloudflare: { env: Env } };
}) {
  // Parse and validate input
  interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
  }

  let body: { prompt?: unknown; conversationHistory?: ConversationMessage[] };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const validation = validatePrompt(body.prompt);
  if (!validation.valid) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const prompt = validation.sanitized!;

  // Validate and sanitize conversation history (limit to prevent abuse)
  const MAX_HISTORY_MESSAGES = 12;
  const conversationHistory: ConversationMessage[] = Array.isArray(body.conversationHistory)
    ? body.conversationHistory
        .slice(-MAX_HISTORY_MESSAGES)
        .filter(
          (msg): msg is ConversationMessage =>
            typeof msg === 'object' &&
            msg !== null &&
            (msg.role === 'user' || msg.role === 'assistant') &&
            typeof msg.content === 'string' &&
            msg.content.length > 0 &&
            msg.content.length <= MAX_PROMPT_LENGTH
        )
        .map(msg => ({
          role: msg.role,
          content: sanitizePrompt(msg.content),
        }))
    : [];

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

    if (!resume) {
      const resumeData = await import('./resume.json');
      await context.cloudflare.env.RESUME_DATA_KV.put('resume_json', JSON.stringify(resumeData));
    }

    let relevantSections = '';
    let relevantSkills: string[] = [];

    // Get the full resume data - will never be null after this line
    const resumeData = resume || (await import('./resume.json')).default;

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
          if (matchesByType.skills) {
            relevantSkills = resumeData.skills;
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
        relevantSkills = resumeData.skills;
        relevantSections += '\nExperience:';
        for (const exp of resumeData.experience) {
          relevantSections += `\n\nCompany: ${exp.company}\nRole: ${exp.role}\nYears: ${exp.years}\nDescription: ${exp.description}`;
        }
      }
    } else {
      // If vector search isn't available, use the entire resume
      relevantSkills = resumeData.skills;
      relevantSections += '\nExperience:';
      for (const exp of resumeData.experience) {
        relevantSections += `\n\nCompany: ${exp.company}\nRole: ${exp.role}\nYears: ${exp.years}\nDescription: ${exp.description}`;
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

    // Check if streaming is requested
    const url = new URL(request.url);
    const streamRequested = url.searchParams.get('stream') === 'true';

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
