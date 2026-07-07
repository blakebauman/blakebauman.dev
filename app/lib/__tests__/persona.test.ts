import { describe, expect, it } from 'vitest';
import {
  chatGreetingFor,
  DEFAULT_CHAT_GREETING,
  DEFAULT_SUGGESTED_PROMPTS,
  derivePersona,
  orderProjects,
  type Persona,
  RETURNING_CHAT_GREETING,
  suggestedPromptsFor,
} from '../persona';

function makeRequest(headers: Record<string, string>): Request {
  return new Request('https://blakebauman.dev/', { headers });
}

function personaWith(overrides: Partial<Persona>): Persona {
  return { referrer: 'direct', device: 'desktop', returning: false, ...overrides };
}

describe('derivePersona', () => {
  it('defaults to direct/desktop/new when no headers are present', () => {
    expect(derivePersona(makeRequest({}))).toEqual({
      referrer: 'direct',
      device: 'desktop',
      returning: false,
    });
  });

  it.each([
    ['https://github.com/someone', 'github'],
    ['https://www.linkedin.com/feed/', 'linkedin'],
    ['https://lnkd.in/abc', 'linkedin'],
    ['https://t.co/xyz', 'social'],
    ['https://bsky.app/profile/x', 'social'],
    ['https://www.google.com/search?q=blake', 'search'],
    ['https://duckduckgo.com/', 'search'],
    ['https://example.com/blog', 'direct'],
    ['not-a-url', 'direct'],
  ])('buckets referer %s as %s', (referer, expected) => {
    expect(derivePersona(makeRequest({ Referer: referer })).referrer).toBe(expected);
  });

  it('detects mobile vs desktop from the user agent', () => {
    const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
    const desktopUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
    expect(derivePersona(makeRequest({ 'User-Agent': mobileUA })).device).toBe('mobile');
    expect(derivePersona(makeRequest({ 'User-Agent': desktopUA })).device).toBe('desktop');
  });

  it('detects returning visitors only when bb_seen=1 is set', () => {
    expect(derivePersona(makeRequest({ Cookie: 'bb_seen=1' })).returning).toBe(true);
    expect(derivePersona(makeRequest({ Cookie: 'foo=bar; bb_seen=1; x=y' })).returning).toBe(true);
    expect(derivePersona(makeRequest({ Cookie: 'other=1' })).returning).toBe(false);
    expect(derivePersona(makeRequest({ Cookie: 'bb_seen=0' })).returning).toBe(false);
  });
});

describe('orderProjects', () => {
  const projects = [
    { name: 'aws-thing', tech: ['Python', 'AWS Bedrock', 'Terraform'] },
    { name: 'edge-thing', tech: ['TypeScript', 'Cloudflare Workers', 'Durable Objects'] },
    { name: 'plain-thing', tech: ['C++', 'CMake'] },
  ];

  it('returns canonical order for direct/unknown referrers', () => {
    const result = orderProjects(projects, personaWith({ referrer: 'direct' }));
    expect(result.map(p => p.name)).toEqual(['aws-thing', 'edge-thing', 'plain-thing']);
  });

  it('front-loads edge/OSS work for github visitors', () => {
    const result = orderProjects(projects, personaWith({ referrer: 'github' }));
    expect(result[0]?.name).toBe('edge-thing');
  });

  it('front-loads enterprise/cloud work for linkedin visitors', () => {
    const result = orderProjects(projects, personaWith({ referrer: 'linkedin' }));
    expect(result[0]?.name).toBe('aws-thing');
  });

  it('is a stable permutation — same set, nothing dropped or duplicated', () => {
    const result = orderProjects(projects, personaWith({ referrer: 'github' }));
    expect(result).toHaveLength(projects.length);
    expect(new Set(result.map(p => p.name))).toEqual(new Set(projects.map(p => p.name)));
  });

  it('does not mutate the input array', () => {
    const input = [...projects];
    orderProjects(input, personaWith({ referrer: 'linkedin' }));
    expect(input.map(p => p.name)).toEqual(['aws-thing', 'edge-thing', 'plain-thing']);
  });
});

describe('chatGreetingFor / suggestedPromptsFor', () => {
  it('returns canonical defaults for direct/unknown referrers', () => {
    const persona = personaWith({ referrer: 'direct' });
    expect(chatGreetingFor(persona)).toBe(DEFAULT_CHAT_GREETING);
    expect(suggestedPromptsFor(persona)).toEqual(DEFAULT_SUGGESTED_PROMPTS);
  });

  it('returns tailored copy for github and linkedin', () => {
    expect(chatGreetingFor(personaWith({ referrer: 'github' }))).not.toBe(DEFAULT_CHAT_GREETING);
    expect(suggestedPromptsFor(personaWith({ referrer: 'linkedin' }))).not.toEqual(
      DEFAULT_SUGGESTED_PROMPTS
    );
  });

  it('greets returning visitors warmly, overriding the referrer greeting', () => {
    expect(chatGreetingFor(personaWith({ returning: true }))).toBe(RETURNING_CHAT_GREETING);
    expect(chatGreetingFor(personaWith({ referrer: 'github', returning: true }))).toBe(
      RETURNING_CHAT_GREETING
    );
  });
});
