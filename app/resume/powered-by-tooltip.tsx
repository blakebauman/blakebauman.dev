import { useEffect, useRef, useState } from 'react';

const cloudflareProducts = [
  { name: 'Workers AI', description: 'LLM responses & embeddings' },
  { name: 'Vectorize', description: 'Semantic search' },
  { name: 'KV', description: 'Data caching' },
  { name: 'D1', description: 'Conversation logging' },
];

export function PoweredByTooltip() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block ml-3">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        aria-label="Cloudflare products powering this feature"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="p-1 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-full"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className="absolute left-0 top-full mt-2 z-50 w-64 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-lg"
        >
          <p className="text-fluid-sm font-semibold text-zinc-900 dark:text-white mb-3">
            Powered by Cloudflare
          </p>
          <ul className="space-y-2">
            {cloudflareProducts.map(product => (
              <li key={product.name} className="flex items-start gap-2">
                <span
                  className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0 mt-1.5"
                  aria-hidden="true"
                />
                <div>
                  <span className="text-fluid-sm font-medium text-zinc-900 dark:text-white">
                    {product.name}
                  </span>
                  <span className="text-fluid-sm text-zinc-500 dark:text-zinc-400">
                    {' '}
                    — {product.description}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
