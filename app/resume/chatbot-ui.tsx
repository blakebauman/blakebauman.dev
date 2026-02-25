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
  'What projects has Blake worked on?',
  'Tell me about his experience at Adobe',
  'What technologies does he use?',
  'What is he currently exploring?',
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
    // Escape key clears input or collapses expanded view
    if (e.key === 'Escape') {
      e.preventDefault();
      if (isExpanded) {
        onToggleExpand();
      } else if (onClearInput) {
        onClearInput();
      }
    }
  };

  // Show suggested prompts only when there's just the initial message
  const showSuggestions = messages.length === 1 && !isLoading;

  return (
    <div
      className={`w-full mx-auto p-0 pb-4 bg-transparent transition-all duration-300 ${
        isExpanded
          ? 'fixed inset-4 z-50 bg-white dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-700 shadow-2xl'
          : ''
      }`}
      role="region"
      aria-label="AI Chat Assistant"
    >
      {/* Expand/Collapse button */}
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={onToggleExpand}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
          aria-label={isExpanded ? 'Collapse chat' : 'Expand chat'}
        >
          {isExpanded ? (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Close
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
              Expand
            </>
          )}
        </button>
      </div>

      <div
        ref={messagesContainerRef}
        className={`overflow-y-auto py-4 px-0 space-y-4 border border-zinc-200 dark:border-zinc-700 transition-all duration-300 ${
          isExpanded ? 'h-[calc(100%-120px)]' : 'h-64'
        }`}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div ref={messagesContentRef} className="px-4 space-y-4">
          {messages.map((msg, index) => {
            const isLastMessage = index === messages.length - 1;
            const isStreaming = isLastMessage && isLoading && msg.role === 'assistant';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'assistant' ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[80%] p-3 ${
                    msg.role === 'assistant'
                      ? 'bg-transparent text-zinc-900 dark:text-zinc-400'
                      : 'bg-red-500 text-white dark:text-zinc-950'
                  }`}
                  role="article"
                  aria-label={`${msg.role === 'assistant' ? 'Assistant' : 'You'}: ${msg.content}`}
                >
                  {msg.role === 'assistant' ? (
                    <AssistantMessage content={msg.content} isStreaming={isStreaming} />
                  ) : (
                    msg.content
                  )}
                </div>
                <span
                  className={`text-xs text-zinc-400 dark:text-zinc-500 mt-1 ${
                    msg.role === 'assistant' ? 'ml-3' : 'mr-3'
                  }`}
                >
                  {formatTimestamp(msg.timestamp)}
                </span>
              </div>
            );
          })}
          {/* Show typing indicator when loading and streaming hasn't started */}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start" role="status" aria-label="Assistant is thinking">
              <div className="bg-transparent p-3">
                <TypingIndicator />
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-start" role="alert" aria-live="assertive">
              <div className="bg-transparent text-red-400 p-3">{error}</div>
            </div>
          )}
        </div>
      </div>

      {/* Suggested prompts */}
      {showSuggestions && (
        <div className="flex flex-wrap gap-2 mt-3 px-0">
          {SUGGESTED_PROMPTS.map(prompt => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSuggestedPrompt(prompt)}
              className="text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-red-400 hover:text-red-500 dark:hover:border-red-400 dark:hover:text-red-400 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className="flex mt-4 gap-2 px-0">
        <label htmlFor="chat-input" className="sr-only">
          Ask a question about Blake's experience
        </label>
        <input
          id="chat-input"
          ref={inputRef}
          className="flex-1 p-2 bg-transparent border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950 disabled:opacity-50"
          value={input}
          onChange={onInputChange}
          onKeyPress={onKeyPress}
          onKeyDown={handleKeyDown}
          placeholder="Ask my agent about my experience..."
          disabled={isLoading}
          aria-label="Ask a question about Blake's experience"
          aria-describedby="chat-hint"
          autoComplete="off"
        />
        <span id="chat-hint" className="sr-only">
          Press Enter to send your message, Escape to clear
        </span>
        <button
          type="button"
          onClick={onSendMessage}
          disabled={isLoading || !input.trim()}
          className="bg-red-500 text-white dark:text-zinc-950 p-2 font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950"
          aria-label={isLoading ? 'Sending message' : 'Send message'}
        >
          {isLoading ? (
            <>
              <div
                className="animate-spin h-4 w-4 border-2 border-white dark:border-zinc-950 border-t-transparent"
                aria-hidden="true"
              />
              <span>Sending...</span>
            </>
          ) : (
            'Send'
          )}
        </button>
      </div>
    </div>
  );
}
