import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { v7 as uuidv7 } from 'uuid';

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

// Session storage keys
const CHAT_HISTORY_KEY = 'blakebauman_chat_history';
const SESSION_ID_KEY = 'blakebauman_chat_session_id';

// Get or create a persistent session ID for logging (UUID7 = time-ordered, sortable)
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = uuidv7();
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    // Fallback if sessionStorage fails
    return uuidv7();
  }
}

// Stable timestamp for initial message to avoid hydration mismatch
const INITIAL_MESSAGE_TIMESTAMP = 0;

const DEFAULT_GREETING = "I read Blake's record. Ask me what he's worked on, where, and with what.";

// Create initial welcome message with stable timestamp.
// The greeting comes from serialized loader data, so SSR and hydration match.
function createInitialMessage(greeting: string = DEFAULT_GREETING): Message {
  return {
    role: 'assistant',
    content: greeting,
    id: '1',
    timestamp: INITIAL_MESSAGE_TIMESTAMP,
  };
}

// Load messages from sessionStorage
function loadMessages(greeting: string = DEFAULT_GREETING): Message[] {
  if (typeof window === 'undefined') return [createInitialMessage(greeting)];
  try {
    const stored = sessionStorage.getItem(CHAT_HISTORY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migrate old messages without timestamps
        return parsed.map((msg: Message, index: number) => ({
          ...msg,
          timestamp: msg.timestamp || Date.now() - (parsed.length - index) * 1000,
        }));
      }
    }
  } catch {
    // Ignore parse errors
  }
  return [createInitialMessage(greeting)];
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
const ChatbotUI = lazy(() => import('@/components/chatbot-ui'));

interface ChatbotProps {
  greeting?: string;
  suggestedPrompts?: string[];
}

export default function Chatbot({ greeting, suggestedPrompts }: ChatbotProps = {}) {
  // Initialize with stable state for SSR, then hydrate from sessionStorage
  const [messages, setMessages] = useState<Message[]>(() => [createInitialMessage(greeting)]);
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

  // Hydrate from sessionStorage after mount (avoids SSR mismatch)
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount; greeting is stable from loader data
  useEffect(() => {
    const stored = loadMessages(greeting);
    if (stored.length > 1 || stored[0]?.timestamp !== 0) {
      setMessages(stored);
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

  // Focus input and scroll to bottom on mount
  useEffect(() => {
    inputRef.current?.focus();
    // Delay scroll to ensure DOM is ready
    const timeout = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeout);
  }, [scrollToBottom]);

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

  const sendMessage = async (promptOverride?: string) => {
    const messageText = promptOverride ?? input;
    if (!messageText.trim() || isLoading) return;

    const now = Date.now();
    const newMessage: Message = {
      role: 'user',
      content: messageText,
      id: uuidv7(),
      timestamp: now,
    };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    // Create a placeholder message for streaming
    const assistantTimestamp = Date.now() + 1;
    const assistantMessageId = uuidv7();
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
          prompt: messageText,
          conversationHistory: recentMessages,
          sessionId: getOrCreateSessionId() || undefined,
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Rate limit reached. Wait a minute and try again.');
        }
        if (res.status >= 500) {
          throw new Error('The index is unreachable. Try again in a moment.');
        }
        throw new Error(`Request failed (${res.status}).`);
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
      let errorMessage: string;
      if (err instanceof TypeError) {
        // Fetch network failure (offline, DNS, CORS, etc.)
        errorMessage = 'No network. Check your connection.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = 'Unknown error.';
      }
      setError(`The index couldn't answer. ${errorMessage}`);
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

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

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
        suggestedPrompts={suggestedPrompts}
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
