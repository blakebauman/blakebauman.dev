import { describe, expect, it } from 'vitest';
import { resumeData } from '../../chat/data';
import { CASE_STUDIES } from '../../content/case-studies';
import { loader as robotsLoader } from '../../routes/robots.txt';
import {
  caseStudyMarkdown,
  fullMarkdown,
  homeMarkdown,
  markdownFor,
  nodeText,
  prefersMarkdown,
} from '../markdown';

function get(path: string, accept?: string): Response | null {
  const url = new URL(`https://blakebauman.com${path}`);
  return markdownFor(new Request(url, { headers: accept ? { Accept: accept } : {} }), url);
}

describe('prefersMarkdown', () => {
  it('reads what browsers and agents actually send', () => {
    expect(prefersMarkdown(null)).toBe(false);
    expect(prefersMarkdown('text/html,application/xhtml+xml,*/*;q=0.8')).toBe(false);
    expect(prefersMarkdown('text/markdown')).toBe(true);
    expect(prefersMarkdown('text/markdown, text/html;q=0.9')).toBe(true);
    expect(prefersMarkdown('text/html, text/markdown;q=0.5')).toBe(false);
  });
});

describe('markdownFor', () => {
  it('leaves an ordinary browser request to React Router', () => {
    expect(get('/', 'text/html')).toBeNull();
    expect(get('/work/felix')).toBeNull();
    expect(get('/mcp', 'text/markdown')).toBeNull();
  });

  it('serves the home page and each case study by negotiation and by .md', async () => {
    for (const path of ['/', '/index.md']) {
      const res = get(path, path === '/' ? 'text/markdown' : undefined);
      expect(res?.headers.get('Content-Type')).toContain('text/markdown');
      expect(await res?.text()).toContain(`# ${resumeData.name}`);
    }
    for (const study of CASE_STUDIES) {
      const res = get(`/work/${study.slug}.md`);
      expect(res?.status).toBe(200);
      expect(res?.headers.get('Link')).toBe(
        `<https://blakebauman.com/work/${study.slug}>; rel="canonical"`
      );
      expect(get(`/work/${study.slug}`, 'text/markdown')?.status).toBe(200);
    }
  });

  it('404s an unknown .md rather than falling through to the HTML 404', () => {
    expect(get('/work/nope.md')?.status).toBe(404);
  });

  it('carries the content signal and varies on Accept', () => {
    const res = get('/index.md');
    expect(res?.headers.get('Content-Signal')).toContain('search=yes');
    expect(res?.headers.get('Vary')).toBe('Accept');
    expect(Number(res?.headers.get('x-markdown-tokens'))).toBeGreaterThan(0);
  });
});

describe('homeMarkdown', () => {
  const md = homeMarkdown();

  it('opens with frontmatter, the name, and the identity sentence', () => {
    expect(md.startsWith('---\n')).toBe(true);
    expect(md).toContain(`\n# ${resumeData.name}\n`);
    expect(md).toMatch(/\n> Blake Bauman is a Principal Technical Architect/);
  });

  it('carries every role and every listed project, and honours listed: false', () => {
    for (const role of resumeData.experience) expect(md).toContain(role.company);
    for (const project of resumeData.projects) {
      if (project.listed === false) expect(md).not.toContain(`### ${project.name}`);
      else expect(md).toContain(`### ${project.name}`);
    }
  });
});

describe('caseStudyMarkdown', () => {
  it('carries every section, and code excerpts as plain text', () => {
    for (const study of CASE_STUDIES) {
      const md = caseStudyMarkdown(study);
      for (const section of study.sections) expect(md).toContain(`## ${section.heading}`);
      expect(md).not.toMatch(/<span|\[object Object\]/);
    }
  });

  it('flattens highlighted code to its text', () => {
    expect(nodeText(['a', 1, null, false, { type: 'x' } as unknown as string])).toBe('a1');
  });
});

describe('fullMarkdown', () => {
  it('is the home page followed by every case study', () => {
    const md = fullMarkdown();
    for (const study of CASE_STUDIES) expect(md).toContain(`\n# ${study.name}\n`);
  });
});

describe('robots.txt', () => {
  it('declares a content signal and names the answer-engine crawlers', async () => {
    const text = await (robotsLoader() as Response).text();
    expect(text).toMatch(/^Content-Signal: search=yes, ai-input=yes, ai-train=yes$/m);
    for (const agent of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'OAI-SearchBot']) {
      expect(text).toContain(`User-agent: ${agent}`);
    }
    expect(text).toContain('Sitemap: https://blakebauman.com/sitemap.xml');
  });
});
