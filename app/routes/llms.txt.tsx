import { listTools } from '../agent/tools';
import { resumeData } from '../chat/data';
import { CASE_STUDIES } from '../content/case-studies';

const ORIGIN = 'https://blakebauman.dev';

/**
 * llms.txt — a markdown index of this site for language models.
 *
 * The convention (llmstxt.org) is the only machine-readable pointer available
 * here: there is no `.well-known` discovery standard for MCP servers. The
 * `.well-known/oauth-protected-resource` endpoints in the MCP spec are auth
 * metadata for authenticated servers, and this one is deliberately
 * unauthenticated, so nothing in the protocol advertises it. Until that
 * changes, discovery is this file plus the line in the colophon.
 *
 * Generated from resume.json, CASE_STUDIES and the tool registry rather than
 * written out, so it cannot describe a set of tools the server does not have.
 */
export function loader() {
  const current = resumeData.experience[0];

  const tools = listTools()
    // First sentence only. This is an index, and a caller that wants the full
    // contract gets it from tools/list, which is authoritative.
    .map(tool => `- \`${tool.name}\` — ${tool.description.split('. ')[0]}.`)
    .join('\n');

  const projects = resumeData.projects
    .filter(project => project.listed !== false)
    .sort((a, b) => (b.lastActivity ?? '').localeCompare(a.lastActivity ?? ''))
    .map(project => {
      const maturity = project.maturity ? ` (${project.maturity})` : '';
      return `- ${project.name}${maturity}: ${project.description}`;
    })
    .join('\n');

  const studies = CASE_STUDIES.map(
    study => `- [${study.name}](${ORIGIN}/work/${study.slug}): ${study.oneLine}`
  ).join('\n');

  const roles = resumeData.experience
    .map(role => `- ${role.role}, ${role.company} (${role.years})`)
    .join('\n');

  const body = `# ${resumeData.name}

> ${resumeData.title}${current ? `, currently at ${current.company}` : ''}. ${resumeData.location}. This site is a professional record: what is listed is what happened, and an absence from it means the record does not say rather than that the answer is no.

## Query this record directly

This site serves a Model Context Protocol endpoint at ${ORIGIN}/mcp.

It speaks Streamable HTTP: JSON-RPC 2.0 over \`POST\`, one request per call, no
batching, no session. It is unauthenticated and read-only, and rate limited per
IP. \`GET\` returns 405 — there is no server-initiated stream.

Tools:

${tools}

Call \`initialize\`, then \`tools/list\` for the full JSON Schema of each.

## Case studies

${studies}

## Projects

${projects}

## Roles

${roles}

## Pages

- [Home](${ORIGIN}/): the full record — roles, projects, and an assistant that answers from it.
- [sitemap.xml](${ORIGIN}/sitemap.xml)
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
