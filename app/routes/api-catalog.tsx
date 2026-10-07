import { SITE_URL } from '../lib/seo';

/**
 * `/.well-known/api-catalog` (RFC 9727): a linkset naming the APIs this site
 * publishes. It is a general API-discovery standard, not an MCP one — there is
 * still no `.well-known` for MCP servers — but it is the registered place an
 * agent looks for "what can I call here", and the one API here is /mcp.
 */
export const API_CATALOG_TYPE =
  'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"';

export function apiCatalog() {
  return {
    linkset: [
      {
        anchor: `${SITE_URL}/mcp`,
        'service-doc': [
          { href: `${SITE_URL}/llms.txt`, type: 'text/markdown', title: 'MCP endpoint and tools' },
        ],
      },
    ],
  };
}

export function loader() {
  return new Response(JSON.stringify(apiCatalog(), null, 2), {
    headers: {
      'Content-Type': API_CATALOG_TYPE,
      'Cache-Control': 'public, max-age=86400',
      Link: `<${SITE_URL}/.well-known/api-catalog>; rel="api-catalog"`,
    },
  });
}
