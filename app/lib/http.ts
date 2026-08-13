/**
 * Compares two strings without leaking their difference through timing.
 *
 * Both sides are hashed first, which makes the comparison fixed-length —
 * a plain `!==` on secrets of different lengths returns early and tells an
 * attacker how much of a guessed prefix was correct.
 */
export async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);

  const bytesA = new Uint8Array(digestA);
  const bytesB = new Uint8Array(digestB);
  let difference = 0;
  for (let i = 0; i < bytesA.length; i += 1) {
    difference |= (bytesA[i] as number) ^ (bytesB[i] as number);
  }
  return difference === 0;
}

/**
 * Extracts a bearer token, requiring the scheme to be an actual prefix.
 *
 * `authHeader.replace('Bearer ', '')` — the previous approach — strips the
 * substring from anywhere in the header, so "xBearer token" and "tokenBearer "
 * both parse to something.
 */
export function parseBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Checks a bearer token against a configured secret. Returns false when the
 * secret is unset, so a missing binding fails closed rather than open.
 */
export async function isAuthorized(
  authHeader: string | null,
  secret: string | undefined
): Promise<boolean> {
  if (!secret) return false;
  const token = parseBearerToken(authHeader);
  if (!token) return false;
  return constantTimeEqual(token, secret);
}

export function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/**
 * Logs the real error and returns one that says nothing useful to a caller.
 *
 * The id is the join: it goes to the client and into the log line, so a report
 * of "I got an error, id abc123" can be traced without the error text itself
 * ever describing which binding is misconfigured or which query failed.
 */
export function serverErrorResponse(
  scope: string,
  error: unknown,
  headers: Record<string, string> = {},
  message = 'Something went wrong. Please try again.'
): Response {
  const requestId = crypto.randomUUID();
  console.error(`[${scope}] requestId=${requestId}`, error);
  return jsonResponse({ error: message, requestId }, 500, headers);
}
