import type { ReactNode } from 'react';
import { CopyButton } from './copy-button';

interface CodeBlockProps {
  children: ReactNode;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
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
    return <code>{children}</code>;
  }

  return (
    <div style={{ position: 'relative' }} className="group">
      <div
        className="opacity-0 group-hover:opacity-100"
        style={{ transition: 'opacity 120ms ease' }}
      >
        <CopyButton text={textContent} />
      </div>
      <pre>
        <code className={className} style={{ display: 'block', paddingRight: 64 }}>
          {children}
        </code>
      </pre>
    </div>
  );
}
