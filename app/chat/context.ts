import { ChunkMetadataSchema } from '../schemas';
import type { ChunkMetadata, Env, ResumeData, VectorMatch } from '../types';

/** A retrieved chunk that survived validation and filtering. */
export interface RetrievedMatch {
  id: string;
  score: number;
  type: string;
  title: string;
  sourceId: string;
  text: string;
}

/** What grounded an answer, collapsed to one entry per source entity. */
export interface ContextSource {
  label: string;
  title: string;
}

export interface ResumeContext {
  relevantSkills: string[];
  relevantSections: string;
  matches: RetrievedMatch[];
  sources: ContextSource[];
}

// Retrieve wide, then filter. Recall and precision are separate problems: asking
// for more candidates costs one query, while letting weak candidates into the
// prompt costs answer quality on every turn.
const TOP_K = 16;

// Cosine floor for bge-base-en-v1.5, measured rather than guessed. The index is
// small, so every query returns its full topK whether or not anything is
// actually relevant — without a floor, "what is the capital of France?" pulls
// eight resume chunks into the prompt at full confidence.
//
// Calibrated against the live index with `pnpm run vectorize:eval` plus probes
// of deliberately unrelated queries:
//
//   unrelated queries      top match 0.46 - 0.54
//   correct golden-set hits  min 0.584, p10 0.627, median 0.717
//
// 0.55 sits in the gap between those two populations. Re-measure after any
// substantial content change: the separation is a property of this corpus, not
// of the model.
const MIN_SCORE = 0.55;

// ...but never return nothing. A question whose best match is weak is still
// better served by that match plus an honest "this may not be in the record"
// than by an empty context, which reads to the model as "make something up".
const ALWAYS_KEEP_TOP = 3;

// Ceiling on retrieved context. The 512-token response cap is a limit on
// output, not input, and nothing previously accounted for prompt size at all.
const MAX_CONTEXT_CHARS = 6000;

// Section headings for each vector match type. Every chunk type written by
// buildChunks must appear here: matches are grouped by `metadata.type` and
// rendered by looking up this table, so a missing type is retrieved from
// Vectorize and then silently dropped. `skills` is deliberately absent — it is
// handled separately via relevantSkills below.
const SECTION_LABELS: Record<string, string> = {
  tools: 'Tools & Technologies',
  projects: 'Projects',
  exploring: 'Currently Exploring',
  experience: 'Relevant Experience',
  recognition: 'Recognition',
  ai_context: 'Additional Background',
  personal: 'Personal Information',
  summary: 'Professional Summary',
};

function labelFor(type: string): string {
  return SECTION_LABELS[type] ?? 'Additional Background';
}

/**
 * Validates a raw Vectorize match and flattens it into a RetrievedMatch.
 *
 * The response used to be cast rather than parsed, so a vector written by an
 * older schema — or any malformed metadata — flowed straight into the system
 * prompt. Returns null for anything that does not validate.
 */
function toRetrievedMatch(match: VectorMatch): RetrievedMatch | null {
  const parsed = ChunkMetadataSchema.safeParse(match.metadata);
  if (!parsed.success) return null;

  const metadata: ChunkMetadata = parsed.data;
  if (!metadata.text) return null;

  return {
    id: match.id,
    score: match.score,
    type: metadata.type,
    title: metadata.title ?? metadata.section,
    sourceId: metadata.sourceId ?? match.id,
    text: metadata.text,
  };
}

/**
 * Applies the score floor, removes duplicates, and fills up to the character
 * budget highest-score-first.
 */
export function selectMatches(rawMatches: VectorMatch[]): RetrievedMatch[] {
  const seen = new Set<string>();
  const candidates: RetrievedMatch[] = [];

  for (const raw of [...rawMatches].sort((a, b) => b.score - a.score)) {
    const match = toRetrievedMatch(raw);
    if (!match || seen.has(match.id)) continue;
    seen.add(match.id);
    candidates.push(match);
  }

  const aboveFloor = candidates.filter(match => match.score >= MIN_SCORE);
  const kept = aboveFloor.length > 0 ? aboveFloor : candidates.slice(0, ALWAYS_KEEP_TOP);

  const selected: RetrievedMatch[] = [];
  let budget = MAX_CONTEXT_CHARS;
  for (const match of kept) {
    if (match.text.length > budget) continue;
    selected.push(match);
    budget -= match.text.length;
  }

  return selected;
}

/**
 * Renders matches into prompt sections, ordered by the best score in each
 * section rather than by a fixed table — whatever the question was most about
 * should be the first thing the model reads.
 */
export function renderSections(matches: RetrievedMatch[]): string {
  const byType = new Map<string, RetrievedMatch[]>();
  for (const match of matches) {
    const existing = byType.get(match.type);
    if (existing) existing.push(match);
    else byType.set(match.type, [match]);
  }

  return [...byType.entries()]
    .sort((a, b) => Math.max(...b[1].map(m => m.score)) - Math.max(...a[1].map(m => m.score)))
    .map(([type, group]) => `\n${labelFor(type)}:\n${group.map(m => m.text).join('\n\n')}`)
    .join('');
}

// Suffixes appended to a parent's title by the highlight chunks in
// buildChunks. Matched exactly rather than splitting on the first em dash —
// several legitimate titles contain one ("Tools and technologies — AI & Agents"),
// and splitting threw away the half that identified them.
const HIGHLIGHT_TITLE_SUFFIXES = [' — what it does', ' — accomplishments'];

// Citations are provenance, not an audit log. Past a handful the chips stop
// reading as "this is where the answer came from" and start reading as clutter.
const MAX_SOURCES = 4;

// Cite only what was close to the best match. A fixed top-N cites the 4th-best
// chunk just as confidently as the 1st even when it scored far lower and
// contributed nothing to the answer.
//
// Swept against the live index across representative queries. Scores here sit in
// a narrow band, so the delta is sensitive:
//
//   0.02  too tight — "has he written any Rust?" loses memoturn-db-engine
//   0.03  right     — "what authentication has Blake built?" cites the auth and
//                     edgevault chunks and stops there
//   0.05  too loose — the same query also cites `personal` (0.717) and the Adobe
//                     role chunk (0.723), neither of which is about auth
//
// Retrieval is unchanged: the model still receives the full filtered context.
// This governs only what is claimed as a source.
const CITATION_SCORE_DELTA = 0.03;

function citationTitle(title: string): string {
  for (const suffix of HIGHLIGHT_TITLE_SUFFIXES) {
    if (title.endsWith(suffix)) return title.slice(0, -suffix.length);
  }
  return title;
}

/**
 * Collapses matches to one citation per source entity, in score order. Three
 * chunks of the felix project cite as one "Project: felix", not three.
 */
export function toSources(matches: RetrievedMatch[]): ContextSource[] {
  const best = matches[0]?.score;
  if (best === undefined) return [];

  const seen = new Set<string>();
  const sources: ContextSource[] = [];

  for (const match of matches) {
    if (match.score < best - CITATION_SCORE_DELTA) break;

    const key = `${match.type}:${match.sourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ label: labelFor(match.type), title: citationTitle(match.title) });
    if (sources.length >= MAX_SOURCES) break;
  }

  return sources;
}

/**
 * Skills matching the query, rather than all of them.
 *
 * Previously any skills or tools hit dumped the entire 38-item skill list into
 * the prompt. With tools now chunked per group, the matched groups are the
 * answer to "what does he work with", and the full list only makes sense when
 * the skills chunk itself matched.
 */
function selectSkills(matches: RetrievedMatch[], resumeData: ResumeData): string[] {
  if (matches.some(match => match.type === 'skills')) {
    return resumeData.skills;
  }

  const toolMatches = matches.filter(match => match.type === 'tools');
  if (!toolMatches.length) return [];

  const groups = Array.isArray(resumeData.tools) ? {} : resumeData.tools;
  return toolMatches.flatMap(match => {
    const groupName = match.title.replace(/^Tools and technologies — /, '');
    return groups[groupName] ?? [];
  });
}

/**
 * Formats the entire resume as context — used when vector search is
 * unavailable or fails.
 *
 * This deliberately mirrors what the vector path can surface, including
 * recognition. It previously omitted recognition entirely, which meant the
 * fallback answered from a different set of facts than the primary path: the
 * same question got a different answer depending on whether Vectorize was up.
 */
export function buildFullResumeContext(
  resumeData: ResumeData,
  aiContextText: string[] = []
): ResumeContext {
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
      relevantSections += `\n\nProject: ${project.name}\nDescription: ${project.description}${project.context ? `\nContext: ${project.context}` : ''}\nTechnologies: ${project.tech.join(', ')}${project.year ? `\nYear: ${project.year}` : ''}${project.status ? `\nStatus: ${project.status}` : ''}${project.maturity ? `\nMaturity: ${project.maturity}` : ''}${project.github ? `\nGitHub: ${project.github}` : ''}${project.website ? `\nWebsite: ${project.website}` : ''}`;
      for (const highlight of project.highlights ?? []) {
        relevantSections += `\n- ${highlight}`;
      }
    }
  }

  relevantSections += '\n\nExperience:';
  for (const exp of resumeData.experience) {
    relevantSections += `\n\nCompany: ${exp.company}\nRole: ${exp.role}\nYears: ${exp.years}\nDescription: ${exp.description}${exp.tech?.length ? `\nTechnologies used: ${exp.tech.join(', ')}` : ''}`;
    for (const highlight of exp.highlights ?? []) {
      relevantSections += `\n- ${highlight}`;
    }
  }

  if (resumeData.recognition?.length) {
    relevantSections += '\n\nRecognition:';
    for (const item of resumeData.recognition) {
      relevantSections += `\n\n${item.title} (${item.year}): ${item.description}`;
    }
  }

  if (resumeData.exploring) {
    const exploringList = Array.isArray(resumeData.exploring)
      ? resumeData.exploring
      : Object.values(resumeData.exploring).flat();
    if (exploringList.length) {
      relevantSections += `\n\nCurrently Exploring: ${exploringList.join(', ')}`;
    }
  }

  if (aiContextText.length) {
    relevantSections += `\n\nAdditional Background:\n${aiContextText.join('\n\n')}`;
  }

  return {
    relevantSkills: resumeData.skills || [],
    relevantSections,
    matches: [],
    sources: [],
  };
}

/**
 * Embed the prompt, query Vectorize, and format matched sections.
 * Falls back to the full resume context if search fails.
 */
export async function searchResumeContext(
  env: Env,
  prompt: string,
  resumeData: ResumeData,
  aiContextText: string[] = []
): Promise<ResumeContext> {
  try {
    const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [prompt] });
    const queryVector = embeddings.data?.[0];
    if (!queryVector) {
      return buildFullResumeContext(resumeData, aiContextText);
    }

    const vectorResults = await env.VECTORIZE.query(queryVector, {
      topK: TOP_K,
      returnMetadata: 'all',
    });

    const matches = selectMatches(vectorResults.matches ?? []);

    return {
      relevantSkills: selectSkills(matches, resumeData),
      relevantSections: renderSections(matches),
      matches,
      sources: toSources(matches),
    };
  } catch (error) {
    console.error('Vector search error:', error);
    return buildFullResumeContext(resumeData, aiContextText);
  }
}

export const RETRIEVAL_CONFIG = {
  topK: TOP_K,
  minScore: MIN_SCORE,
  alwaysKeepTop: ALWAYS_KEEP_TOP,
  maxContextChars: MAX_CONTEXT_CHARS,
} as const;
