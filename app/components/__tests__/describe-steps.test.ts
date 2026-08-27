import { describe, expect, it } from 'vitest';
import { type AgentStep, describeSteps } from '../chatbot-ui';

const step = (tool: string, args: Record<string, unknown> = {}, ok = true): AgentStep => ({
  tool,
  args,
  ok,
});

describe('describeSteps', () => {
  it('reads as a sentence, not a list of function names', () => {
    expect(describeSteps([step('search_record', { query: 'auth' })])).toBe('Searched the record');
  });

  it('joins several calls in the order they happened', () => {
    expect(
      describeSteps([
        step('get_project', { name: 'felix' }),
        step('read_case_study', { slug: 'felix' }),
      ])
    ).toBe('Looked up felix, then read the felix case study');
  });

  it('uses the arguments the model chose, so the line says what was actually read', () => {
    expect(describeSteps([step('list_experience', { company: 'Adobe' })])).toBe(
      'Read the Adobe role'
    );
    expect(describeSteps([step('list_experience')])).toBe('Read the role history');
  });

  /**
   * An assistant that looked and found nothing is telling the truth about the
   * record. Hiding the failed call would make "I don't have that" look like it
   * never checked.
   */
  it('names a call that failed', () => {
    expect(describeSteps([step('search_record', { query: 'x' }, false)])).toBe(
      'Tried to search the record'
    );
  });

  it('renders nothing when no tools ran', () => {
    expect(describeSteps([])).toBe('');
  });

  it('falls back to the tool name rather than dropping an unknown step', () => {
    expect(describeSteps([step('future_tool')])).toBe('Future_tool');
  });
});
