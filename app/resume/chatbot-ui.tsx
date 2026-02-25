import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';
import { AssistantMessage } from './assistant-message';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  id: string;
}

interface ChatbotUIProps {
  messages: Message[];
  input: string;
  isLoading: boolean;
  error: string | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesContentRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyPress: (e: KeyboardEvent<HTMLInputElement>) => void;
  onSendMessage: () => void;
  onClearInput?: () => void;
}

export default function ChatbotUI({
  messages,
  input,
  isLoading,
  error,
  messagesContainerRef,
  messagesContentRef,
  inputRef,
  onInputChange,
  onKeyPress,
  onSendMessage,
  onClearInput,
}: ChatbotUIProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Escape key clears input
    if (e.key === 'Escape' && onClearInput) {
      e.preventDefault();
      onClearInput();
    }
  };

  return (
    <div
      className="w-full mx-auto p-0 pb-4 bg-transparent"
      role="region"
      aria-label="AI Chat Assistant"
    >
      <div
        ref={messagesContainerRef}
        className="h-64 overflow-y-auto py-4 px-0 space-y-4 border border-zinc-200 dark:border-zinc-700"
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
                className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
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
              </div>
            );
          })}
          {/* Show "Thinking..." only when loading and the last message is NOT an assistant message (i.e., streaming hasn't started yet) */}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start" role="status" aria-label="Assistant is thinking">
              <div className="bg-transparent text-zinc-700 dark:text-zinc-400 p-3 flex items-center gap-2">
                <div
                  className="animate-spin h-4 w-4 border-2 border-zinc-700 dark:border-red-400 border-t-transparent"
                  aria-hidden="true"
                />
                <span>Thinking...</span>
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
