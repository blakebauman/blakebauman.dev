import { describe, expect, it } from 'vitest';
import { CASE_STUDIES } from '../../content/case-studies';
import { aiContext, resumeData } from '../data';

/**
 * A project's release version is asserted in four hand-written places: the case
 * study's `Release` meta, the project's `context` and `highlights` in
 * resume.json, and the ai-context entries the assistant retrieves — including
 * the `scope` entry, which is the anti-hallucination layer.
 *
 * Nothing keeps them in sync, and they drifted. Found in production: the case
 * study displayed v1.14.0 while the assistant, answering from resume.json, said
 * v1.4.1 — a real but ancient tag — and the true latest release was v1.15.0. So
 * a visitor could read one number on the page, ask the assistant and get a
 * second, and neither matched the repository.
 *
 * That is worse than being out of date once. This record's whole claim is that
 * the specifics are real, and a version is the most checkable specific on the
 * page — one `gh release list` away from being falsified by the reader.
 *
 * This test does not know what the right version is; it knows the record has to
 * pick one. The case study's `Release` meta is treated as canonical because it
 * is the value a reader sees rendered.
 */

/** A release-shaped version: v1.15.0, v0.2.0, v1.0. */
const VERSION = /v\d+\.\d+(?:\.\d+)?/g;

/**
 * The frozen API contract is a second, deliberately different version sitting
 * in the same sentence as the release ("v1.15.0 with the API frozen at
 * v1.0.0"). It is a distinct claim, not drift, so it is removed before the
 * remaining versions are compared.
 */
function stripDeliberateVersions(text: string): string {
  return text.replace(/frozen at v\d+\.\d+(?:\.\d+)?/g, '').replace(/frozen at v\d+/g, '');
}

function versionsIn(text: string): string[] {
  return [...stripDeliberateVersions(text).matchAll(VERSION)].map(m => m[0]);
}

/**
 * The clause of a longer entry that talks about this project. The scope entry
 * names every project in one paragraph with a version each, so scanning the
 * whole entry would compare fold's release against felix's.
 */
function clausesMentioning(text: string, name: string): string[] {
  return text.split(/[;.]\s+/).filter(clause => new RegExp(`\\b${name}\\b`, 'i').test(clause));
}

describe('release versions agree across the record', () => {
  const studiesWithRelease = CASE_STUDIES.map(study => ({
    study,
    release: study.meta.find(m => m.k === 'Release')?.v,
  })).filter((entry): entry is { study: (typeof CASE_STUDIES)[number]; release: string } =>
    Boolean(entry.release)
  );

  it('has at least one case study naming a release, or this test is vacuous', () => {
    expect(studiesWithRelease.length).toBeGreaterThan(0);
  });

  for (const { study, release } of studiesWithRelease) {
    describe(`${study.name} (${release})`, () => {
      it('matches the version in its resume.json entry', () => {
        const project = resumeData.projects.find(p => p.name === study.name);
        expect(project, `no resume.json project named ${study.name}`).toBeDefined();
        if (!project) return;

        const text = [project.context ?? '', ...(project.highlights ?? [])].join(' ');
        for (const found of versionsIn(text)) {
          expect(
            found,
            `resume.json says ${found} for ${study.name}; the case study says ${release}`
          ).toBe(release);
        }
      });

      it('matches every version stated about it in the ai-context layer', () => {
        for (const item of aiContext.context) {
          for (const clause of clausesMentioning(item.text, study.name)) {
            for (const found of versionsIn(clause)) {
              expect(
                found,
                `ai-context "${item.id}" says ${found} for ${study.name}; the case study says ${release}`
              ).toBe(release);
            }
          }
        }
      });
    });
  }
});
