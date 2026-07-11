import type { Components } from 'react-markdown';
import { CodeBlock } from './code-block';

export const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1
      style={{
        font: '600 18px/1.25 var(--font-cond)',
        margin: '0 0 8px',
        letterSpacing: '-0.005em',
      }}
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      style={{
        font: '600 16px/1.25 var(--font-cond)',
        margin: '0 0 8px',
        letterSpacing: '-0.005em',
      }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      style={{
        font: '600 14px/1.25 var(--font-cond)',
        margin: '0 0 4px',
      }}
    >
      {children}
    </h3>
  ),
  blockquote: ({ children }) => (
    <blockquote
      style={{
        borderLeft: 0,
        paddingLeft: 14,
        position: 'relative',
        fontStyle: 'italic',
        opacity: 0.85,
        margin: '8px 0',
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 0,
          top: '0.4em',
          width: 4,
          height: 4,
          background: 'var(--cordovan)',
        }}
      />
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  code: ({ className, children }) => <CodeBlock className={className}>{children}</CodeBlock>,
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '8px 0' }}>
      <table
        style={{
          minWidth: '100%',
          borderCollapse: 'collapse',
          font: '500 12px/1.5 var(--font-mono)',
        }}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead
      style={{
        background: 'var(--plat)',
        borderBottom: '1px solid var(--rule-strong)',
      }}
    >
      {children}
    </thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr style={{ borderBottom: '1px solid var(--rule)' }}>{children}</tr>,
  th: ({ children }) => (
    <th
      style={{
        padding: '6px 10px',
        textAlign: 'left',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontSize: 11,
        fontWeight: 500,
        opacity: 0.75,
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => <td style={{ padding: '6px 10px', verticalAlign: 'top' }}>{children}</td>,
  strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
  hr: () => (
    <hr
      style={{
        border: 0,
        height: 1,
        background: 'var(--rule)',
        margin: '14px 0',
      }}
    />
  ),
};
