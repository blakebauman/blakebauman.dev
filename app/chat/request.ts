import {
  ChatQueryParamsSchema,
  ChatRequestSchema,
  createValidationErrorResponse,
} from '../schemas';
import type { Env, ResumeData } from '../types';
import { buildFullResumeContext, searchResumeContext } from './context';
import { checkTopicRelevance } from './guardrails';
import { hashIP, type LogMessageMetadata, logConversation } from './logger';
import { buildChatMessages } from './prompt';
import resumeJson from './resume.json';
import { sseMessageResponse, sseTransformResponse } from './streaming';

// Workers AI text-generation model for chat responses. The previous
// @cf/meta/llama-3.1-8b-instruct was deprecated by Cloudflare on 2026-05-30.
const CHAT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

function getClientIP(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'anonymous'
  );
}

async function logChatConversation(
  db: D1Database,
  ctx: ExecutionContext,
  sessionId: string,
  request: Request,
  userPrompt: string,
  assistantResponse: string,
  metadata: LogMessageMetadata
): Promise<void> {
  const ipHash = await hashIP(getClientIP(request));
  const userAgent = request.headers.get('User-Agent');
  ctx.waitUntil(
    logConversation(db, sessionId, ipHash, userAgent, userPrompt, assistantResponse, metadata)
  );
}

function jsonChatResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function requestAI({
  request,
  context,
}: {
  request: Request;
  context: { cloudflare: { env: Env; ctx: ExecutionContext } };
}) {
  const startTime = Date.now();
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

  const { prompt, conversationHistory, sessionId } = bodyResult.data;

  // Check topic relevance before processing (saves LLM tokens for off-topic requests)
  const redirectMessage = checkTopicRelevance(prompt);
  if (redirectMessage) {
    // Log the redirected conversation if logging is available
    if (context.cloudflare?.env?.CHAT_LOGS_DB && sessionId) {
      const responseTimeMs = Date.now() - startTime;
      logChatConversation(
        context.cloudflare.env.CHAT_LOGS_DB,
        context.cloudflare.ctx,
        sessionId,
        request,
        prompt,
        redirectMessage,
        { responseTimeMs, wasRedirected: true }
      );
    }

    // Check if streaming was requested
    const url = new URL(request.url);
    const streamRequested = url.searchParams.get('stream') === 'true';

    if (streamRequested) {
      return sseMessageResponse(redirectMessage);
    }

    return jsonChatResponse(redirectMessage);
  }

  try {
    // Check if we're in development mode
    const isDev = process.env.NODE_ENV === 'development';

    // Ensure we have access to the AI service
    if (!context.cloudflare?.env?.AI?.run) {
      throw new Error(
        "AI service is not properly configured. Please ensure you're running with the correct Cloudflare bindings."
      );
    }

    // Use fresh resume data (imported JSON) to ensure all fields are present
    const resumeData: ResumeData = resumeJson;

    // Only use embeddings and vector search if available and not in development;
    // otherwise fall back to the entire resume as context
    const useVectorSearch = !isDev && Boolean(context.cloudflare.env.VECTORIZE);
    const resumeContext = useVectorSearch
      ? await searchResumeContext(context.cloudflare.env, prompt, resumeData)
      : buildFullResumeContext(resumeData);

    const messages = buildChatMessages(resumeData, resumeContext, conversationHistory, prompt);

    // Validate and parse query parameters
    const url = new URL(request.url);
    const queryResult = ChatQueryParamsSchema.safeParse({
      stream: url.searchParams.get('stream') ?? undefined,
    });
    const streamRequested = queryResult.success ? queryResult.data.stream : false;

    if (streamRequested) {
      // Use Workers AI streaming with low temperature to reduce hallucinations
      const stream = (await context.cloudflare.env.AI.run(CHAT_MODEL, {
        messages,
        stream: true,
        temperature: 0.3,
        max_tokens: 512,
      })) as ReadableStream;

      // Capture references for logging after stream completes
      const db = context.cloudflare?.env?.CHAT_LOGS_DB;
      const ctx = context.cloudflare?.ctx;

      return sseTransformResponse(stream, accumulatedResponse => {
        if (db && ctx && sessionId) {
          const responseTimeMs = Date.now() - startTime;
          logChatConversation(db, ctx, sessionId, request, prompt, accumulatedResponse, {
            responseTimeMs,
            wasRedirected: false,
          });
        }
      });
    }

    // Non-streaming response (fallback) with low temperature to reduce hallucinations
    const response = await context.cloudflare.env.AI.run(CHAT_MODEL, {
      messages,
      temperature: 0.3,
      max_tokens: 512,
    });

    const assistantContent = response.response || "Sorry, I couldn't generate a response.";

    // Log the conversation
    if (context.cloudflare?.env?.CHAT_LOGS_DB && sessionId) {
      const responseTimeMs = Date.now() - startTime;
      logChatConversation(
        context.cloudflare.env.CHAT_LOGS_DB,
        context.cloudflare.ctx,
        sessionId,
        request,
        prompt,
        assistantContent,
        { responseTimeMs, wasRedirected: false }
      );
    }

    return jsonChatResponse(assistantContent);
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
