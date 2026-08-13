import { describe, expect, it, vi } from 'vitest';
import { aiContext, resumeData } from '../../chat/data';
import type { Env } from '../../types';
import { buildChunks, populateVectorizeIndex, VectorizeError } from '../vectorize';

const chunks = buildChunks(resumeData, aiContext);

describe('buildChunks', () => {
  it('produces stable, slug-based ids', () => {
    const ids = chunks.map(c => c.id);

    // Positional ids (project_0) renamed themselves every time an entry moved
    // in the file, which orphaned the old vector and wrote a new one.
    expect(ids).toContain('project_felix');
    expect(ids).toContain('project_memoturn');
    expect(ids).toContain('project_memoturn-db');
    expect(ids.every(id => !/^project_\d+$/.test(id))).toBe(true);
  });

  it('gives every chunk a unique id', () => {
    const ids = chunks.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every id inside the 64-byte Vectorize limit', () => {
    // Vectorize rejects the entire upsert batch with VECTOR_UPSERT_ERROR 40008
    // on a single oversized id. The composite experience ids are the tight case:
    // prefix + company + years + "_highlights_N".
    const encoder = new TextEncoder();
    const oversized = chunks
      .map(c => ({ id: c.id, bytes: encoder.encode(c.id).length }))
      .filter(c => c.bytes > 64);

    expect(oversized, `ids over 64 bytes: ${JSON.stringify(oversized)}`).toEqual([]);
  });

  it('rejects an id that would exceed the Vectorize limit', () => {
    const longNames = {
      ...resumeData,
      experience: [
        {
          company: 'A'.repeat(80),
          role: 'Architect',
          years: '2017-2019',
          description: 'x',
          highlights: ['one'],
        },
      ],
    };

    // The slug caps normally prevent this; the assertion is the backstop for a
    // future prefix or suffix change that eats the remaining budget.
    const encoder = new TextEncoder();
    const built = buildChunks(longNames);
    expect(built.every(c => encoder.encode(c.id).length <= 64)).toBe(true);
  });

  it('throws rather than letting two entries collide on one id', () => {
    const collided = {
      ...resumeData,
      projects: [
        { name: 'Cave Acoustics', description: 'a', tech: [] },
        { name: 'cave-acoustics', description: 'b', tech: [] },
      ],
    };

    expect(() => buildChunks(collided)).toThrow(VectorizeError);
    expect(() => buildChunks(collided)).toThrow(/Duplicate chunk id/);
  });

  it('rejects a chunk the embedding model would truncate', () => {
    const oversized = {
      ...resumeData,
      projects: [{ name: 'huge', description: 'x'.repeat(2000), tech: [] }],
    };

    // Truncation at embed time is silent: the vector is still written, still
    // matches, and simply does not represent the tail of its own text.
    expect(() => buildChunks(oversized)).toThrow(/over the 1600 limit/);
  });

  it('opens every chunk with a title naming its subject', () => {
    // Without the name inside the embedded text, a chunk about edgevault
    // competes on generic prose against every other Cloudflare project.
    for (const chunk of chunks) {
      expect(chunk.metadata.title, `chunk ${chunk.id} has no title`).toBeTruthy();
      expect(chunk.text.startsWith(chunk.metadata.title as string)).toBe(true);
    }
  });

  it('splits the mega-chunks into one vector per subject', () => {
    const ids = chunks.map(c => c.id);

    // All tool groups used to share a single vector, as did both summary
    // paragraphs, so each matched every query weakly and none strongly.
    expect(ids.filter(id => id.startsWith('tools_')).length).toBeGreaterThan(1);
    expect(ids.filter(id => id.startsWith('exploring_')).length).toBeGreaterThan(1);
    expect(ids.filter(id => id.startsWith('summary_')).length).toBe(resumeData.summary.length);
  });

  it('emits separate highlight chunks so a specific capability can match', () => {
    const felixHighlights = chunks.filter(c => c.id.startsWith('project_felix_highlights_'));
    expect(felixHighlights.length).toBeGreaterThan(0);
    // Highlight chunks cite as their parent project.
    expect(felixHighlights.every(c => c.metadata.sourceId === 'felix')).toBe(true);
  });

  it('indexes the chat-only ai-context layer', () => {
    const aiChunks = chunks.filter(c => c.metadata.type === 'ai_context');
    expect(aiChunks.length).toBe(aiContext.context.length);
  });

  it('marks private projects as having no public source', () => {
    const privateProject = resumeData.projects.find(p => p.visibility === 'private');
    expect(privateProject).toBeTruthy();

    const chunk = chunks.find(c => c.id === `project_${privateProject?.name.toLowerCase()}`);
    expect(chunk?.text).toContain('private, no public source');
  });
});

function stubEnv(overrides: Partial<Env> = {}) {
  const upsert = vi.fn().mockResolvedValue(undefined);
  const deleteByIds = vi.fn().mockResolvedValue({ count: 0 });
  const batch = vi.fn().mockResolvedValue([]);
  const all = vi.fn().mockResolvedValue({ results: [] });

  const env = {
    AI: {
      run: vi.fn().mockImplementation((_model: string, input: { text: string[] }) => ({
        data: input.text.map(() => [0.1, 0.2, 0.3]),
      })),
    },
    VECTORIZE: { upsert, deleteByIds, query: vi.fn() },
    CHAT_LOGS_DB: { prepare: vi.fn().mockReturnValue({ bind: vi.fn(), all }), batch },
    ...overrides,
  } as unknown as Env;

  return { env, upsert, deleteByIds, batch, all };
}

describe('populateVectorizeIndex', () => {
  it('upserts every chunk and reports the count', async () => {
    const { env, upsert } = stubEnv();
    const result = await populateVectorizeIndex(env, resumeData, aiContext);

    expect(result.inserted).toBe(chunks.length);
    expect(upsert).toHaveBeenCalled();

    const upserted = upsert.mock.calls.flatMap(call => call[0]);
    expect(upserted).toHaveLength(chunks.length);
    // The chunk body is stored as metadata; retrieval reads it back from there.
    expect(upserted.every((v: { metadata: { text: string } }) => v.metadata.text.length > 0)).toBe(
      true
    );
  });

  it('deletes vectors the current content no longer produces', async () => {
    const { env, deleteByIds, all } = stubEnv();
    all.mockResolvedValue({ results: [{ id: 'project_deleted-thing' }, { id: 'project_felix' }] });

    const result = await populateVectorizeIndex(env, resumeData, aiContext);

    const deleted = deleteByIds.mock.calls.flatMap(call => call[0]);
    expect(deleted).toContain('project_deleted-thing');
    // Still present in the current content, so it must survive.
    expect(deleted).not.toContain('project_felix');
    expect(result.deleted).toBeGreaterThan(0);
  });

  it('sweeps the legacy positional ids even on a first run', async () => {
    const { env, deleteByIds } = stubEnv();
    await populateVectorizeIndex(env, resumeData, aiContext);

    const deleted = deleteByIds.mock.calls.flatMap(call => call[0]);
    // Vectorize cannot list its contents, so these would otherwise stay
    // retrievable forever.
    expect(deleted).toContain('project_0');
    expect(deleted).toContain('ai_context_ai-focus');
    expect(deleted).toContain('summary');
  });

  it('still populates when the manifest table is unavailable', async () => {
    const { env, all, upsert, batch } = stubEnv();
    all.mockRejectedValue(new Error('no such table: vector_manifest'));

    const result = await populateVectorizeIndex(env, resumeData, aiContext);

    // A fresh-but-unpruned index beats a populate that refused to run.
    expect(result.inserted).toBe(chunks.length);
    expect(upsert).toHaveBeenCalled();
    expect(batch).not.toHaveBeenCalled();
  });

  it('rejects content that fails schema validation', async () => {
    const { env } = stubEnv();
    await expect(populateVectorizeIndex(env, { name: 'incomplete' })).rejects.toThrow(
      VectorizeError
    );
  });

  it('fails loudly when the embedding count does not match the chunk count', async () => {
    const { env } = stubEnv({
      AI: { run: vi.fn().mockResolvedValue({ data: [[0.1]] }) },
    } as unknown as Partial<Env>);

    await expect(populateVectorizeIndex(env, resumeData, aiContext)).rejects.toThrow(
      /Embedding batch returned/
    );
  });
});
