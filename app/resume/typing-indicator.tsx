export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1" aria-label="Assistant is thinking">
      <span className="sr-only">Thinking</span>
      <span
        className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full animate-bounce"
        style={{ animationDelay: '0ms', animationDuration: '600ms' }}
        aria-hidden="true"
      />
      <span
        className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full animate-bounce"
        style={{ animationDelay: '150ms', animationDuration: '600ms' }}
        aria-hidden="true"
      />
      <span
        className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full animate-bounce"
        style={{ animationDelay: '300ms', animationDuration: '600ms' }}
        aria-hidden="true"
      />
    </div>
  );
}
