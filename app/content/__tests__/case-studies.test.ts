import { describe, expect, it } from 'vitest';
import { CASE_STUDIES } from '../case-studies';

const normalize = (text: string) => text.toLowerCase().replace(/[.:]$/, '');

describe('case-study pull lines', () => {
  it.each(CASE_STUDIES.map(study => [study.slug, study] as const))(
    '%s has one, repeated from its own section',
    (_slug, study) => {
      const pulled = study.sections.filter(section => section.pull);
      expect(pulled).toHaveLength(1);

      const prose = pulled.flatMap(section => [
        ...(section.paragraphs ?? []),
        ...(section.list?.map(item => item.detail) ?? []),
      ]);
      expect(prose.join(' ').toLowerCase()).toContain(normalize(pulled[0]?.pull ?? ''));
    }
  );
});
