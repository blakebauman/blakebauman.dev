import { describe, expect, it } from 'vitest';
import { resumeData } from '../../chat/data';
import { CASE_STUDIES } from '../../content/case-studies';
import { caseStudyGraph, homeGraph, markdownPath, pageMeta, sameAs } from '../seo';

type Descriptor = Record<string, unknown>;

function count(meta: Descriptor[], predicate: (d: Descriptor) => boolean): number {
  return meta.filter(predicate).length;
}

describe('pageMeta', () => {
  const meta = pageMeta({
    title: 'T',
    description: 'D',
    path: '/work/felix',
    type: 'article',
  }) as Descriptor[];

  /**
   * The regression this module exists for: root.tsx and the route both emitted
   * these, so every case study shipped two descriptions, two og:types, and a
   * canonical pointing at the home page.
   */
  it('emits exactly one of each tag that must be unique', () => {
    expect(count(meta, d => 'title' in d)).toBe(1);
    expect(count(meta, d => d.name === 'description')).toBe(1);
    expect(count(meta, d => d.rel === 'canonical')).toBe(1);
    expect(count(meta, d => d.property === 'og:type')).toBe(1);
    expect(count(meta, d => d.property === 'og:url')).toBe(1);
  });

  it('is self-canonical, not canonical to the home page', () => {
    const canonical = meta.find(d => d.rel === 'canonical');
    expect(canonical?.href).toBe('https://blakebauman.com/work/felix');
    expect(meta.find(d => d.property === 'og:url')?.content).toBe(
      'https://blakebauman.com/work/felix'
    );
  });

  it('points at the markdown twin', () => {
    const alt = meta.find(d => d.rel === 'alternate');
    expect(alt?.type).toBe('text/markdown');
    expect(alt?.href).toBe('https://blakebauman.com/work/felix.md');
  });

  it('carries a large image card', () => {
    expect(meta.find(d => d.property === 'og:image')?.content).toMatch(/\/og\.png$/);
    expect(meta.find(d => d.name === 'twitter:card')?.content).toBe('summary_large_image');
  });
});

describe('markdownPath', () => {
  it('maps the home page to index.md and other paths to <path>.md', () => {
    expect(markdownPath('/')).toBe('/index.md');
    expect(markdownPath('/work/fold')).toBe('/work/fold.md');
  });
});

describe('homeGraph', () => {
  const graph = homeGraph()['@graph'] as Descriptor[];
  const person = graph.find(n => n['@type'] === 'Person') as Descriptor;

  it('ties Person, WebSite and ProfilePage together by @id', () => {
    const profile = graph.find(n => n['@type'] === 'ProfilePage') as Descriptor;
    const site = graph.find(n => n['@type'] === 'WebSite') as Descriptor;
    expect(person['@id']).toBe('https://blakebauman.com/#person');
    expect(profile.mainEntity).toEqual({ '@id': person['@id'] });
    expect(site.publisher).toEqual({ '@id': person['@id'] });
  });

  /** sameAs is what lets a knowledge graph merge this page with the profiles. */
  it('lists every profile as sameAs', () => {
    expect(person.sameAs).toEqual(sameAs());
    expect(person.sameAs).toContain(resumeData.linkedin);
    expect(person.sameAs).toContain(resumeData.github);
  });

  it('describes the person in one identifying sentence', () => {
    expect(person.description).toMatch(/^Blake Bauman is a Principal Technical Architect at /);
    expect(person.jobTitle).toBe(resumeData.title);
  });
});

describe('caseStudyGraph', () => {
  it('attributes every case study to the same person @id', () => {
    for (const study of CASE_STUDIES) {
      const graph = caseStudyGraph(study)['@graph'] as Descriptor[];
      const article = graph.find(n => n['@type'] === 'TechArticle') as Descriptor;
      expect(article.author).toEqual({ '@id': 'https://blakebauman.com/#person' });
      expect(article.url).toBe(`https://blakebauman.com/work/${study.slug}`);
      expect(article.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
