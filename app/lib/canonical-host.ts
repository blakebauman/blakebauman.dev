/**
 * blakebauman.dev is the former primary domain. Both it and www are still bound
 * to the Worker (see the routes in wrangler.jsonc) so every old link resolves
 * rather than dying at DNS, and every one of them is sent here permanently.
 *
 * This lives outside workers/app.ts so it can be tested without pulling in the
 * React Router server build, which only exists after a production build.
 */

const LEGACY_HOST = 'blakebauman.dev';
const PRIMARY_HOST = 'blakebauman.com';

function isLegacyHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === LEGACY_HOST || host.endsWith(`.${LEGACY_HOST}`);
}

/**
 * Returns a permanent redirect to the canonical host, or null when the request
 * already arrived on one this site serves.
 *
 * The status code is not cosmetic. A 301 is what search engines consolidate
 * ranking signals on, but it permits a client to downgrade a POST to a GET,
 * which would silently turn a JSON-RPC call to /mcp into a body-less GET and a
 * 405. So GET and HEAD — everything a crawler issues — get the 301, and
 * anything that can carry a body gets a 308, which preserves the method.
 */
export function canonicalHostRedirect(url: URL, request: Request): Response | null {
  if (!isLegacyHost(url.hostname)) return null;

  // Path and query ride along untouched: the point of keeping the old domain
  // bound is that a deep link still lands where it pointed.
  const target = new URL(url);
  // www and the apex both resolve to the bare apex. The canonical host is one
  // value, not whichever subdomain the visitor happened to arrive on.
  target.hostname = PRIMARY_HOST;

  const status = request.method === 'GET' || request.method === 'HEAD' ? 301 : 308;

  return new Response(null, {
    status,
    headers: {
      Location: target.toString(),
      // Caches key on the full URL, host included, so this is safe to cache.
      // Bounded rather than immutable in case the .dev domain is repurposed.
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
