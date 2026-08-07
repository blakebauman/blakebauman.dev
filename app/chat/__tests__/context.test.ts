import { describe, expect, it, vi } from 'vitest';
import type { Env, ResumeData } from '../../types';
import { searchResumeContext } from '../context';
import resumeData from '../resume.json';

/**
 * Every chunk type written by populateVectorizeIndex has to be rendered by
 * searchResumeContext. Matches are grouped by `metadata.type` and then rendered
 * by walking SECTION_LABELS, so a type missing from that table is retrieved
 * from Vectorize and then silently discarded.
 *
 * That is exactly what happened to `ai_context` and `recognition`: the whole
 * chat-only context layer was embedded, matched at the top of the results, and
 * never reached the model. The failure is invisible without a test like this,
 * because retrieval still "works" and the assistant just answers as if the
 * information does not exist.
 */
const INDEXED_TYPES = [
  'personal',
  'summary',
  'tools',
  'exploring',
  'projects',
  'experience',
  'recognition',
  'ai_context',
] as const;

// `skills` is written by the indexer but intentionally not rendered as a
// section: it is surfaced through relevantSkills instead. Asserted separately.
const RENDERED_SEPARATELY = ['skills'] as const;

function envReturning(matches: Array<{ id: string; type: string; text: string }>): Env {
  return {
    AI: { run: vi.fn().mockResolvedValue({ data: [[0.1, 0.2, 0.3]] }) },
    VECTORIZE: {
      query: vi.fn().mockResolvedValue({
        matches: matches.map(m => ({
          id: m.id,
          score: 0.9,
          metadata: { type: m.type, text: m.text },
        })),
      }),
    },
  } as unknown as Env;
}

describe('searchResumeContext', () => {
  it('renders every indexed chunk type into the prompt context', async () => {
    const matches = INDEXED_TYPES.map(type => ({
      id: `${type}_0`,
      type,
      text: `MARKER_${type.toUpperCase()}`,
    }));

    const { relevantSections } = await searchResumeContext(
      envReturning(matches),
      'anything',
      resumeData as unknown as ResumeData
    );

    const dropped = INDEXED_TYPES.filter(
      t => !relevantSections.includes(`MARKER_${t.toUpperCase()}`)
    );
    expect(dropped, `chunk types retrieved but never rendered: ${dropped.join(', ')}`).toEqual([]);
  });

  it('surfaces the chat-only ai_context layer', async () => {
    const { relevantSections } = await searchResumeContext(
      envReturning([
        { id: 'ai_context_ai-focus', type: 'ai_context', text: 'Felix Memoturn Fold Skillist' },
      ]),
      'what agent infrastructure has he built',
      resumeData as unknown as ResumeData
    );

    expect(relevantSections).toContain('Felix Memoturn Fold Skillist');
  });

  it('exposes skills through relevantSkills rather than a section', async () => {
    const { relevantSkills } = await searchResumeContext(
      envReturning([{ id: 'skills', type: 'skills', text: 'irrelevant' }]),
      'what does he know',
      resumeData as unknown as ResumeData
    );

    expect(RENDERED_SEPARATELY).toContain('skills');
    expect(relevantSkills.length).toBeGreaterThan(0);
  });
});
