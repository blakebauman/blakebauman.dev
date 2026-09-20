import { describe, expect, it } from 'vitest';
import { listTools } from '../../agent/tools';
import { resumeData } from '../../chat/data';
import { CASE_STUDIES } from '../../content/case-studies';
import { loader } from '../llms.txt';

async function body(): Promise<string> {
  return (loader() as Response).text();
}

describe('llms.txt', () => {
  it('is served as plain text and cached', async () => {
    const response = loader() as Response;
    expect(response.headers.get('Content-Type')).toContain('text/plain');
    expect(response.headers.get('Cache-Control')).toContain('max-age');
  });

  it('opens the way the convention expects: an H1 and a summary blockquote', async () => {
    const text = await body();
    expect(text.startsWith(`# ${resumeData.name}\n`)).toBe(true);
    expect(text).toMatch(/\n> /);
  });

  /**
   * The whole reason this file exists. There is no `.well-known` discovery
   * standard for MCP servers, so this and the colophon line are the only
   * pointers to the endpoint that exist.
   */
  it('names the MCP endpoint and how to speak to it', async () => {
    const text = await body();
    expect(text).toContain('https://blakebauman.com/mcp');
    expect(text).toContain('JSON-RPC');
    expect(text).toContain('read-only');
  });

  /**
   * Generated from the registry, not written out, so it cannot advertise a tool
   * the server does not have — or miss one it does.
   */
  it('lists every tool the server actually serves', async () => {
    const text = await body();
    for (const tool of listTools()) {
      expect(text).toContain(`\`${tool.name}\``);
    }
  });

  it('links every case study', async () => {
    const text = await body();
    for (const study of CASE_STUDIES) {
      expect(text).toContain(`https://blakebauman.com/work/${study.slug}`);
    }
  });

  /**
   * `listed: false` keeps a project off the rendered page. This file is the
   * page's machine-readable equivalent, so it honours the same decision.
   */
  it('respects the listed flag', async () => {
    const text = await body();
    const unlisted = resumeData.projects.find(p => p.listed === false);
    const listed = resumeData.projects.find(p => p.listed !== false);
    if (listed) expect(text).toContain(listed.name);
    if (unlisted) expect(text).not.toContain(`- ${unlisted.name} (`);
  });

  it('carries every role', async () => {
    const text = await body();
    for (const role of resumeData.experience) {
      expect(text).toContain(role.company);
    }
  });
});
