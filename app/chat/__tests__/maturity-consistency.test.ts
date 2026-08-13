import { describe, expect, it } from 'vitest';
import { aiContext, resumeData } from '../data';

/**
 * The maturity of a project is asserted in two places: the `maturity` field on
 * each project, and the prose of the `scope-production-vs-prototype` entry that
 * the assistant leans on when asked "is this production-ready?".
 *
 * They are written by hand and can drift. When they do, the assistant
 * contradicts itself — citing the scope entry to call something a prototype
 * while the project chunk it also retrieved says production. That is worse than
 * either answer alone, because it destroys confidence in both.
 *
 * This test keeps them honest.
 */

const SCOPE_ID = 'scope-production-vs-prototype';

const SECTION_MARKERS: Array<[maturity: string, marker: string]> = [
  ['production', 'Deployed and in use:'],
  ['prototype', 'Working prototypes and early-stage:'],
  ['reference', 'References and templates rather than products:'],
];

const END_MARKER = 'If asked whether something is';

function scopeSections(text: string): Record<string, string> {
  const bounds = SECTION_MARKERS.map(([maturity, marker]) => {
    const start = text.indexOf(marker);
    return { maturity, marker, start };
  });

  for (const b of bounds) {
    expect(b.start, `scope entry is missing the "${b.marker}" section`).toBeGreaterThan(-1);
  }

  const sections: Record<string, string> = {};
  bounds.forEach((b, i) => {
    const next = bounds[i + 1]?.start ?? text.indexOf(END_MARKER);
    sections[b.maturity] = text.slice(b.start + b.marker.length, next);
  });
  return sections;
}

/**
 * Matches a project name but not a longer name that merely starts with it —
 * "memoturn" must not match inside "memoturn-db", which has a different label.
 */
function mentions(haystack: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}-])${escaped}(?![\\p{L}\\p{N}-])`, 'iu').test(haystack);
}

describe('maturity labels and the scope entry agree', () => {
  const scope = aiContext.context.find(e => e.id === SCOPE_ID);

  it('the scope entry exists', () => {
    expect(scope, `ai-context.json must contain "${SCOPE_ID}"`).toBeTruthy();
  });

  const sections = scopeSections(scope?.text ?? '');

  it.each(
    SECTION_MARKERS.map(([maturity]) => maturity)
  )('no project labelled otherwise is listed under %s', maturity => {
    const wronglyListed = resumeData.projects
      .filter(p => p.maturity && p.maturity !== maturity)
      .filter(p => mentions(sections[maturity] as string, p.name))
      .map(p => `${p.name} (labelled ${p.maturity})`);

    expect(
      wronglyListed,
      `listed under "${maturity}" in ${SCOPE_ID} but labelled differently: ${wronglyListed.join(', ')}`
    ).toEqual([]);
  });

  it('every project named in the scope entry is named in the section matching its label', () => {
    const misplaced: string[] = [];

    for (const project of resumeData.projects) {
      if (!project.maturity) continue;
      const namedIn = SECTION_MARKERS.map(([m]) => m).filter(m =>
        mentions(sections[m] as string, project.name)
      );
      if (namedIn.length && !namedIn.includes(project.maturity)) {
        misplaced.push(
          `${project.name}: labelled ${project.maturity}, listed under ${namedIn.join('/')}`
        );
      }
    }

    expect(misplaced, misplaced.join('; ')).toEqual([]);
  });

  it('distinguishes memoturn from memoturn-db, which carry different labels', () => {
    // The regression this guards: a substring match would find "memoturn" inside
    // "memoturn-db" and silently pass a genuine contradiction.
    const platform = resumeData.projects.find(p => p.name === 'memoturn');
    const db = resumeData.projects.find(p => p.name === 'memoturn-db');

    expect(platform?.maturity).toBe('production');
    expect(db?.maturity).toBe('prototype');
    expect(mentions('Memoturn is deployed', 'memoturn')).toBe(true);
    expect(mentions('memoturn-db is a prototype', 'memoturn')).toBe(false);
  });
});
