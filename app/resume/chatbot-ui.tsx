import type { ChangeEvent, KeyboardEvent, RefObject } from "react";

interface Message {
  role: "assistant" | "user";
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
}

export default function ChatbotUI({
  messages,
  input,
  isLoading,
  error,
  messagesEndRef,
  messagesContainerRef,
  messagesContentRef,
  inputRef,
  onInputChange,
  onKeyPress,
  onSendMessage,
}: ChatbotUIProps) {
  return (
    <div className="w-full mx-auto p-0 pb-4 bg-transparent">
      <div ref={messagesContainerRef} className="h-64 overflow-y-auto py-4 px-0 space-y-4 border border-zinc-200 dark:border-zinc-700">
        <div ref={messagesContentRef} className="px-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] p-3 ${
                  msg.role === "assistant"
                    ? "bg-transparent text-zinc-900 dark:text-zinc-400"
                    : "bg-red-500 text-white dark:text-zinc-950"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-transparent text-zinc-700 dark:text-zinc-400 p-3 flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-zinc-700 dark:border-red-400 border-t-transparent rounded-full" />
                Thinking...
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-start">
              <div className="bg-transparent text-red-400 p-3">
                {error}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex mt-4 gap-2 px-0">
        <input
          ref={inputRef}
          className="flex-1 p-2 bg-transparent border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
          value={input}
          onChange={onInputChange}
          onKeyPress={onKeyPress}
          placeholder="Ask my agent about my experience..."
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={onSendMessage}
          disabled={isLoading || !input.trim()}
          className="bg-red-500 text-white dark:text-zinc-950 p-2 font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white dark:border-zinc-950 border-t-transparent rounded-full" />
              Sending...
            </>
          ) : (
            "Send"
          )}
        </button>
      </div>
    </div>
  );
} 