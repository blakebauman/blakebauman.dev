import type { Components } from 'react-markdown';
import { CodeBlock } from './code-block';

/**
 * Custom Tailwind-styled components for rendering markdown in chat messages.
 * Designed for compact display within a chatbot context.
 */
export const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-bold mb-2 text-zinc-900 dark:text-zinc-100">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-bold mb-2 text-zinc-900 dark:text-zinc-100">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-bold mb-1 text-zinc-900 dark:text-zinc-100">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-zinc-900 dark:text-zinc-400">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-red-400 pl-3 italic text-zinc-600 dark:text-zinc-400 my-2">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 underline"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => <CodeBlock className={className}>{children}</CodeBlock>,
  pre: ({ children }) => <pre className="mb-2 last:mb-0">{children}</pre>,
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2">
      <table className="min-w-full border border-zinc-200 dark:border-zinc-700">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-zinc-100 dark:bg-zinc-800">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-zinc-200 dark:border-zinc-700">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-2 py-1 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2 py-1 text-sm text-zinc-900 dark:text-zinc-400">{children}</td>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-zinc-900 dark:text-zinc-100">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => <hr className="my-3 border-zinc-200 dark:border-zinc-700" />,
};
