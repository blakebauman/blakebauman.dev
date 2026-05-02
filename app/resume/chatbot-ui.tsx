import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';
import { AssistantMessage } from './assistant-message';
import { TypingIndicator } from './typing-indicator';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  id: string;
  timestamp: number;
}

const SUGGESTED_PROMPTS = [
  'What did Blake do at Adobe?',
  'Has he worked with Cloudflare?',
  'What is the most recent project on the record?',
  'What did he ship at Lyons?',
];

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface ChatbotUIProps {
  messages: Message[];
  input: string;
  isLoading: boolean;
  error: string | null;
  isExpanded: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesContentRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyPress: (e: KeyboardEvent<HTMLInputElement>) => void;
  onSendMessage: () => void;
  onClearInput?: () => void;
  onSuggestedPrompt: (prompt: string) => void;
  onToggleExpand: () => void;
}

export default function ChatbotUI({
  messages,
  input,
  isLoading,
  error,
  isExpanded,
  messagesContainerRef,
  messagesContentRef,
  inputRef,
  onInputChange,
  onKeyPress,
  onSendMessage,
  onClearInput,
  onSuggestedPrompt,
  onToggleExpand,
}: ChatbotUIProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (isExpanded) {
        onToggleExpand();
      } else if (onClearInput) {
        onClearInput();
      }
    }
  };

  const showSuggestions = messages.length === 1 && !isLoading;

  const stream = (
    <div
      ref={messagesContainerRef}
      className={`bb-chat-stream${isExpanded ? ' expanded' : ''}`}
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
      aria-relevant="additions"
    >
      <div ref={messagesContentRef}>
        {messages.map((msg, index) => {
          const isLastMessage = index === messages.length - 1;
          const isStreaming = isLastMessage && isLoading && msg.role === 'assistant';
          const isYou = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`bb-chat-msg ${isYou ? 'you' : 'blake'}`}
              style={{ marginBottom: 22 }}
            >
              <div className="who">
                <span className="mark" aria-hidden="true" /> {isYou ? 'You' : 'Blake (the index)'}
              </div>
              <div className="text">
                {msg.role === 'assistant' ? (
                  <AssistantMessage content={msg.content} isStreaming={isStreaming} />
                ) : (
                  msg.content
                )}
              </div>
              {msg.timestamp > 0 && (
                <div className="timestamp">{formatTimestamp(msg.timestamp)}</div>
              )}
            </div>
          );
        })}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="bb-chat-msg blake" role="status" aria-label="Assistant is thinking">
            <div className="who">
              <span className="mark" aria-hidden="true" /> Blake (the index)
            </div>
            <TypingIndicator />
          </div>
        )}
        {error && (
          <div className="bb-chat-error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}
      </div>
    </div>
  );

  const promptChips = showSuggestions && (
    <div className="bb-chat-prompts">
      {SUGGESTED_PROMPTS.map(prompt => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSuggestedPrompt(prompt)}
          className="bb-chat-prompt"
        >
          {prompt}
        </button>
      ))}
    </div>
  );

  const inputRow = (
    <form
      className="bb-chat-input"
      onSubmit={e => {
        e.preventDefault();
        onSendMessage();
      }}
      aria-label="Ask the resume"
    >
      <label htmlFor="chat-input" className="sr-only">
        Ask a question about Blake's experience
      </label>
      <input
        id="chat-input"
        ref={inputRef}
        type="text"
        value={input}
        onChange={onInputChange}
        onKeyPress={onKeyPress}
        onKeyDown={handleKeyDown}
        placeholder="What did Blake do at <company>?"
        disabled={isLoading}
        aria-label="Ask a question about Blake's experience"
        aria-describedby="chat-hint"
        autoComplete="off"
        autoCapitalize="sentences"
        autoCorrect="on"
        spellCheck="true"
        enterKeyHint="send"
        inputMode="text"
        maxLength={500}
      />
      <span id="chat-hint" className="sr-only">
        Press Enter to send your message, Escape to clear
      </span>
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        aria-label={isLoading ? 'Sending message' : 'Send message'}
      >
        {isLoading ? (
          <>
            <span className="bb-chat-spinner" aria-hidden="true" />
            <span>Sending</span>
          </>
        ) : (
          'Ask'
        )}
      </button>
    </form>
  );

  const actions = (
    <div className="bb-chat-actions">
      <button
        type="button"
        className="bb-chat-action"
        onClick={onToggleExpand}
        aria-label={isExpanded ? 'Close expanded chat' : 'Expand chat'}
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={
              isExpanded
                ? 'M6 18L18 6M6 6l12 12'
                : 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4'
            }
          />
        </svg>
        {isExpanded ? 'Close' : 'Expand'}
      </button>
    </div>
  );

  return (
    <>
      <div
        className={isExpanded ? 'invisible' : ''}
        role="region"
        aria-label="Resume chat assistant"
        aria-hidden={isExpanded}
      >
        {actions}
        {stream}
        {promptChips}
        {inputRow}
      </div>

      {isExpanded && (
        <div className="bb-chat-modal" aria-hidden={!isExpanded}>
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label="Close expanded chat"
            className="absolute"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'transparent',
              border: 0,
              zIndex: 0,
            }}
          />
          <div
            className="bb-chat-modal-card"
            role="dialog"
            aria-label="Expanded chat"
            aria-modal="true"
            style={{ position: 'relative', zIndex: 1 }}
          >
            <div className="bb-chat-modal-head">
              <span className="bb-chat-modal-title">
                <span
                  style={{
                    width: 7,
                    height: 7,
                    background: 'var(--cordovan)',
                    display: 'inline-block',
                    marginRight: 10,
                  }}
                />
                Ask the resume
              </span>
              <button
                type="button"
                onClick={onToggleExpand}
                className="bb-chat-action"
                aria-label="Close expanded chat"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Close
              </button>
            </div>
            <div className="bb-chat-modal-body">
              {stream}
              {promptChips}
              {inputRow}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
