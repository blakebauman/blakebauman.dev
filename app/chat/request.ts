import { serverErrorResponse } from '../lib/http';
import {
  ChatQueryParamsSchema,
  ChatRequestSchema,
  createValidationErrorResponse,
} from '../schemas';
import type { Env } from '../types';
import {
  buildFullResumeContext,
  type ContextSource,
  type ResumeContext,
  searchResumeContext,
} from './context';
import { aiContext, resumeData } from './data';
import { checkTopicRelevance, detectResponseLeakage } from './guardrails';
import { hashIP, type LogMessageMetadata, logConversation } from './logger';
import { buildChatMessages } from './prompt';
import { sseMessageResponse, sseTransformResponse } from './streaming';

// Workers AI text-generation model for chat responses. The previous
// @cf/meta/llama-3.1-8b-instruct was deprecated by Cloudflare on 2026-05-30.
const CHAT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const INFERENCE_OPTIONS = {
  // Low temperature: this assistant should recite the record, not improvise on it.
  temperature: 0.3,
  max_tokens: 512,
} as const;

// The ai-context layer as plain text, for the fallback path only. The vector
// path retrieves these chunks individually; without this the fallback answered
// from a strictly smaller set of facts than the primary path.
const AI_CONTEXT_TEXT = aiContext.context.map(item => `${item.title}\n${item.text}`);

// Cloudflare always sets this header and clients cannot forge it. X-Forwarded-For
// is caller-controlled, so it is not consulted for anything security-relevant.
function getClientIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

async function logChatConversation(
  env: Env,
  ctx: ExecutionContext,
  sessionId: string,
  request: Request,
  userPrompt: string,
  assistantResponse: string,
  metadata: LogMessageMetadata
): Promise<void> {
  const ipHash = await hashIP(getClientIP(request), env.IP_HASH_SALT);
  const userAgent = request.headers.get('User-Agent');
  ctx.waitUntil(
    logConversation(
      env.CHAT_LOGS_DB,
      sessionId,
      ipHash,
      userAgent,
      userPrompt,
      assistantResponse,
      metadata
    )
  );
}

function jsonChatResponse(content: string, sources: ContextSource[] = []): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }], sources }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function wantsStream(request: Request): boolean {
  const url = new URL(request.url);
  const result = ChatQueryParamsSchema.safeParse({
    stream: url.searchParams.get('stream') ?? undefined,
  });
  return result.success ? result.data.stream : false;
}

export async function requestAI({
  request,
  context,
}: {
  request: Request;
  context: { cloudflare: { env: Env; ctx: ExecutionContext } };
}) {
  const startTime = Date.now();

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const bodyResult = ChatRequestSchema.safeParse(rawBody);
  if (!bodyResult.success) {
    return createValidationErrorResponse(bodyResult.error);
  }

  const { prompt, conversationHistory, sessionId } = bodyResult.data;
  const env = context.cloudflare?.env;
  const ctx = context.cloudflare?.ctx;
  const canLog = Boolean(env?.CHAT_LOGS_DB && ctx && sessionId);

  // Runs before any model call, so an off-topic prompt or an injection attempt
  // costs nothing. History is passed in because a short follow-up is only
  // legitimate when there is a previous turn to follow up on, and because an
  // injection can be split across turns.
  const redirectMessage = checkTopicRelevance({ prompt, conversationHistory });
  if (redirectMessage) {
    if (canLog && env && ctx && sessionId) {
      logChatConversation(env, ctx, sessionId, request, prompt, redirectMessage, {
        responseTimeMs: Date.now() - startTime,
        wasRedirected: true,
        vectorMatchesCount: 0,
      });
    }

    return wantsStream(request)
      ? sseMessageResponse(redirectMessage)
      : jsonChatResponse(redirectMessage);
  }

  try {
    // Vite bakes this at build time; wrangler.jsonc pins NODE_ENV=production so
    // the deployed bundle takes the vector path.
    const isDev = process.env.NODE_ENV === 'development';

    if (!env?.AI?.run) {
      throw new Error(
        "AI service is not properly configured. Please ensure you're running with the correct Cloudflare bindings."
      );
    }

    const useVectorSearch = !isDev && Boolean(env.VECTORIZE);
    const resumeContext: ResumeContext = useVectorSearch
      ? await searchResumeContext(env, prompt, resumeData, AI_CONTEXT_TEXT)
      : buildFullResumeContext(resumeData, AI_CONTEXT_TEXT);

    const messages = buildChatMessages(resumeData, resumeContext, conversationHistory, prompt);
    const vectorMatchesCount = resumeContext.matches.length;

    const logCompletion = (assistantResponse: string) => {
      if (!canLog || !env || !ctx || !sessionId) return;
      if (detectResponseLeakage(assistantResponse)) {
        console.warn('[chat] response tripped the leakage check', { sessionId });
      }
      logChatConversation(env, ctx, sessionId, request, prompt, assistantResponse, {
        responseTimeMs: Date.now() - startTime,
        wasRedirected: false,
        vectorMatchesCount,
      });
    };

    if (wantsStream(request)) {
      const stream = (await env.AI.run(CHAT_MODEL, {
        messages,
        stream: true,
        ...INFERENCE_OPTIONS,
      })) as ReadableStream;

      return sseTransformResponse(stream, logCompletion, resumeContext.sources);
    }

    const response = await env.AI.run(CHAT_MODEL, { messages, ...INFERENCE_OPTIONS });
    const assistantContent = response.response || "Sorry, I couldn't generate a response.";
    logCompletion(assistantContent);

    return jsonChatResponse(assistantContent, resumeContext.sources);
  } catch (error) {
    // The caller gets a fixed message and a request id; the id is the only
    // thing that connects their report to the log line holding the real cause.
    // Returning error.message leaked binding names and configuration state.
    return serverErrorResponse(
      'chat',
      error,
      {},
      'The assistant could not answer right now. Please try again.'
    );
  }
}
