export function loader() {
  // llms.txt has no standard robots.txt directive, so it is a comment rather
  // than a field a crawler will parse. It is here because this is the file
  // people look in for "what else does this site publish", and because a
  // comment costs nothing if nothing reads it.
  const robots = `User-agent: *
Allow: /

Sitemap: https://blakebauman.dev/sitemap.xml

# LLM index: https://blakebauman.dev/llms.txt
# MCP endpoint: https://blakebauman.dev/mcp (JSON-RPC over POST, read-only)
`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
