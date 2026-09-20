import { describe, expect, it } from 'vitest';
import { canonicalHostRedirect } from '../canonical-host';

function redirectFor(url: string, method = 'GET'): Response | null {
  return canonicalHostRedirect(new URL(url), new Request(url, { method }));
}

describe('canonicalHostRedirect', () => {
  it('sends the old apex to the new one', () => {
    const response = redirectFor('https://blakebauman.dev/');
    expect(response?.status).toBe(301);
    expect(response?.headers.get('Location')).toBe('https://blakebauman.com/');
  });

  it('collapses www onto the bare apex rather than www of the new domain', () => {
    const response = redirectFor('https://www.blakebauman.dev/');
    expect(response?.headers.get('Location')).toBe('https://blakebauman.com/');
  });

  /**
   * The reason the old domain stays bound to the Worker at all. A deep link
   * that drops its path is a dead link with extra steps.
   */
  it('carries the path and query across', () => {
    const response = redirectFor('https://blakebauman.dev/work/felix?ref=news');
    expect(response?.headers.get('Location')).toBe('https://blakebauman.com/work/felix?ref=news');
  });

  /**
   * A 301 lets a client re-issue a POST as a GET. On /mcp that turns a JSON-RPC
   * call into a body-less GET and a 405, which looks like a broken server
   * rather than a moved one.
   */
  it('preserves the method for requests that can carry a body', () => {
    expect(redirectFor('https://blakebauman.dev/mcp', 'POST')?.status).toBe(308);
    expect(redirectFor('https://blakebauman.dev/api/chat', 'POST')?.status).toBe(308);
    expect(redirectFor('https://blakebauman.dev/', 'HEAD')?.status).toBe(301);
  });

  it('matches the host case-insensitively', () => {
    expect(redirectFor('https://BlakeBauman.DEV/')?.status).toBe(301);
  });

  it('leaves the canonical domain and local development alone', () => {
    expect(redirectFor('https://blakebauman.com/work/fold')).toBeNull();
    expect(redirectFor('https://www.blakebauman.com/')).toBeNull();
    expect(redirectFor('http://localhost:5173/')).toBeNull();
  });

  /**
   * Suffix matching on a bare string would also catch notblakebauman.dev, which
   * is a domain someone else can register.
   */
  it('does not match a host that merely ends in the same characters', () => {
    expect(redirectFor('https://notblakebauman.dev/')).toBeNull();
    expect(redirectFor('https://blakebauman.dev.attacker.example/')).toBeNull();
  });
});
