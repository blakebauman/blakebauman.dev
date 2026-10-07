import { CONTENT_SIGNAL, SITE_URL } from '../lib/seo';

/**
 * Crawlers that feed search and answer engines, named so the intent is
 * explicit rather than inherited from `*`. An agent that sees itself named
 * with `Allow` does not have to guess, and Cloudflare's managed AI-bot block,
 * if it is ever switched on, is visibly contradicting this file rather than
 * silently agreeing with an absence.
 */
export const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'CCBot',
];

export function loader() {
  // Content-Signal is per contentsignals.org: how the content may be used once
  // fetched, which Allow/Disallow cannot express. /api/ is POST-only or
  // admin-gated, so there is nothing there for a crawler to read.
  //
  // llms.txt has no robots.txt directive, so it is a comment rather than a
  // field a crawler will parse. It is here because this is the file people
  // look in for "what else does this site publish".
  const robots = `User-agent: *
Content-Signal: ${CONTENT_SIGNAL}
Allow: /
Disallow: /api/

${AI_CRAWLERS.map(agent => `User-agent: ${agent}`).join('\n')}
Allow: /
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml

# LLM index: ${SITE_URL}/llms.txt
# Full record as markdown: ${SITE_URL}/llms-full.txt
# Any page as markdown: append .md, or send Accept: text/markdown
# MCP endpoint: ${SITE_URL}/mcp (JSON-RPC over POST, read-only)
# API catalog: ${SITE_URL}/.well-known/api-catalog
`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
