import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssistantMessage } from '../resume/assistant-message';

// Mock the lazy-loaded ChatbotUI component
vi.mock('@/resume/chatbot-ui', () => ({
  default: ({
    messages,
    input,
    isLoading,
    error,
    onInputChange,
    onKeyPress,
    onSendMessage,
    inputRef,
  }: {
    messages: Array<{ id: string; role: string; content: string }>;
    input: string;
    isLoading: boolean;
    error: string | null;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onSendMessage: () => void;
    inputRef: React.RefObject<HTMLInputElement>;
  }) => (
    <div data-testid="chatbot-ui">
      <div data-testid="messages">
        {messages.map(msg => (
          <div key={msg.id} data-testid={`message-${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      {isLoading && <div data-testid="loading">Loading...</div>}
      {error && <div data-testid="error">{error}</div>}
      <input
        ref={inputRef}
        data-testid="chat-input"
        value={input}
        onChange={onInputChange}
        onKeyPress={onKeyPress}
        aria-label="Chat input"
      />
      <button type="button" data-testid="send-button" onClick={() => onSendMessage()}>
        Send
      </button>
    </div>
  ),
}));

// Import after mocking
import Chatbot from '../resume/chatbot';

describe('Chatbot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial welcome message', async () => {
    render(<Chatbot />);

    await waitFor(() => {
      expect(screen.getByTestId('chatbot-ui')).toBeInTheDocument();
    });

    expect(screen.getByTestId('message-assistant')).toHaveTextContent(
      "Hi! I'm Blake's conversational AI agent"
    );
  });

  it('updates input value on change', async () => {
    render(<Chatbot />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: 'Hello' } });

    expect(input).toHaveValue('Hello');
  });

  it('sends message on button click', async () => {
    // Mock streaming response
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"content":"Test response"}\n\n'));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/event-stream' }),
      body: mockStream,
    });

    render(<Chatbot />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    const input = screen.getByTestId('chat-input');
    const sendButton = screen.getByTestId('send-button');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/chat?stream=true', expect.any(Object));
    });
  });

  it('handles API error gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    });

    render(<Chatbot />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    const input = screen.getByTestId('chat-input');
    const sendButton = screen.getByTestId('send-button');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });
  });
});

describe('AssistantMessage', () => {
  it('renders plain text content', () => {
    render(<AssistantMessage content="Hello, world!" />);
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('renders bold text with strong tag', () => {
    render(<AssistantMessage content="This is **bold** text" />);
    const boldElement = screen.getByText('bold');
    expect(boldElement.tagName).toBe('STRONG');
  });

  it('renders links with target blank', () => {
    render(<AssistantMessage content="Check out [this link](https://example.com)" />);
    const link = screen.getByRole('link', { name: 'this link' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders unordered lists', () => {
    const content = `- Item 1
- Item 2
- Item 3`;
    render(<AssistantMessage content={content} />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('renders inline code', () => {
    render(<AssistantMessage content="Use the `console.log` function" />);
    const code = screen.getByText('console.log');
    expect(code.tagName).toBe('CODE');
  });

  it('shows streaming cursor when isStreaming is true', () => {
    render(<AssistantMessage content="Loading..." isStreaming={true} />);
    const cursor = document.querySelector('.animate-pulse');
    expect(cursor).toBeInTheDocument();
  });

  it('hides streaming cursor when isStreaming is false', () => {
    render(<AssistantMessage content="Done" isStreaming={false} />);
    const cursor = document.querySelector('.animate-pulse');
    expect(cursor).not.toBeInTheDocument();
  });

  it('handles partial markdown during streaming without errors', () => {
    // Simulates incomplete markdown that might occur during streaming
    expect(() => {
      render(<AssistantMessage content="Here is a **bold" isStreaming={true} />);
    }).not.toThrow();
    expect(screen.getByText(/Here is a/)).toBeInTheDocument();
  });
});
