import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownLite } from '../markdown-lite';

describe('MarkdownLite', () => {
  it('renders paragraphs with bold, italic, and inline code', () => {
    const { container } = render(
      <MarkdownLite content={'Blake worked on **edge systems** with *Workers* and `Vectorize`.'} />
    );
    expect(container.querySelector('strong')?.textContent).toBe('edge systems');
    expect(container.querySelector('em')?.textContent).toBe('Workers');
    expect(container.querySelector('code')?.textContent).toBe('Vectorize');
  });

  it('joins consecutive lines into one paragraph and splits on blank lines', () => {
    const { container } = render(<MarkdownLite content={'line one\nline two\n\nsecond para'} />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]?.textContent).toBe('line one line two');
  });

  it('renders links with target _blank and safe protocols only', () => {
    const { container } = render(
      <MarkdownLite content={'[GitHub](https://github.com/test) and [bad](javascript:alert(1))'} />
    );
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('href')).toBe('https://github.com/test');
    expect(links[0]?.getAttribute('rel')).toContain('noopener');
    // Unsafe link renders as plain text, keeping the label
    expect(container.textContent).toContain('bad');
  });

  it('renders unordered and ordered lists', () => {
    const { container } = render(
      <MarkdownLite content={'- alpha\n- beta\n\n1. first\n2. second'} />
    );
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
    expect(container.querySelectorAll('ol li')).toHaveLength(2);
  });

  // An answer renders inside the "Ask the resume" section, whose own heading is
  // an h2. Emitting h1/h2 from markdown there would break the page's heading
  // order, so the three markdown levels are demoted to h3/h4/h5. Deeper markdown
  // headings still collapse into the third slot.
  it('demotes markdown headings to h3/h4/h5 so the page outline stays valid', () => {
    const { container } = render(<MarkdownLite content={'# Title\n## Sub\n#### Deep'} />);
    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelector('h2')).toBeNull();
    expect(container.querySelector('h3')?.textContent).toBe('Title');
    expect(container.querySelector('h4')?.textContent).toBe('Sub');
    expect(container.querySelectorAll('h5')).toHaveLength(1);
    expect(container.querySelector('h5')?.textContent).toBe('Deep');
  });

  it('renders fenced code blocks, including unclosed fences mid-stream', () => {
    const { container } = render(<MarkdownLite content={'```ts\nconst a = 1;\nconst b = 2;'} />);
    const code = container.querySelector('pre code');
    expect(code?.textContent).toBe('const a = 1;\nconst b = 2;');
    expect(code?.className).toContain('language-ts');
  });

  it('renders GFM tables', () => {
    const { container } = render(
      <MarkdownLite content={'| Col A | Col B |\n| --- | --- |\n| a1 | b1 |\n| a2 | b2 |'} />
    );
    expect(container.querySelectorAll('th')).toHaveLength(2);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.querySelectorAll('td')[0]?.textContent).toBe('a1');
  });

  it('renders blockquotes and horizontal rules', () => {
    const { container } = render(<MarkdownLite content={'> a quote\n\n---'} />);
    expect(container.querySelector('blockquote')?.textContent).toContain('a quote');
    expect(container.querySelectorAll('hr')).toHaveLength(1);
  });

  it('leaves unmatched emphasis markers as literal text', () => {
    render(<MarkdownLite content={'a * b and 2 ** 3 remain literal'} />);
    expect(screen.getByText(/a \* b and 2 \*\* 3 remain literal/)).toBeInTheDocument();
  });

  it('renders strikethrough', () => {
    const { container } = render(<MarkdownLite content={'~~old~~ new'} />);
    expect(container.querySelector('del')?.textContent).toBe('old');
  });
});
