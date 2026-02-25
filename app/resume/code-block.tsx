import type { ReactNode } from 'react';
import { CopyButton } from './copy-button';

interface CodeBlockProps {
  children: ReactNode;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  // Extract text content from children for copying
  const getTextContent = (node: ReactNode): string => {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (!node) return '';
    if (Array.isArray(node)) return node.map(getTextContent).join('');
    if (typeof node === 'object' && 'props' in node) {
      const props = node.props as { children?: ReactNode };
      return getTextContent(props.children);
    }
    return '';
  };

  const textContent = getTextContent(children);
  const isInline = !className;

  if (isInline) {
    return (
      <code className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1 py-0.5 text-sm font-mono">
        {children}
      </code>
    );
  }

  return (
    <div className="relative group">
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={textContent} />
      </div>
      <code className="block bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 pr-16 text-sm font-mono overflow-x-auto whitespace-pre">
        {children}
      </code>
    </div>
  );
}
