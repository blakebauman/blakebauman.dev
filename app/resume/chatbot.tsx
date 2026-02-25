import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  id: string;
  timestamp: number;
}

interface ChatResponse {
  choices?: Array<{
    message: {
      content: string;
    };
  }>;
  error?: string;
}

interface StreamChunk {
  content: string;
}

// Session storage key for conversation history
const CHAT_HISTORY_KEY = 'blakebauman_chat_history';

// Initial welcome message
const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content:
    "Hi! I'm Blake's conversational AI agent. I can help you learn about his professional experience, skills, and background. What would you like to know?",
  id: '1',
  timestamp: Date.now(),
};

// Load messages from sessionStorage
function loadMessages(): Message[] {
  if (typeof window === 'undefined') return [INITIAL_MESSAGE];
  try {
    const stored = sessionStorage.getItem(CHAT_HISTORY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return [INITIAL_MESSAGE];
}

// Save messages to sessionStorage
function saveMessages(messages: Message[]): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

// Lazy load the chatbot UI
const ChatbotUI = lazy(() => import('@/resume/chatbot-ui'));

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
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
      characterData: true,
    });

    return () => observer.disconnect();
  }, [scrollToBottom]);

  // Scroll to bottom when expanded state changes (after transition)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional trigger on isExpanded change
  useEffect(() => {
    const timeout = setTimeout(scrollToBottom, 250);
    return () => clearTimeout(timeout);
  }, [isExpanded, scrollToBottom]);

  // Scroll to bottom when messages change
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional trigger on messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

  // Persist messages to sessionStorage
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const now = Date.now();
    const newMessage: Message = {
      role: 'user',
      content: input,
      id: now.toString(),
      timestamp: now,
    };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    // Create a placeholder message for streaming
    const assistantTimestamp = Date.now() + 1;
    const assistantMessageId = assistantTimestamp.toString();
    const placeholderMessage: Message = {
      role: 'assistant',
      content: '',
      id: assistantMessageId,
      timestamp: assistantTimestamp,
    };

    try {
      // Build conversation context from recent messages (last 6 exchanges max)
      const recentMessages = [...messages, newMessage]
        .slice(-12) // Last 12 messages (6 exchanges)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat?stream=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: input,
          conversationHistory: recentMessages,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to get response: ${res.statusText}`);
      }

      // Check if response is streaming
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('text/event-stream') && res.body) {
        // Add placeholder message for streaming
        setMessages(prev => [...prev, placeholderMessage]);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                break;
              }
              try {
                const parsed = JSON.parse(data) as StreamChunk;
                if (parsed.content) {
                  accumulatedContent += parsed.content;
                  // Update the message with accumulated content
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantMessageId ? { ...msg, content: accumulatedContent } : msg
                    )
                  );
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }

        if (!accumulatedContent) {
          throw new Error('No content received from stream');
        }
      } else {
        // Fallback to non-streaming response
        const data = (await res.json()) as ChatResponse;

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.choices?.[0]?.message?.content) {
          const assistantMessage: Message = {
            role: 'assistant',
            content: data.choices[0].message.content,
            id: assistantMessageId,
            timestamp: assistantTimestamp,
          };
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          throw new Error('Invalid response format from server');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(`Sorry, I encountered an error: ${errorMessage}`);
      // Remove placeholder message on error
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClearInput = useCallback(() => {
    setInput('');
    inputRef.current?.focus();
  }, []);

  const handleSuggestedPrompt = useCallback((prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  }, []);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <Suspense
      fallback={
        <div
          className="w-full h-64 bg-transparent animate-pulse"
          aria-label="Loading chat interface"
        />
      }
    >
      <ChatbotUI
        messages={messages}
        input={input}
        isLoading={isLoading}
        error={error}
        isExpanded={isExpanded}
        messagesEndRef={messagesEndRef}
        messagesContainerRef={messagesContainerRef}
        messagesContentRef={messagesContentRef}
        inputRef={inputRef}
        onInputChange={e => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        onSendMessage={sendMessage}
        onClearInput={handleClearInput}
        onSuggestedPrompt={handleSuggestedPrompt}
        onToggleExpand={handleToggleExpand}
      />
    </Suspense>
  );
}
