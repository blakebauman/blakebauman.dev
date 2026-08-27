import { z } from 'zod';
import { RETRIEVAL_CONFIG, type RetrievedMatch, selectMatches } from '../chat/context';
import { aiContext, resumeData } from '../chat/data';
import { CASE_STUDIES, caseStudyFor } from '../content/case-studies';
import { normalizeForMatch, stripFenceMarkers } from '../lib/text';
import { SLUG_MAX, slugify } from '../lib/vectorize';
import type { Env, Project } from '../types';

/**
 * The tool layer.
 *
 * One set of pure-ish functions over the record, shared by every agentic
 * surface: the MCP server at /mcp, and (next) the on-site chat loop. The point
 * of putting them here rather than inside either consumer is that a tool has
 * exactly one definition of what it returns, so the answer an external agent
 * gets and the answer the site's own assistant gets cannot drift.
 *
 * Three properties are deliberate and load-bearing:
 *
 * - **Tools return text, not objects.** Both MCP content blocks and LLM tool
 *   results are strings in the end. Formatting here rather than at each caller
 *   means the model reads the same rendering everywhere.
 * - **Every output is capped and sanitized centrally** (see `callTool`). Tool
 *   results re-enter the transcript on every hop of an agent loop, so an
 *   uncapped tool is a context-window exhaustion bug waiting to happen, and an
 *   unsanitized one is a fence-escape.
 * - **Schemas are Zod, and the JSON Schema is derived from them.** `tools/list`
 *   over MCP and a Workers AI function-calling definition both need JSON
 *   Schema; deriving it means the validation and the advertised contract cannot
 *   disagree.
 */

// Tool results re-enter the model's context on every hop, so an unbounded tool
// output is what turns a three-hop conversation into a truncated one. 6000
// characters is roughly 1500 tokens; three hops spend ~4.5k of the chat model's
// 24k window and leave room for the system prompt and the transcript. It
// matches MAX_CONTEXT_CHARS in context.ts deliberately — one budget for "how
// much of the record may enter a prompt at once", not two that drift.
//
// This is a backstop, not a design. A tool whose normal output approaches it is
// returning too much: see the truncation test, which asserts that nothing does.
const MAX_TOOL_OUTPUT_CHARS = 6000;

/** A tool cannot do its job right now, but the caller could try another. */
export class ToolUnavailableError extends Error {}

/** The caller asked for something that is not in the record. */
export class ToolLookupError extends Error {}

export interface ToolContext {
  /** Present for surfaces that can reach Workers AI and Vectorize. */
  env?: Env;
  /**
   * Called with what `search_record` retrieved, before it is rendered to text.
   *
   * Source attribution works by term overlap between the finished answer and
   * the chunks behind it (see `attributeSources`), which needs the chunks, not
   * their rendering. The agent loop passes this so its citations stay as
   * well-founded as the retrieval path's; MCP omits it, because an external
   * agent renders its own provenance from the source lines in the text.
   */
  onMatches?: (matches: RetrievedMatch[]) => void;
}

/**
 * Where this record can be queried from. Derived from the record's own
 * canonical website so there is one origin, not one per file that needs it.
 */
const SITE_ORIGIN = resumeData.website.replace(/\/$/, '');
const MCP_ENDPOINT = `${SITE_ORIGIN}/mcp`;
const LLMS_TXT_URL = `${SITE_ORIGIN}/llms.txt`;

export interface ToolResult {
  text: string;
  /**
   * A tool-level failure — an unknown project, a search with no bindings. MCP
   * reports these as content with `isError`, not as a protocol error, and an
   * agent loop feeds them back to the model, because both cases are ones the
   * caller can recover from by trying something else.
   */
  isError: boolean;
}

interface ToolDefinition<Schema extends z.ZodType> {
  name: string;
  /** Written for a model, not a human: says when to reach for this. */
  description: string;
  schema: Schema;
  run(args: z.infer<Schema>, ctx: ToolContext): Promise<string> | string;
}

/**
 * The registry's view of a tool, with the argument type erased.
 *
 * Each tool's `run` is checked against its own schema at the `defineTool` call
 * site, which is where a mismatch would actually be a bug. Erasing the generic
 * afterwards is what lets tools with different argument shapes live in one
 * array — and the cast is sound because `callTool` is the only caller of `run`,
 * and it parses with `schema` first.
 */
interface RegisteredTool {
  name: string;
  description: string;
  schema: z.ZodType;
  run(args: never, ctx: ToolContext): Promise<string> | string;
}

function defineTool<Schema extends z.ZodType>(definition: ToolDefinition<Schema>): RegisteredTool {
  return definition as RegisteredTool;
}

/* -------------------------------------------------------------------------
   Rendering helpers
   ------------------------------------------------------------------------- */

function line(label: string, value: string | undefined | null): string {
  return value ? `${label}: ${value}` : '';
}

function join(parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join('\n');
}

/** Shortens at a word boundary, so a clamped line does not end mid-word. */
function clamp(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const boundary = cut.lastIndexOf(' ');
  return `${(boundary > maxLength * 0.6 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}

/**
 * The slug a project is known by. Identical to the one `buildChunks` writes as
 * `sourceId`, which is what makes search -> get_project a working two-hop path:
 * a `search_record` hit names a source the next tool call can resolve.
 */
export function projectSlug(project: Project): string {
  return slugify(project.name, SLUG_MAX.project);
}

/**
 * Mirrors the chunker's wording for a private repository rather than inventing
 * its own. `visibility` describes the repository; `listed` describes the page.
 * Conflating them would have the assistant claim there is no public source for
 * a repo anyone can clone.
 */
function repositoryLine(project: Project): string {
  if (project.visibility === 'private') {
    return 'Repository: private, no public source available';
  }
  return line('GitHub', project.github);
}

function renderProject(project: Project): string {
  return join([
    `Project: ${project.name}`,
    line('Description', project.description),
    line('Context', project.context),
    line('Technologies', project.tech.join(', ')),
    line('Year', project.year),
    line('Last repository activity', project.lastActivity),
    line('Status', project.status),
    line('Maturity', project.maturity),
    line('Primary language', project.language),
    line('Organization', project.org),
    repositoryLine(project),
    line('Website', project.website),
    project.aliases?.length ? `Also referred to as: ${project.aliases.join(', ')}` : '',
    project.highlights?.length
      ? `\nWhat it does:\n${project.highlights.map(h => `- ${h}`).join('\n')}`
      : '',
    caseStudyFor(projectSlug(project))
      ? `\nA long-form case study exists for this project. Call read_case_study with slug "${projectSlug(project)}" for the full account.`
      : '',
  ]);
}

/* -------------------------------------------------------------------------
   Tools
   ------------------------------------------------------------------------- */

const searchRecord = defineTool({
  name: 'search_record',
  description:
    "Semantic search across Blake Bauman's professional record: projects, roles, skills, background and FAQ material. Use this first for open questions, or when you do not know which project or role an answer lives in. Returns ranked excerpts with the source each came from.",
  schema: z.object({
    query: z
      .string()
      .min(1)
      .max(300)
      .describe('A natural-language question or topic, e.g. "what authentication has he built?"'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe('Maximum excerpts to return. Defaults to 6.'),
  }),
  async run({ query, limit = 6 }, { env, onMatches }) {
    if (!env?.AI?.run || !env.VECTORIZE) {
      throw new ToolUnavailableError(
        'Semantic search is unavailable here. Use list_projects, list_experience or get_profile instead.'
      );
    }

    // Search is the one tool with a live dependency, and it is the one an agent
    // reaches for first. A binding that is down must therefore degrade into an
    // instruction the model can act on — the enumeration tools answer most
    // questions without it — rather than an internal error, which a loop cannot
    // recover from. searchResumeContext takes the same line for the chat path.
    let results: Awaited<ReturnType<Env['VECTORIZE']['query']>>;
    try {
      const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [query] });
      const queryVector = embeddings.data?.[0];
      if (!queryVector) {
        throw new Error('the prompt produced no embedding');
      }

      results = await env.VECTORIZE.query(queryVector, {
        topK: RETRIEVAL_CONFIG.topK,
        returnMetadata: 'all',
      });
    } catch (error) {
      // The cause goes to the log, never to the caller: it names bindings.
      console.error('[tools] search_record failed:', error);
      throw new ToolUnavailableError(
        'Semantic search is unavailable right now. list_projects, list_experience and get_profile answer from the record directly and are unaffected.'
      );
    }

    // selectMatches carries the calibrated score floor, the always-keep-top
    // rule and metadata validation. Reusing it rather than re-querying by hand
    // is what keeps /mcp answering from the same corpus, with the same
    // confidence threshold, as the on-site chat.
    const matches = selectMatches(results.matches ?? []).slice(0, limit);
    onMatches?.(matches);
    if (!matches.length) {
      return `Nothing in the record matched "${query}".`;
    }

    return matches
      .map(
        match =>
          `[${match.title}] (source: ${match.type}/${match.sourceId}, score ${match.score.toFixed(3)})\n${match.text}`
      )
      .join('\n\n');
  },
});

const listProjects = defineTool({
  name: 'list_projects',
  description:
    'Enumerate Blake\'s projects, newest repository activity first. Use this for questions about what he has built overall, what is most recent, or what uses a given technology — semantic search flattens on questions like these because every project is about Blake, so a list beats a similarity ranking. For what he has shipped or what is live, pass maturity "production" rather than filtering the full list by eye.',
  schema: z.object({
    tech: z
      .string()
      .max(60)
      .optional()
      .describe('Filter to projects using this technology or language, matched loosely.'),
    maturity: z
      .enum(['production', 'prototype', 'reference', 'archived'])
      .optional()
      .describe('Filter by how far along the project is.'),
    includeUnlisted: z
      .boolean()
      .optional()
      .describe(
        'Include projects kept off the rendered page. They are part of the record and safe to discuss. Defaults to true.'
      ),
  }),
  run({ tech, maturity, includeUnlisted = true }) {
    const needle = tech ? normalizeForMatch(tech) : null;

    const projects = resumeData.projects
      .filter(p => (includeUnlisted ? true : p.listed !== false))
      .filter(p => (maturity ? p.maturity === maturity : true))
      .filter(p =>
        needle
          ? [...p.tech, p.language ?? ''].some(t => normalizeForMatch(t).includes(needle))
          : true
      )
      .sort((a, b) => (b.lastActivity ?? '').localeCompare(a.lastActivity ?? ''));

    if (!projects.length) {
      return join([
        'No projects in the record match those filters.',
        tech ? `Technology filter: "${tech}"` : '',
        maturity ? `Maturity filter: "${maturity}"` : '',
      ]);
    }

    const rows = projects.map(p => {
      const facts = [
        p.maturity ?? 'maturity not recorded',
        p.language,
        p.lastActivity ? `last active ${p.lastActivity}` : '',
        p.listed === false ? 'not shown on the site' : '',
      ].filter(Boolean);
      // Maturity leads, immediately after the name. Trailing it after the
      // description put it where a model skims past: asked what Blake had
      // shipped, it returned felix — a prototype — among the production work.
      // Clamped description, not full: an enumeration whose rows carry whole
      // descriptions outgrows the output budget and loses its own tail, which
      // for a list ordered by recency means dropping the oldest work. The full
      // description is what get_project is for.
      return `- ${p.name} [${projectSlug(p)}] (${facts.join(', ')})\n  ${clamp(p.description, 110)}`;
    });

    return join([
      `${projects.length} project${projects.length === 1 ? '' : 's'}, most recent repository activity first:`,
      '',
      rows.join('\n'),
      '',
      // Without this the list reads as a list of shipped work, and a model asked
      // "what has he shipped?" answers with all of it — which overstates a
      // record whose own scope entries exist to keep prototypes called
      // prototypes. The maturity is on every row; this says what to do with it.
      // Descriptive, not imperative. An instruction addressed to the model
      // inside tool output gets parroted at the visitor: a trailing "call
      // get_project for full detail" came back in an answer verbatim, which is
      // the assistant narrating its own plumbing. What a tool is for belongs in
      // its description, where the model reads it and the visitor never does.
      'Maturity, in parentheses on each row, is the record\'s own word: "production" is deployed and in use, "prototype" works but is not battle-tested, "reference" exists to demonstrate an approach. Appearing on this list is not the same as being shipped.',
    ]);
  },
});

const getProject = defineTool({
  name: 'get_project',
  description:
    'Full detail on one project: description, technologies, maturity, links and what it actually does. Accepts the project name, one of its aliases, or the slug returned by search_record or list_projects.',
  schema: z.object({
    name: z
      .string()
      .min(1)
      .max(80)
      .describe('Project name, alias, or slug — e.g. "felix", "mcp gateway", "the chatbot".'),
  }),
  run({ name }) {
    const project = resolveProject(name);
    if (!project) {
      const known = resumeData.projects.map(p => p.name).join(', ');
      throw new ToolLookupError(
        `No project in the record is called "${name}". Known projects: ${known}`
      );
    }
    return renderProject(project);
  },
});

const listExperience = defineTool({
  name: 'list_experience',
  description:
    "Blake's employment history: every company, role, dates, what he did there and the technologies involved. Use this for any question about where he has worked, for how long, or in what capacity — it answers directly rather than relying on retrieval, which ranks poorly on questions with no proper noun in them.",
  schema: z.object({
    company: z
      .string()
      .max(60)
      .optional()
      .describe('Restrict to one company, matched loosely by name.'),
  }),
  run({ company }) {
    const needle = company ? normalizeForMatch(company) : null;
    const roles = resumeData.experience.filter(exp =>
      needle ? normalizeForMatch(exp.company).includes(needle) : true
    );

    if (!roles.length) {
      const known = resumeData.experience.map(e => e.company).join(', ');
      throw new ToolLookupError(
        `No role at "${company}" is in the record. Companies on the record: ${known}`
      );
    }

    return roles
      .map(exp =>
        join([
          `${exp.role} — ${exp.company} (${exp.years})`,
          line('Location', exp.location),
          line('Client context', exp.clientContext),
          exp.description,
          exp.tech?.length ? `Technologies: ${exp.tech.join(', ')}` : '',
          exp.highlights?.length ? exp.highlights.map(h => `- ${h}`).join('\n') : '',
        ])
      )
      .join('\n\n');
  },
});

const readCaseStudy = defineTool({
  name: 'read_case_study',
  description:
    'The long-form written account of one project — how it works, why it is built that way, and what the trade-offs were. Substantially more detail than get_project. Only some projects have one; list_projects and get_project say which.',
  schema: z.object({
    slug: z
      .string()
      .min(1)
      .max(60)
      .describe(`Case study slug. Available: ${CASE_STUDIES.map(c => c.slug).join(', ')}.`),
    section: z
      .string()
      .max(80)
      .optional()
      .describe(
        'Return only the section whose heading matches this, e.g. "Architecture". Omit for the whole study, which is long.'
      ),
  }),
  run({ slug, section }) {
    const study = caseStudyFor(normalizeForMatch(slug));
    if (!study) {
      throw new ToolLookupError(
        `No case study for "${slug}". Available: ${CASE_STUDIES.map(c => c.slug).join(', ')}.`
      );
    }

    const needle = section ? normalizeForMatch(section) : null;
    const sections = study.sections.filter(s =>
      needle ? normalizeForMatch(s.heading).includes(needle) : true
    );

    if (needle && !sections.length) {
      throw new ToolLookupError(
        `"${study.name}" has no section matching "${section}". Sections: ${study.sections.map(s => s.heading).join(', ')}.`
      );
    }

    const body = sections.map(s =>
      join([
        `## ${s.heading}`,
        ...(s.paragraphs ?? []),
        ...(s.list ?? []).map(item => `- ${item.term}: ${item.detail}`),
        // The diagrams are hand-authored inline SVG React nodes. Their caption
        // is the part that carries meaning in text; the node itself is not
        // serializable and describing it would mean inventing a description.
        s.figure ? `[Diagram: ${s.figure.caption}]` : '',
        s.code ? `[Code excerpt from ${s.code.path} — ${s.code.tag}]` : '',
      ])
    );

    return join([
      `# ${study.name}`,
      study.oneLine,
      study.meta.map(m => `${m.k}: ${m.v}`).join(' · '),
      study.links.map(l => `${l.label}: ${l.href}`).join('\n'),
      '',
      body.join('\n\n'),
    ]);
  },
});

const getProfile = defineTool({
  name: 'get_profile',
  description:
    'Who Blake is and how to reach him: current role, location, professional summary, contact and profile links, and how to query this record programmatically. Use this to open a conversation, whenever someone asks how to get in touch, and whenever someone asks whether the record can be queried by an agent or an API.',
  schema: z.object({}),
  run() {
    const current = resumeData.experience[0];
    const scope = aiContext.context.filter(item => item.kind === 'scope');

    return join([
      `${resumeData.name} — ${resumeData.title}`,
      line('Location', resumeData.location),
      current ? `Current role: ${current.role} at ${current.company} (${current.years})` : '',
      '',
      resumeData.summary.join('\n\n'),
      '',
      'Links:',
      line('Email', resumeData.email),
      line('Website', resumeData.website),
      line('GitHub', resumeData.github),
      line('LinkedIn', resumeData.linkedin),
      line('Bluesky', resumeData.bluesky),
      // The answer to "can I query this myself?", which is a question a visitor
      // asks the assistant rather than the endpoint. An agent already connected
      // over MCP is reading this redundantly, which costs a line and tells it
      // nothing false.
      `\nQuerying this record programmatically: ${MCP_ENDPOINT} is a Model Context Protocol server — JSON-RPC over POST, unauthenticated, read-only, exposing the same tools used to answer here. ${LLMS_TXT_URL} is a plain-text index of the same material.`,
      // The scope entries exist to give a model explicit language for what is a
      // prototype, what is unquantified and what is outside the record. An
      // external agent gets no system prompt from us, so this is the only place
      // those boundaries can be stated to it.
      scope.length
        ? `\nHow to read this record:\n${scope.map(item => `- ${item.title}: ${item.text}`).join('\n')}`
        : '',
    ]);
  },
});

/* -------------------------------------------------------------------------
   Registry and dispatch
   ------------------------------------------------------------------------- */

const TOOLS: RegisteredTool[] = [
  searchRecord,
  listProjects,
  getProject,
  listExperience,
  readCaseStudy,
  getProfile,
];

const BY_NAME = new Map(TOOLS.map(tool => [tool.name, tool]));

/** Resolves a project by name, alias or slug. Case- and spacing-insensitive. */
export function resolveProject(query: string): Project | undefined {
  const needle = normalizeForMatch(query);
  if (!needle) return undefined;

  const candidates = resumeData.projects;
  return (
    candidates.find(p => normalizeForMatch(p.name) === needle) ??
    candidates.find(p => projectSlug(p) === slugify(needle, SLUG_MAX.project)) ??
    candidates.find(p => (p.aliases ?? []).some(a => normalizeForMatch(a) === needle)) ??
    candidates.find(p => normalizeForMatch(p.name).includes(needle)) ??
    candidates.find(p => (p.aliases ?? []).some(a => normalizeForMatch(a).includes(needle)))
  );
}

/** The advertised contract for one tool, shaped for MCP `tools/list`. */
export interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Derives the advertised JSON Schema from a tool's Zod schema. `$schema` is
 * dropped: it is valid JSON Schema but noise inside an MCP `inputSchema`, which
 * is already defined to be one.
 */
function toInputSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _discarded, ...rest } = z.toJSONSchema(schema, { io: 'input' }) as Record<
    string,
    unknown
  >;
  return rest;
}

export function listTools(): ToolDescriptor[] {
  return TOOLS.map(tool => ({
    name: tool.name,
    description: tool.description,
    // Derived from the Zod schema rather than written twice, so what is
    // advertised and what is enforced cannot drift apart.
    inputSchema: toInputSchema(tool.schema),
  }));
}

export function hasTool(name: string): boolean {
  return BY_NAME.has(name);
}

function truncate(text: string): string {
  if (text.length <= MAX_TOOL_OUTPUT_CHARS) return text;
  return `${text.slice(0, MAX_TOOL_OUTPUT_CHARS)}\n\n[truncated at ${MAX_TOOL_OUTPUT_CHARS} characters — narrow the query or request a single section]`;
}

/**
 * Runs a tool by name.
 *
 * Every path out of here is capped, fence-stripped and invisible-character-free,
 * because this is the single boundary where tool output re-enters a model's
 * context. Doing it per-tool would mean a new tool is one forgotten call away
 * from being the exception.
 *
 * Only unexpected failures throw; anything the caller could act on comes back
 * as `isError` text so a model can correct itself instead of stalling.
 */
export async function callTool(
  name: string,
  rawArgs: unknown,
  ctx: ToolContext = {}
): Promise<ToolResult> {
  const tool = BY_NAME.get(name);
  if (!tool) {
    return {
      isError: true,
      text: `No tool named "${name}". Available: ${TOOLS.map(t => t.name).join(', ')}.`,
    };
  }

  const parsed = tool.schema.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    return { isError: true, text: `Invalid arguments for ${name} — ${detail}` };
  }

  try {
    const text = await tool.run(parsed.data as never, ctx);
    return { isError: false, text: truncate(stripFenceMarkers(text)) };
  } catch (error) {
    if (error instanceof ToolLookupError || error instanceof ToolUnavailableError) {
      return { isError: true, text: truncate(stripFenceMarkers(error.message)) };
    }
    throw error;
  }
}

export const TOOL_LIMITS = { maxOutputChars: MAX_TOOL_OUTPUT_CHARS } as const;
