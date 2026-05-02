import { useState } from 'react';

interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        position: 'absolute',
        top: 6,
        right: 6,
        padding: '4px 9px',
        font: '500 10px/1 var(--font-mono)',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        background: 'var(--plat)',
        border: '1px solid var(--rule-strong)',
        color: 'var(--inkpress)',
        cursor: 'pointer',
        opacity: copied ? 1 : 0.85,
        transition: 'background 120ms ease, color 120ms ease',
      }}
      aria-label={copied ? 'Copied' : 'Copy code'}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
