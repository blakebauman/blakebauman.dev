export function TypingIndicator() {
  return (
    <div className="bb-typing" aria-label="Assistant is thinking">
      <span className="sr-only">Thinking</span>
      <span className="bb-typing-dot" aria-hidden="true" />
      <span className="bb-typing-dot" aria-hidden="true" />
      <span className="bb-typing-dot" aria-hidden="true" />
    </div>
  );
}
