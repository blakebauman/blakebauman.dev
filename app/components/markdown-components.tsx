import type { ReactNode } from 'react';
import { CodeBlock } from './code-block';

export interface MarkdownElementProps {
  children?: ReactNode;
  href?: string;
  className?: string;
}

export type MarkdownComponents = Record<
  | 'h1'
  | 'h2'
  | 'h3'
  | 'blockquote'
  | 'a'
  | 'code'
  | 'table'
  | 'thead'
  | 'tbody'
  | 'tr'
  | 'th'
  | 'td'
  | 'strong'
  | 'hr',
  (props: MarkdownElementProps) => ReactNode
>;

/**
 * Markdown rendered inside a chat answer.
 *
 * These carry class names rather than inline `var(--token)` styles. The previous
 * version inlined tokens from the old palette, and when that palette was
 * replaced every one of them silently became an invalid value: headings lost
 * their family, tables lost their rules, the blockquote marker vanished. An
 * undefined custom property fails at computed-value time without erroring, so
 * nothing catches it. Styling lives in app.css so it moves with the system.
 */
export const markdownComponents: MarkdownComponents = {
  h1: ({ children }) => <h3 className="bb-md-h1">{children}</h3>,
  h2: ({ children }) => <h4 className="bb-md-h2">{children}</h4>,
  h3: ({ children }) => <h5 className="bb-md-h3">{children}</h5>,
  blockquote: ({ children }) => <blockquote className="bb-md-quote">{children}</blockquote>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  code: ({ className, children }) => <CodeBlock className={className}>{children}</CodeBlock>,
  table: ({ children }) => (
    <div className="bb-md-table-scroll">
      <table className="bb-md-table">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => <th>{children}</th>,
  td: ({ children }) => <td>{children}</td>,
  strong: ({ children }) => <strong>{children}</strong>,
  hr: () => <hr className="bb-md-hr" />,
};
