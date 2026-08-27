import { type AgentRun, type AgentStep, attributeAgentSources, runAgentLoop } from '../agent/loop';
import { serverErrorResponse } from '../lib/http';
import {
  ChatQueryParamsSchema,
  ChatRequestSchema,
  createValidationErrorResponse,
} from '../schemas';
import type { Env } from '../types';
import {
  attributeSources,
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

function jsonChatResponse(
  content: string,
  sources: ContextSource[] = [],
  steps: AgentStep[] = []
): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }], sources, steps }), {
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

/**
 * Runs the agent loop, returning null rather than throwing if it breaks.
 *
 * The loop is the newer of the two paths and the one with more moving parts: a
 * model that has to emit well-formed tool calls, in a shape that can change
 * under us when the model does. Retrieval-then-answer has none of that and
 * still works. So a broken loop degrades to it silently rather than becoming a
 * 500 — the visitor gets an answer either way, and the cause is in the log.
 */
async function tryAgentLoop(
  env: Env,
  conversationHistory: Array<{ role: string; content: string }>,
  prompt: string
): Promise<AgentRun | null> {
  try {
    return await runAgentLoop(env, resumeData, conversationHistory, prompt);
  } catch (error) {
    console.error('[chat] agent loop failed, falling back to retrieval', error);
    return null;
  }
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

    // The agent loop is the primary path when enabled; single-shot retrieval is
    // the fallback, not the other way round. It needs Vectorize for the same
    // reason retrieval does — without it search_record is dead and the loop is
    // a slower way to reach the same enumeration tools.
    const useAgent = env.CHAT_AGENT_ENABLED === 'true' && useVectorSearch;
    const run = useAgent ? await tryAgentLoop(env, conversationHistory, prompt) : null;

    // Retrieval still runs when the loop is off *or* when it failed. A loop
    // that broke must not cost the visitor their answer — the proven path is
    // still there and still answers, one model call later.
    const resumeContext: ResumeContext | null = run
      ? null
      : useVectorSearch
        ? await searchResumeContext(env, prompt, resumeData, AI_CONTEXT_TEXT)
        : buildFullResumeContext(resumeData, AI_CONTEXT_TEXT);

    const messages = run
      ? run.messages
      : buildChatMessages(resumeData, resumeContext as ResumeContext, conversationHistory, prompt);

    const vectorMatchesCount = run ? run.matches.length : (resumeContext?.matches.length ?? 0);
    const steps = run?.steps ?? [];

    // Which tools ran is the single most useful thing to know when an agent
    // answer is wrong, and it is invisible from the response. It goes to the
    // Workers log rather than to D1: the chat_messages schema has no column for
    // it, and adding one to record a diagnostic is more migration than the
    // question is worth.
    if (run) {
      console.log('[chat] agent run', {
        sessionId,
        steps: steps.map(step => `${step.tool}${step.ok ? '' : '!'}`).join(' > ') || '(none)',
        matches: run.matches.length,
      });
    }

    const resolveSources = (answer: string) =>
      run
        ? attributeAgentSources(run, answer)
        : attributeSources(resumeContext?.matches ?? [], answer);

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
      // No `tools` on the answering call, deliberately. The loop is over; if the
      // model could still emit a tool call here it would stream a JSON blob at
      // the reader instead of prose, and there would be nothing left to run it.
      const stream = (await env.AI.run(CHAT_MODEL, {
        messages,
        stream: true,
        ...INFERENCE_OPTIONS,
      })) as ReadableStream;

      // Sources are resolved from the finished answer rather than from
      // retrieval scores, so the chips name what the response was actually
      // built from. See attributeSources and attributeAgentSources.
      return sseTransformResponse(stream, logCompletion, resolveSources, steps);
    }

    const response = await env.AI.run(CHAT_MODEL, { messages, ...INFERENCE_OPTIONS });
    const assistantContent = response.response || "Sorry, I couldn't generate a response.";
    logCompletion(assistantContent);

    return jsonChatResponse(assistantContent, resolveSources(assistantContent), steps);
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
