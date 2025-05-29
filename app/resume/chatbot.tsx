import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";

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

// Lazy load the chatbot UI
const ChatbotUI = lazy(() => import("@/resume/chatbot-ui"));

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
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Focus input after messages update
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

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
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Suspense fallback={<div className="w-full h-64 bg-transparent animate-pulse" />}>
      <ChatbotUI
        messages={messages}
        input={input}
        isLoading={isLoading}
        error={error}
        messagesEndRef={messagesEndRef}
        messagesContainerRef={messagesContainerRef}
        messagesContentRef={messagesContentRef}
        inputRef={inputRef}
        onInputChange={(e) => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        onSendMessage={sendMessage}
      />
    </Suspense>
  );
}
