import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
      <button data-testid="send-button" onClick={onSendMessage}>
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
