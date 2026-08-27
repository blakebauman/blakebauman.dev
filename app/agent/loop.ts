import type { ContextSource, RetrievedMatch } from '../chat/context';
import { attributeSources } from '../chat/context';
/**
 * The loop's transcript admits a `tool` role that the retrieval path's
 * ChatMessage does not. Kept as its own type rather than widening that one:
 * buildChatMessages never produces a tool turn, and a type that says it might
 * would be describing a shape that cannot occur.
 */
export type AgentMessage = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string };

import { caseStudyFor } from '../content/case-studies';
import type { AIToolCall, AIToolDefinition, Env, ResumeData } from '../types';
import { buildAgentMessages } from './prompt';
import { callTool, listTools, projectSlug, resolveProject } from './tools';

/**
 * The tool-calling loop behind /api/chat.
 *
 * Retrieval-then-answer gets one shot at guessing what the question needs. A
 * loop lets the model ask a second time, or ask a different way — which is what
 * the record's own retrieval notes say is required: questions with no proper
 * noun flatten the corpus into a band too narrow to rank, and the fix is not a
 * better query but a different tool. `list_experience` answers "where has he
 * worked" outright.
 *
 * Everything here is bounded. A loop over a model that can call tools is a loop
 * over something with no notion of cost, so the caps below are not tuning knobs
 * — they are the reason one HTTP request cannot become forty model calls.
 */

// Rounds of tool calling before the model must answer with what it has. Three
// covers the useful shapes — search, then a targeted follow-up, then a second
// follow-up — and the fourth round has never been the one that finds the
// answer. The rate limiter bounds requests, not model calls; this bounds spend.
const MAX_HOPS = 3;

// Tool calls per round. Models emit parallel calls, and an uncapped fan-out is
// how one turn quietly becomes a dozen Vectorize queries.
const MAX_CALLS_PER_HOP = 3;

// ...and across the whole turn.
const MAX_TOTAL_CALLS = 6;

// Total tool output admitted to the transcript. The per-tool cap bounds one
// result; this bounds their sum, which is what actually competes with the
// model's 24k context window. Past it the loop stops fetching and answers.
const MAX_TOTAL_TOOL_CHARS = 12000;

const CHAT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

// Low temperature: this assistant recites the record, it does not improvise on
// it. That matters more in a loop, where a creative tool argument produces a
// confident answer built on a lookup that silently found nothing.
const INFERENCE_OPTIONS = { temperature: 0.3, max_tokens: 512 } as const;

/** One tool call the loop actually made. Surfaced to the UI and the logs. */
export interface AgentStep {
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
}

export interface AgentRun {
  /** The transcript to generate the final answer from, tools excluded. */
  messages: AgentMessage[];
  steps: AgentStep[];
  /** Chunks retrieved by search_record, for term-overlap attribution. */
  matches: RetrievedMatch[];
}

/**
 * Workers AI advertises tools as `{name, description, parameters}`. The JSON
 * Schema is the same one MCP publishes, derived from the same Zod schema — so
 * what the on-site model is told a tool accepts and what an external agent is
 * told cannot drift apart.
 */
export function toolDefinitions(): AIToolDefinition[] {
  return listTools().map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  }));
}

/**
 * Flattens whichever tool-call shape the model returned.
 *
 * Workers AI emits its native `{name, arguments: {...}}` for some models and
 * the OpenAI-compatible `{function: {name, arguments: "{...}"}}` for others,
 * and which one arrives is a property of the deployed model rather than of this
 * code. Normalizing both here means a model swap cannot silently turn every
 * tool call into a no-op — the failure mode is invisible, because a loop that
 * parses no calls just answers without them.
 */
export function normalizeToolCalls(raw: unknown): Array<{ name: string; args: unknown }> {
  if (!Array.isArray(raw)) return [];

  const calls: Array<{ name: string; args: unknown }> = [];
  for (const entry of raw as AIToolCall[]) {
    if (!entry || typeof entry !== 'object') continue;

    const name = entry.name ?? entry.function?.name;
    if (typeof name !== 'string' || !name) continue;

    const rawArgs = entry.arguments ?? entry.function?.arguments ?? {};
    let args: unknown = rawArgs;
    if (typeof rawArgs === 'string') {
      try {
        args = JSON.parse(rawArgs);
      } catch {
        // An unparseable argument string is not a reason to drop the call: the
        // tool's own schema validation produces a message the model can act on,
        // which is strictly more useful than silence.
        args = {};
      }
    }
    calls.push({ name, args });
  }
  return calls;
}

/**
 * Fences a tool result as data, the way the retrieval prompt fences retrieved
 * chunks.
 *
 * Not a theoretical precaution. Unfenced, the felix case study — several
 * paragraphs about tool calls that die mid-run, signed thinking blocks and
 * prompt-cache identity — reads to the model as commentary on its own
 * situation, and it answered a plain "tell me about felix" with the off-topic
 * redirect. Every time. The retrieval path never had the problem because it
 * has always fenced its context and labelled it as reference material.
 *
 * `callTool` has already stripped these markers from the text, so nothing
 * inside the fence can close it early.
 */
function fenceToolResult(name: string, text: string): string {
  return `<tool_result tool="${name}">\n${text}\n</tool_result>`;
}

/** A stable key for "this exact call", used to break repeat loops. */
function callKey(name: string, args: unknown): string {
  return `${name}:${JSON.stringify(args ?? {})}`;
}

/**
 * Runs the tool-calling rounds and returns the transcript to answer from.
 *
 * Throws only if the model itself is unreachable. Tool failures are fed back to
 * the model as text, because they are recoverable — a lookup that missed should
 * cost a different tool call, not the whole answer.
 */
export async function runAgentLoop(
  env: Env,
  resumeData: ResumeData,
  conversationHistory: Array<{ role: string; content: string }>,
  prompt: string
): Promise<AgentRun> {
  const messages: AgentMessage[] = buildAgentMessages(resumeData, conversationHistory, prompt);
  const tools = toolDefinitions();
  const steps: AgentStep[] = [];
  const matches: RetrievedMatch[] = [];
  const seen = new Set<string>();
  let toolChars = 0;

  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    if (steps.length >= MAX_TOTAL_CALLS || toolChars >= MAX_TOTAL_TOOL_CHARS) break;

    const result = await env.AI.run(CHAT_MODEL, { messages, tools, ...INFERENCE_OPTIONS });
    const calls = normalizeToolCalls(result.tool_calls).slice(0, MAX_CALLS_PER_HOP);

    // No tool calls means the model is ready to answer. It may also have
    // produced prose here, which is discarded: the answer is generated once,
    // streaming, after the loop, so there is exactly one place it comes from.
    if (!calls.length) break;

    for (const { name, args } of calls) {
      if (steps.length >= MAX_TOTAL_CALLS) break;

      const key = callKey(name, args);
      if (seen.has(key)) {
        // Repeating a call verbatim is the classic way a loop fails to
        // terminate: the model reads its own unchanged result and asks again.
        // Naming it is what lets the model move on rather than repeat.
        messages.push({
          role: 'assistant',
          content: JSON.stringify({ name, arguments: args }),
        });
        messages.push({
          role: 'tool',
          content: `You already called ${name} with those arguments. Use the result you have, try different arguments, or answer.`,
        });
        continue;
      }
      seen.add(key);

      const { text, isError } = await callTool(name, args, {
        env,
        onMatches: found => matches.push(...found),
      });

      steps.push({ tool: name, args: (args ?? {}) as Record<string, unknown>, ok: !isError });
      toolChars += text.length;

      // The native Workers AI convention: the call is replayed as an assistant
      // turn and its result as a `tool` turn, so the model sees what it asked
      // for alongside what came back.
      messages.push({ role: 'assistant', content: JSON.stringify({ name, arguments: args }) });
      messages.push({ role: 'tool', content: fenceToolResult(name, text) });
    }
  }

  return { messages, steps, matches };
}

/* -------------------------------------------------------------------------
   Attribution
   ------------------------------------------------------------------------- */

const MAX_SOURCES = 4;

/**
 * Which parts of the record a targeted lookup names.
 *
 * A deliberate call for one entity by name is provenance in a way a broad
 * enumeration is not: `get_project("felix")` says the answer is about felix,
 * while `list_projects()` says only that the model wanted an overview. Citing
 * the broad ones would reproduce the failure attributeSources exists to fix —
 * chips crediting whatever sat nearest the corpus centroid rather than what
 * actually answered.
 */
function directSource(step: AgentStep): ContextSource | null {
  if (!step.ok) return null;

  switch (step.tool) {
    case 'get_project': {
      const name = step.args.name;
      if (typeof name !== 'string') return null;
      const project = resolveProject(name);
      return project ? { label: 'Projects', title: project.name } : null;
    }
    case 'read_case_study': {
      const slug = step.args.slug;
      if (typeof slug !== 'string') return null;
      const study = caseStudyFor(slug.toLowerCase());
      return study ? { label: 'Case study', title: study.name } : null;
    }
    case 'list_experience': {
      // Only when filtered to one company. Unfiltered, it is an enumeration.
      const company = step.args.company;
      return typeof company === 'string' && company.trim()
        ? { label: 'Relevant Experience', title: company }
        : null;
    }
    default:
      return null;
  }
}

/**
 * Citations for an agent answer.
 *
 * Two provenance kinds, and they are not equivalent. A targeted lookup is a
 * fact — the model asked for that entity by name and got it. A search hit is an
 * inference, so it still goes through term-overlap attribution against the
 * finished answer, exactly as the retrieval path does. Facts are listed first.
 */
export function attributeAgentSources(run: AgentRun, answer: string): ContextSource[] {
  const sources: ContextSource[] = [];
  const seen = new Set<string>();

  const push = (source: ContextSource | null) => {
    if (!source) return;
    const key = `${source.label}:${source.title}`;
    if (seen.has(key)) return;
    seen.add(key);
    sources.push(source);
  };

  for (const step of run.steps) push(directSource(step));
  for (const source of attributeSources(run.matches, answer)) push(source);

  return sources.slice(0, MAX_SOURCES);
}

export const AGENT_LIMITS = {
  maxHops: MAX_HOPS,
  maxCallsPerHop: MAX_CALLS_PER_HOP,
  maxTotalCalls: MAX_TOTAL_CALLS,
  maxTotalToolChars: MAX_TOTAL_TOOL_CHARS,
} as const;

// Re-exported so callers that build a project slug for a step do not reach past
// this module into the tool layer.
export {
  CHAT_MODEL as AGENT_CHAT_MODEL,
  INFERENCE_OPTIONS as AGENT_INFERENCE_OPTIONS,
  projectSlug,
};
