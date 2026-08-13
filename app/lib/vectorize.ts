import { AIContextSchema, type ChunkMetadata, ResumeDataSchema } from '../schemas';
import type { AIContext, Env, ResumeData } from '../types';

export class VectorizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VectorizeError';
  }
}

// The embedding model truncates at 512 tokens. Roughly four characters per
// token puts the real ceiling near 2000 characters, so chunks are capped below
// that with margin. The cap is enforced rather than assumed: silent truncation
// at embed time is invisible — the vector is still written, still matches, and
// simply does not represent the tail of its own text.
const MAX_CHUNK_CHARS = 1600;

// Vectorize rejects any vector id over 64 bytes (VECTOR_UPSERT_ERROR 40008).
// Ids are composed from a prefix, a slug, and sometimes a suffix, so the budget
// has to be checked on the finished id rather than on any one part — the
// component caps below keep it in range and the assertion catches the case
// where a long company or project name pushes it over anyway.
const MAX_VECTOR_ID_BYTES = 64;

// Per-component slug caps, chosen so the longest id each one can produce stays
// well inside MAX_VECTOR_ID_BYTES once its prefix and `_highlights_N` suffix
// are added.
const SLUG_MAX = {
  project: 32,
  company: 20,
  years: 12,
  recognition: 32,
  aiContext: 40,
  group: 32,
} as const;

// Workers AI accepts a batch of texts per call; keeping batches modest avoids
// a single oversized request failing the whole populate.
const EMBED_BATCH_SIZE = 50;
const UPSERT_BATCH_SIZE = 100;
const DELETE_BATCH_SIZE = 500;

// Highlights are grouped rather than embedded one per vector. A lone sentence
// ("Dormant since March 2026.") carries no retrievable meaning by itself, and a
// single blob of eight of them averages into matching everything weakly. Three
// is the compromise, and each group repeats its parent's title so the chunk
// stands on its own.
const HIGHLIGHTS_PER_CHUNK = 3;

// Chunk ids from before the move to slug-based ids. Vectorize cannot list what
// it holds, so these would otherwise stay in the index forever — retrievable,
// stale, and invisible to every later populate. Deleting a nonexistent id is a
// no-op, so this stays safe to run on every populate.
const LEGACY_CHUNK_IDS: string[] = [
  'summary',
  'tools',
  'exploring',
  ...Array.from({ length: 20 }, (_, i) => `project_${i}`),
  ...Array.from({ length: 10 }, (_, i) => `experience_${i}`),
  ...Array.from({ length: 5 }, (_, i) => `recognition_${i}`),
  'ai_context_work-style',
  'ai_context_cloudflare-expertise',
  'ai_context_ai-focus',
  'ai_context_adobe-agentic',
  'ai_context_enterprise-experience',
];

export interface Chunk {
  id: string;
  text: string;
  metadata: Omit<ChunkMetadata, 'text'>;
}

export interface PopulateResult {
  inserted: number;
  deleted: number;
  ids: string[];
}

function slugify(value: string, maxLength = 48): string {
  return (
    value
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, maxLength)
      .replace(/-+$/g, '') || 'unnamed'
  );
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

function flattenGroups(value: string[] | Record<string, string[]>): Array<[string, string[]]> {
  return Array.isArray(value) ? [['all', value]] : Object.entries(value);
}

/**
 * Builds every chunk that will be embedded.
 *
 * Two rules run through all of it. Each chunk opens with a title line naming
 * the thing it describes, because the embedding only knows what is in the text
 * — a chunk whose body never says "edgevault" competes on generic prose against
 * every other Cloudflare project. And each chunk covers one subject: the
 * previous version put all 38 skills, every tool group, and four separate
 * products into single vectors, which made them match every query weakly and
 * none of them strongly.
 */
export function buildChunks(resumeData: ResumeData, aiContext?: AIContext): Chunk[] {
  const chunks: Chunk[] = [];

  const push = (
    id: string,
    title: string,
    body: string,
    metadata: Omit<ChunkMetadata, 'text' | 'title'>
  ) => {
    chunks.push({ id, text: `${title}\n${body}`.trim(), metadata: { ...metadata, title } });
  };

  push(
    'personal',
    'Blake Bauman — contact and identity',
    `Name: ${resumeData.name}
Title: ${resumeData.title}
Location: ${resumeData.location}
Contact: ${resumeData.email}${resumeData.phone ? ` | ${resumeData.phone}` : ''}
Links: LinkedIn: ${resumeData.linkedin} | GitHub: ${resumeData.github} | Website: ${resumeData.website}${resumeData.bluesky ? ` | Bluesky: ${resumeData.bluesky}` : ''}`,
    { type: 'personal', section: 'personal_info', sourceId: 'personal' }
  );

  // One vector per paragraph: the two summary paragraphs cover different
  // subjects (the Adobe role, the independent agent work) and averaging them
  // into one vector serves neither question well.
  resumeData.summary.forEach((paragraph, index) => {
    push(`summary_${index}`, 'Professional summary', paragraph, {
      type: 'summary',
      section: 'summary',
      sourceId: 'summary',
    });
  });

  push('skills', 'Skills and technologies', resumeData.skills.join(', '), {
    type: 'skills',
    section: 'skills',
    sourceId: 'skills',
  });

  for (const [group, items] of flattenGroups(resumeData.tools)) {
    if (!items.length) continue;
    push(
      `tools_${slugify(group, SLUG_MAX.group)}`,
      `Tools and technologies — ${group}`,
      items.join(', '),
      {
        type: 'tools',
        section: 'tools',
        sourceId: 'tools',
        topics: group,
      }
    );
  }

  for (const [group, items] of flattenGroups(resumeData.exploring)) {
    if (!items.length) continue;
    push(
      `exploring_${slugify(group, SLUG_MAX.group)}`,
      `Currently exploring — ${group}`,
      items.join(', '),
      {
        type: 'exploring',
        section: 'exploring',
        sourceId: 'exploring',
        topics: group,
      }
    );
  }

  for (const project of resumeData.projects) {
    const slug = slugify(project.name, SLUG_MAX.project);
    const title = `Project: ${project.name}`;
    const facts = [
      `Description: ${project.description}`,
      project.context ? `Context: ${project.context}` : '',
      `Technologies: ${project.tech.join(', ')}`,
      project.year ? `Year: ${project.year}` : '',
      project.status ? `Status: ${project.status}` : '',
      project.maturity ? `Maturity: ${project.maturity}` : '',
      project.language ? `Primary language: ${project.language}` : '',
      project.org ? `Organization: ${project.org}` : '',
      project.visibility === 'private'
        ? 'Repository: private, no public source available'
        : project.github
          ? `GitHub: ${project.github}`
          : '',
      project.website ? `Website: ${project.website}` : '',
      project.aliases?.length ? `Also referred to as: ${project.aliases.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    push(`project_${slug}`, title, facts, {
      type: 'projects',
      section: 'projects',
      sourceId: slug,
      topics: [project.name, ...(project.aliases ?? [])].join(', '),
      kind: project.maturity,
    });

    chunkArray(project.highlights ?? [], HIGHLIGHTS_PER_CHUNK).forEach((group, index) => {
      push(
        `project_${slug}_highlights_${index}`,
        `${title} — what it does`,
        group.map(item => `- ${item}`).join('\n'),
        {
          type: 'projects',
          section: 'projects',
          sourceId: slug,
          topics: [project.name, ...(project.aliases ?? [])].join(', '),
          kind: project.maturity,
        }
      );
    });
  }

  for (const exp of resumeData.experience) {
    const slug = `${slugify(exp.company, SLUG_MAX.company)}_${slugify(exp.years, SLUG_MAX.years)}`;
    const title = `${exp.role} at ${exp.company} (${exp.years})`;
    const facts = [
      `Company: ${exp.company}`,
      `Role: ${exp.role}`,
      `Years: ${exp.years}`,
      exp.location ? `Location: ${exp.location}` : '',
      exp.clientContext ? `Client context: ${exp.clientContext}` : '',
      `Description: ${exp.description}`,
      exp.tech?.length ? `Technologies used: ${exp.tech.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const metadata = {
      type: 'experience' as const,
      section: 'work_experience',
      sourceId: slug,
      company: exp.company,
      role: exp.role,
      years: exp.years,
    };

    push(`experience_${slug}`, title, facts, metadata);

    chunkArray(exp.highlights ?? [], HIGHLIGHTS_PER_CHUNK).forEach((group, index) => {
      push(
        `experience_${slug}_highlights_${index}`,
        `${title} — accomplishments`,
        group.map(item => `- ${item}`).join('\n'),
        metadata
      );
    });
  }

  for (const item of resumeData.recognition ?? []) {
    const slug = slugify(item.title, SLUG_MAX.recognition);
    push(`recognition_${slug}`, `Recognition: ${item.title} (${item.year})`, item.description, {
      type: 'recognition',
      section: 'recognition',
      sourceId: slug,
    });
  }

  for (const item of aiContext?.context ?? []) {
    push(`ai_context_${slugify(item.id, SLUG_MAX.aiContext)}`, item.title, item.text, {
      type: 'ai_context',
      section: 'ai_context',
      sourceId: item.id,
      topics: item.topics.join(', '),
      kind: item.kind,
    });
  }

  assertChunksValid(chunks);
  return chunks;
}

function assertChunksValid(chunks: Chunk[]): void {
  const seen = new Set<string>();
  const encoder = new TextEncoder();

  for (const chunk of chunks) {
    if (seen.has(chunk.id)) {
      throw new VectorizeError(
        `Duplicate chunk id "${chunk.id}" — two entries slugify to the same id, so one would silently overwrite the other`
      );
    }
    seen.add(chunk.id);

    // Vectorize rejects the whole upsert batch on an oversized id, so catching
    // it here turns a failed production populate into a failed test.
    const idBytes = encoder.encode(chunk.id).length;
    if (idBytes > MAX_VECTOR_ID_BYTES) {
      throw new VectorizeError(
        `Chunk id "${chunk.id}" is ${idBytes} bytes, over the Vectorize limit of ${MAX_VECTOR_ID_BYTES}. Shorten the corresponding SLUG_MAX budget.`
      );
    }

    if (chunk.text.length > MAX_CHUNK_CHARS) {
      throw new VectorizeError(
        `Chunk "${chunk.id}" is ${chunk.text.length} characters, over the ${MAX_CHUNK_CHARS} limit. The embedding model would truncate it and the tail would be unretrievable.`
      );
    }
  }
}

async function embedAll(env: Env, chunks: Chunk[]): Promise<number[][]> {
  const values: number[][] = [];

  for (const batch of chunkArray(chunks, EMBED_BATCH_SIZE)) {
    const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: batch.map(chunk => chunk.text),
    });

    if (!embeddings.data || embeddings.data.length !== batch.length) {
      throw new VectorizeError(
        `Embedding batch returned ${embeddings.data?.length ?? 0} vectors for ${batch.length} chunks`
      );
    }
    values.push(...embeddings.data);
  }

  return values;
}

/**
 * Reads the ids written by the previous populate.
 *
 * Reconciliation is best-effort: if the manifest table is unavailable the
 * populate still runs, because an index that is fresh but not pruned beats an
 * index that failed to update at all.
 */
async function readManifest(env: Env): Promise<string[] | null> {
  try {
    const result = await env.CHAT_LOGS_DB.prepare('SELECT id FROM vector_manifest').all<{
      id: string;
    }>();
    return (result.results ?? []).map(row => row.id);
  } catch (error) {
    console.warn('Vector manifest unavailable, skipping stale-vector reconciliation:', error);
    return null;
  }
}

async function writeManifest(env: Env, chunks: Chunk[]): Promise<void> {
  const now = new Date().toISOString();
  const statements = [
    env.CHAT_LOGS_DB.prepare('DELETE FROM vector_manifest'),
    ...chunks.map(chunk =>
      env.CHAT_LOGS_DB.prepare(
        'INSERT INTO vector_manifest (id, chunk_type, updated_at) VALUES (?, ?, ?)'
      ).bind(chunk.id, chunk.metadata.type, now)
    ),
  ];
  await env.CHAT_LOGS_DB.batch(statements);
}

/**
 * Populates the Vectorize index with resume data chunks and AI context, and
 * removes vectors that the current content no longer produces.
 */
export async function populateVectorizeIndex(
  env: Env,
  resumeData: unknown,
  aiContextData?: unknown
): Promise<PopulateResult> {
  const parseResult = ResumeDataSchema.safeParse(resumeData);
  if (!parseResult.success) {
    throw new VectorizeError(`Invalid resume data: ${parseResult.error.issues[0]?.message}`);
  }
  const validatedData: ResumeData = parseResult.data;

  let validatedAIContext: AIContext | undefined;
  if (aiContextData) {
    const aiContextResult = AIContextSchema.safeParse(aiContextData);
    if (!aiContextResult.success) {
      throw new VectorizeError(
        `Invalid AI context data: ${aiContextResult.error.issues[0]?.message}`
      );
    }
    validatedAIContext = aiContextResult.data;
  }

  try {
    const chunks = buildChunks(validatedData, validatedAIContext);
    const embeddings = await embedAll(env, chunks);

    const vectors = chunks.map((chunk, index) => {
      const values = embeddings[index];
      if (!values) {
        throw new VectorizeError(`Missing embedding values for chunk ${chunk.id}`);
      }
      return {
        id: chunk.id,
        values,
        metadata: { ...chunk.metadata, text: chunk.text },
      };
    });

    for (const batch of chunkArray(vectors, UPSERT_BATCH_SIZE)) {
      await env.VECTORIZE.upsert(batch);
    }

    // Prune only after the new vectors are in place, so a failure mid-populate
    // leaves the index stale rather than partially empty.
    const currentIds = new Set(chunks.map(chunk => chunk.id));
    const previousIds = await readManifest(env);
    const staleIds = [...new Set([...(previousIds ?? []), ...LEGACY_CHUNK_IDS])].filter(
      id => !currentIds.has(id)
    );

    if (staleIds.length) {
      for (const batch of chunkArray(staleIds, DELETE_BATCH_SIZE)) {
        await env.VECTORIZE.deleteByIds(batch);
      }
    }

    if (previousIds !== null) {
      await writeManifest(env, chunks);
    }

    console.log(
      `Vectorize populate complete: ${vectors.length} upserted, ${staleIds.length} stale ids deleted`
    );

    return { inserted: vectors.length, deleted: staleIds.length, ids: chunks.map(c => c.id) };
  } catch (error) {
    console.error('Error populating Vectorize index:', error);
    throw error instanceof VectorizeError
      ? error
      : new VectorizeError(error instanceof Error ? error.message : 'Unknown error');
  }
}
