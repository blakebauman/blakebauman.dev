import { describe, expect, it } from 'vitest';
import type { ResumeContext } from '../../chat/context';
import { resumeData } from '../../chat/data';
import { checkTopicRelevance, REDIRECT_MESSAGE } from '../../chat/guardrails';
import { buildChatMessages } from '../../chat/prompt';
import { buildAgentSystemMessage } from '../prompt';

/**
 * "Can I query this programmatically?" is the question the MCP server exists to
 * answer, asked by the one visitor already talking to the thing that can answer
 * it. In production it came back as the off-topic redirect — and it came back
 * that way *after* get_profile had run and returned the endpoint.
 *
 * There are two gates, and only the first one is famous. The topic guardrail
 * runs before any model call, and it was fixed when /mcp shipped by adding
 * topic tags to the ai-context entry. The second gate is the system prompt's
 * own scope sentence: it said "work experience, skills, and projects, and
 * nothing else", and a question about the record itself is none of those. The
 * model obeyed, called the tool, read the answer, and redirected anyway.
 *
 * So both gates are tested here, together, because passing one and failing the
 * other produces exactly the bug that shipped: a tool call whose result is
 * discarded.
 */

const PHRASINGS = [
  'Can I query this programmatically?',
  'Do you have an API?',
  'How do I connect this to Claude?',
  'Is there an MCP server for this site?',
  'Can my agent read this?',
  'How would I point a client at this record?',
];

describe('questions about querying the record', () => {
  describe('the topic guardrail lets them through', () => {
    for (const prompt of PHRASINGS) {
      it(`passes: ${prompt}`, () => {
        // A refusal here is one no tool can recover from: it runs before any
        // model call, so the assistant never gets the chance to answer.
        expect(checkTopicRelevance({ prompt, conversationHistory: [] })).toBeNull();
      });
    }
  });

  describe('the agent prompt puts the record itself in scope', () => {
    const system = buildAgentSystemMessage(resumeData).content;

    it('says so in the scope sentence, not only in a later rule', () => {
      // The opening sentence is the one the model weighs when deciding whether
      // a question is in scope at all. A carve-out further down did not save it.
      const opening = system.slice(0, system.indexOf('\n'));
      expect(opening).toMatch(/this record itself/i);
      expect(opening).toMatch(/programmatic/i);
    });

    it('routes these questions to get_profile', () => {
      expect(system).toMatch(/get_profile/);
      const toolSection = system.slice(system.indexOf('CHOOSING A TOOL:'));
      expect(toolSection).toMatch(/MCP|API|endpoint/);
    });

    it('tells the model not to redirect them', () => {
      expect(system).toMatch(/Do not redirect them/i);
    });

    it('still redirects a genuinely unrelated subject', () => {
      // Widening scope must not cost the guardrail its teeth; the redirect
      // instruction has to survive.
      expect(system).toContain(REDIRECT_MESSAGE);
      expect(system).toMatch(/genuinely unrelated to Blake/);
    });
  });

  describe('the retrieval prompt agrees, because the loop falls back to it', () => {
    // tryAgentLoop returns null rather than throwing, and /api/chat then answers
    // from retrieval. If only the agent prompt were widened, a broken loop would
    // bring the refusal straight back.
    const emptyContext: ResumeContext = {
      relevantSkills: [],
      relevantSections: '',
      matches: [],
      sources: [],
    };
    const system =
      buildChatMessages(resumeData, emptyContext, [], 'Do you have an API?')[0]?.content ?? '';

    it('puts the record itself in its scope sentence too', () => {
      const opening = system.slice(0, system.indexOf('\n'));
      expect(opening).toMatch(/this record itself/i);
    });

    it('tells the model to answer from the context rather than redirect', () => {
      expect(system).toMatch(/answer from it rather than redirecting/i);
    });

    it('still redirects a genuinely unrelated subject', () => {
      expect(system).toContain(REDIRECT_MESSAGE);
    });
  });
});
