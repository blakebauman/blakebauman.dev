import { describe, expect, it, vi } from 'vitest';
import type { Env, ResumeData, VectorMatch } from '../../types';
import {
  buildFullResumeContext,
  RETRIEVAL_CONFIG,
  searchResumeContext,
  selectMatches,
  toSources,
} from '../context';
import resumeJson from '../resume.json';

const resumeData = resumeJson as unknown as ResumeData;

/**
 * Every chunk type written by buildChunks has to be rendered by
 * searchResumeContext. Matches are grouped by `metadata.type` and then rendered
 * by looking up SECTION_LABELS, so a type missing from that table is retrieved
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

interface MatchSpec {
  id: string;
  type: string;
  text: string;
  score?: number;
  title?: string;
  sourceId?: string;
  section?: string;
}

function rawMatch(spec: MatchSpec): VectorMatch {
  return {
    id: spec.id,
    score: spec.score ?? 0.9,
    metadata: {
      type: spec.type,
      section: spec.section ?? spec.type,
      text: spec.text,
      title: spec.title ?? spec.id,
      sourceId: spec.sourceId ?? spec.id,
    },
  } as VectorMatch;
}

function envReturning(matches: MatchSpec[]): Env {
  return {
    AI: { run: vi.fn().mockResolvedValue({ data: [[0.1, 0.2, 0.3]] }) },
    VECTORIZE: {
      query: vi.fn().mockResolvedValue({ matches: matches.map(rawMatch) }),
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
      resumeData
    );

    const dropped = INDEXED_TYPES.filter(
      t => !relevantSections.includes(`MARKER_${t.toUpperCase()}`)
    );
    expect(dropped, `chunk types retrieved but never rendered: ${dropped.join(', ')}`).toEqual([]);
  });

  it('surfaces the chat-only ai_context layer', async () => {
    const { relevantSections } = await searchResumeContext(
      envReturning([
        {
          id: 'ai_context_felix-harness',
          type: 'ai_context',
          text: 'Felix Memoturn Fold Skillist',
        },
      ]),
      'what agent infrastructure has he built',
      resumeData
    );

    expect(relevantSections).toContain('Felix Memoturn Fold Skillist');
  });

  it('exposes skills through relevantSkills rather than a section', async () => {
    const { relevantSkills } = await searchResumeContext(
      envReturning([{ id: 'skills', type: 'skills', text: 'irrelevant' }]),
      'what does he know',
      resumeData
    );

    expect(RENDERED_SEPARATELY).toContain('skills');
    expect(relevantSkills.length).toBeGreaterThan(0);
  });

  it('returns only the matched tool groups, not the whole skill list', async () => {
    const { relevantSkills } = await searchResumeContext(
      envReturning([
        {
          id: 'tools_native-desktop',
          type: 'tools',
          title: 'Tools and technologies — Native & Desktop',
          text: 'C++, JUCE, CMake, Tauri, DSP',
        },
      ]),
      'does he write c++',
      resumeData
    );

    expect(relevantSkills).toContain('JUCE');
    expect(relevantSkills.length).toBeLessThan(resumeData.skills.length);
  });

  it('reports the matches and sources that grounded the answer', async () => {
    const { matches, sources } = await searchResumeContext(
      envReturning([
        {
          id: 'project_felix',
          type: 'projects',
          title: 'Project: felix',
          sourceId: 'felix',
          text: 'a',
        },
        {
          id: 'project_felix_highlights_0',
          type: 'projects',
          title: 'Project: felix — what it does',
          sourceId: 'felix',
          text: 'b',
        },
      ]),
      'tell me about felix',
      resumeData
    );

    expect(matches).toHaveLength(2);
    // Both chunks describe the same project, so they cite as one source.
    expect(sources).toEqual([{ label: 'Projects', title: 'Project: felix' }]);
  });

  it('falls back to the full record when the vector query throws', async () => {
    const env = {
      AI: { run: vi.fn().mockResolvedValue({ data: [[0.1]] }) },
      VECTORIZE: { query: vi.fn().mockRejectedValue(new Error('index unavailable')) },
    } as unknown as Env;

    const { relevantSections } = await searchResumeContext(env, 'anything', resumeData, [
      'AI CONTEXT FALLBACK MARKER',
    ]);

    expect(relevantSections).toContain('Experience:');
    // The fallback previously omitted recognition and the ai-context layer, so
    // the same question got a different answer depending on Vectorize's health.
    expect(relevantSections).toContain('Recognition:');
    expect(relevantSections).toContain('AI CONTEXT FALLBACK MARKER');
  });
});

describe('selectMatches', () => {
  it('drops matches below the score floor', () => {
    const selected = selectMatches([
      rawMatch({ id: 'strong', type: 'projects', text: 'keep', score: 0.8 }),
      rawMatch({ id: 'weak', type: 'projects', text: 'drop', score: 0.05 }),
    ]);

    expect(selected.map(m => m.id)).toEqual(['strong']);
  });

  it('keeps the top matches when everything is below the floor', () => {
    // An empty context reads to the model as permission to invent, so a weak
    // best match still beats nothing.
    const weak = Array.from({ length: 6 }, (_, i) =>
      rawMatch({ id: `weak_${i}`, type: 'projects', text: 'x', score: 0.1 - i * 0.01 })
    );

    expect(selectMatches(weak)).toHaveLength(RETRIEVAL_CONFIG.alwaysKeepTop);
  });

  it('drops matches whose metadata does not validate', () => {
    // Mimics a vector left behind by an older schema. Before runtime validation
    // this flowed straight into the system prompt.
    const malformed = {
      id: 'bad',
      score: 0.9,
      metadata: { type: 'not_a_real_type', text: 'x' },
    } as unknown as VectorMatch;
    const good = rawMatch({ id: 'good', type: 'projects', text: 'y' });

    expect(selectMatches([malformed, good]).map(m => m.id)).toEqual(['good']);
  });

  it('deduplicates by id', () => {
    const match = rawMatch({ id: 'project_felix', type: 'projects', text: 'x' });
    expect(selectMatches([match, match])).toHaveLength(1);
  });

  it('stops filling once the character budget is exhausted', () => {
    const big = Array.from({ length: 10 }, (_, i) =>
      rawMatch({
        id: `big_${i}`,
        type: 'projects',
        text: 'x'.repeat(1000),
        score: 0.9 - i * 0.01,
      })
    );

    const selected = selectMatches(big);
    const total = selected.reduce((sum, m) => sum + m.text.length, 0);
    expect(total).toBeLessThanOrEqual(RETRIEVAL_CONFIG.maxContextChars);
    expect(selected.length).toBeLessThan(big.length);
  });

  it('returns matches in descending score order', () => {
    // Both above MIN_SCORE, so ordering is what is under test rather than the floor.
    const selected = selectMatches([
      rawMatch({ id: 'low', type: 'projects', text: 'a', score: 0.6 }),
      rawMatch({ id: 'high', type: 'projects', text: 'b', score: 0.95 }),
    ]);

    expect(selected.map(m => m.id)).toEqual(['high', 'low']);
  });

  it('uses a floor calibrated above the noise of unrelated queries', () => {
    // Measured against the live index: unrelated prompts top out around 0.54,
    // correct hits bottom out around 0.58. A match scoring like an unrelated
    // query must not reach the prompt.
    expect(RETRIEVAL_CONFIG.minScore).toBeGreaterThan(0.54);
    expect(RETRIEVAL_CONFIG.minScore).toBeLessThan(0.58);
  });
});

describe('toSources', () => {
  it('keeps titles that legitimately contain an em dash', () => {
    // Splitting on the first ' — ' turned "Tools and technologies — AI & Agents"
    // into a useless "Tools and technologies" chip.
    const matches = selectMatches([
      rawMatch({
        id: 'tools_ai-agents',
        type: 'tools',
        title: 'Tools and technologies — AI & Agents',
        sourceId: 'tools',
        text: 'a',
      }),
    ]);

    expect(toSources(matches)[0]?.title).toBe('Tools and technologies — AI & Agents');
  });

  it('caps the number of citations', () => {
    const matches = selectMatches(
      Array.from({ length: 10 }, (_, i) =>
        rawMatch({
          id: `project_${i}`,
          type: 'projects',
          title: `Project ${i}`,
          sourceId: `p${i}`,
          text: 'x',
          score: 0.9 - i * 0.01,
        })
      )
    );

    expect(toSources(matches).length).toBeLessThanOrEqual(4);
  });

  it('collapses several chunks of one entity into a single citation', () => {
    const matches = selectMatches([
      rawMatch({
        id: 'experience_adobe_2022-present',
        type: 'experience',
        title: 'Principal Technical Architect at Adobe (2022–Present)',
        sourceId: 'adobe_2022-present',
        text: 'a',
      }),
      rawMatch({
        id: 'experience_adobe_2022-present_highlights_0',
        type: 'experience',
        title: 'Principal Technical Architect at Adobe (2022–Present) — accomplishments',
        sourceId: 'adobe_2022-present',
        text: 'b',
      }),
    ]);

    expect(toSources(matches)).toEqual([
      {
        label: 'Relevant Experience',
        title: 'Principal Technical Architect at Adobe (2022–Present)',
      },
    ]);
  });
});

describe('buildFullResumeContext', () => {
  it('includes project and experience highlights', () => {
    const { relevantSections } = buildFullResumeContext(resumeData);
    const firstHighlight = resumeData.experience[0]?.highlights?.[0];

    expect(firstHighlight).toBeTruthy();
    expect(relevantSections).toContain(firstHighlight as string);
  });
});
