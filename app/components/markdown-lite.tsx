import type { ReactNode } from 'react';
import { markdownComponents } from './markdown-components';

/**
 * Minimal markdown renderer for chat replies. Covers the subset the resume
 * assistant emits — paragraphs, bold/italic/strikethrough, inline code, fenced
 * code blocks, links, headings, lists, blockquotes, tables, and rules — in a
 * few KB, replacing the react-markdown/micromark stack (~50 KB gzipped).
 *
 * Tolerant of mid-stream partial markdown: unclosed fences render as code,
 * unmatched emphasis markers render as literal text.
 */

// Only allow link protocols that can't execute script.
const SAFE_HREF = /^(https?:\/\/|mailto:|\/)/i;

const {
  h1: H1,
  h2: H2,
  h3: H3,
  blockquote: Blockquote,
  a: Anchor,
  code: Code,
  table: Table,
  thead: Thead,
  tbody: Tbody,
  tr: Tr,
  th: Th,
  td: Td,
  strong: Strong,
  hr: Hr,
} = markdownComponents;

interface InlineMatch {
  index: number;
  length: number;
  node: (key: number) => ReactNode;
}

type InlinePattern = (text: string) => InlineMatch | null;

function firstMatch(
  text: string,
  regex: RegExp,
  node: (m: RegExpMatchArray, key: number) => ReactNode
): InlineMatch | null {
  const m = text.match(regex);
  if (!m || m.index === undefined) return null;
  return { index: m.index, length: m[0].length, node: key => node(m, key) };
}

// Ordered by priority for same-index ties: code protects its contents from
// further parsing, links before emphasis so labels can contain asterisks.
const INLINE_PATTERNS: InlinePattern[] = [
  text => firstMatch(text, /`([^`]+)`/, (m, key) => <Code key={key}>{m[1]}</Code>),
  text =>
    firstMatch(text, /\[([^\]]+)\]\(([^)\s]+)\)/, (m, key) =>
      SAFE_HREF.test(m[2] ?? '') ? (
        <Anchor key={key} href={m[2]}>
          {renderInline(m[1] ?? '')}
        </Anchor>
      ) : (
        <span key={key}>{m[1]}</span>
      )
    ),
  text =>
    firstMatch(text, /\*\*(.+?)\*\*/, (m, key) => (
      <Strong key={key}>{renderInline(m[1] ?? '')}</Strong>
    )),
  text =>
    firstMatch(text, /\*([^*\s][^*]*)\*/, (m, key) => (
      <em key={key}>{renderInline(m[1] ?? '')}</em>
    )),
  text =>
    firstMatch(text, /~~(.+?)~~/, (m, key) => <del key={key}>{renderInline(m[1] ?? '')}</del>),
];

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    let earliest: InlineMatch | null = null;
    for (const pattern of INLINE_PATTERNS) {
      const match = pattern(remaining);
      if (match && (!earliest || match.index < earliest.index)) {
        earliest = match;
      }
    }
    if (!earliest) {
      nodes.push(remaining);
      break;
    }
    if (earliest.index > 0) {
      nodes.push(remaining.slice(0, earliest.index));
    }
    nodes.push(earliest.node(key++));
    remaining = remaining.slice(earliest.index + earliest.length);
  }

  return nodes;
}

const FENCE = /^```(\w*)\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;
const QUOTE = /^>\s?(.*)$/;
const UL_ITEM = /^\s*[-*+]\s+(.*)$/;
const OL_ITEM = /^\s*\d+[.)]\s+(.*)$/;
const TABLE_ROW = /^\s*\|/;
const TABLE_SEPARATOR = /^\s*\|?[\s:|-]+\|?\s*$/;

function isBlockStart(line: string): boolean {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    RULE.test(line) ||
    QUOTE.test(line) ||
    UL_ITEM.test(line) ||
    OL_ITEM.test(line) ||
    TABLE_ROW.test(line)
  );
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim());
}

function renderBlocks(content: string): ReactNode[] {
  const lines = content.replaceAll('\r\n', '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (!line.trim()) {
      i++;
      continue;
    }

    const fence = line.match(FENCE);
    if (fence) {
      const lang = fence[1];
      const buffer: string[] = [];
      i++;
      // An unclosed fence (mid-stream) swallows the rest as code.
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        buffer.push(lines[i] ?? '');
        i++;
      }
      i++;
      out.push(
        <Code key={key++} className={`language-${lang || 'text'}`}>
          {buffer.join('\n')}
        </Code>
      );
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      const level = Math.min((heading[1] ?? '#').length, 3);
      const H = level === 1 ? H1 : level === 2 ? H2 : H3;
      out.push(<H key={key++}>{renderInline(heading[2] ?? '')}</H>);
      i++;
      continue;
    }

    if (RULE.test(line)) {
      out.push(<Hr key={key++} />);
      i++;
      continue;
    }

    if (QUOTE.test(line)) {
      const buffer: string[] = [];
      while (i < lines.length) {
        const quoted = (lines[i] ?? '').match(QUOTE);
        if (!quoted) break;
        buffer.push(quoted[1] ?? '');
        i++;
      }
      out.push(<Blockquote key={key++}>{renderInline(buffer.join(' '))}</Blockquote>);
      continue;
    }

    if (
      TABLE_ROW.test(line) &&
      TABLE_SEPARATOR.test(lines[i + 1] ?? '') &&
      (lines[i + 1] ?? '').includes('-')
    ) {
      const header = splitTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && TABLE_ROW.test(lines[i] ?? '')) {
        rows.push(splitTableRow(lines[i] ?? ''));
        i++;
      }
      out.push(
        <Table key={key++}>
          <Thead>
            <Tr>
              {header.map((cell, col) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static table, cells never reorder
                <Th key={col}>{renderInline(cell)}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row, rowIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static table, rows never reorder
              <Tr key={rowIndex}>
                {row.map((cell, col) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static table, cells never reorder
                  <Td key={col}>{renderInline(cell)}</Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      );
      continue;
    }

    const listMatch = line.match(UL_ITEM) ? UL_ITEM : line.match(OL_ITEM) ? OL_ITEM : null;
    if (listMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const item = (lines[i] ?? '').match(listMatch);
        if (!item) break;
        items.push(item[1] ?? '');
        i++;
      }
      const children = items.map((item, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static list, items never reorder
        <li key={index}>{renderInline(item)}</li>
      ));
      out.push(
        listMatch === UL_ITEM ? <ul key={key++}>{children}</ul> : <ol key={key++}>{children}</ol>
      );
      continue;
    }

    // Paragraph: join consecutive plain lines with a space (soft break).
    const buffer: string[] = [line];
    i++;
    while (i < lines.length && (lines[i] ?? '').trim() && !isBlockStart(lines[i] ?? '')) {
      buffer.push(lines[i] ?? '');
      i++;
    }
    out.push(<p key={key++}>{renderInline(buffer.join(' '))}</p>);
  }

  return out;
}

export function MarkdownLite({ content }: { content: string }) {
  return <>{renderBlocks(content)}</>;
}
