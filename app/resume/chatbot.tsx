import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "assistant" | "user";
  content: string;
  id: string;
}

interface ChatResponse {
  choices?: Array<{
    message: {
      content: string;
    };
  }>;
  error?: string;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "assistant", 
      content: "Hi! I'm Blake's conversational AI agent. I can help you learn about his professional experience, skills, and background. What would you like to know?", 
      id: "1" 
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesContentRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    const container = messagesContentRef.current;
    if (!container) return;

    const observer = new MutationObserver(scrollToBottom);
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => observer.disconnect();
  }, [scrollToBottom]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const newMessage: Message = { role: "user", content: input, id: Date.now().toString() };
    setMessages(prev => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: input }),
      });

      if (!res.ok) {
        throw new Error(`Failed to get response: ${res.statusText}`);
      }

      const data = await res.json() as ChatResponse;
      
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.choices?.[0]?.message?.content) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.choices[0].message.content,
          id: (Date.now() + 1).toString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(`Sorry, I encountered an error: ${errorMessage}`);
      console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
          className="flex-1 p-2 bg-transparent border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask my agent about my experience..."
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={sendMessage}
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
