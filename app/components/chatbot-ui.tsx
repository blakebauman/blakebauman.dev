import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';
import { useEffect, useRef } from 'react';
// Single source of truth. This list previously existed identically here and in
// persona.ts, which is exactly the shape of duplication that drifts.
import { DEFAULT_SUGGESTED_PROMPTS } from '@/lib/persona';
import { CHAT_LIMITS } from '@/schemas';
import { AssistantMessage } from './assistant-message';
import { TypingIndicator } from './typing-indicator';

interface ContextSource {
  label: string;
  title: string;
}

export interface AgentStep {
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
}

interface Message {
  role: 'assistant' | 'user';
  content: string;
  id: string;
  timestamp: number;
  sources?: ContextSource[];
  steps?: AgentStep[];
}

// How many suggestions to show once the conversation is under way. Fewer than
// the opening set: at that point they are a nudge, not the main affordance.
const FOLLOW_UP_PROMPT_COUNT = 2;

/**
 * The tool calls, as a sentence.
 *
 * Deliberately not chips. The source chips below the answer say what grounded
 * it; this says what the assistant did to get there, and rendering both as rows
 * of chips would read as one list split in two. A sentence in the metadata
 * treatment stays quiet and does not compete with the citation it sits above.
 *
 * Failed calls are named too. An assistant that looked and found nothing is
 * telling the truth about the record, and hiding that half would make an
 * "I don't have that" look like it never checked.
 */
export function describeSteps(steps: AgentStep[]): string {
  const phrases = steps.map(step => {
    const name = typeof step.args.name === 'string' ? step.args.name : null;
    const slug = typeof step.args.slug === 'string' ? step.args.slug : null;
    const company = typeof step.args.company === 'string' ? step.args.company : null;

    switch (step.tool) {
      case 'search_record':
        return step.ok ? 'searched the record' : 'tried to search the record';
      case 'list_projects':
        return 'listed the projects';
      case 'get_project':
        return name ? `looked up ${name}` : 'looked up a project';
      case 'list_experience':
        return company ? `read the ${company} role` : 'read the role history';
      case 'read_case_study':
        return slug ? `read the ${slug} case study` : 'read a case study';
      case 'get_profile':
        return 'read the profile';
      default:
        return step.tool;
    }
  });

  const last = phrases.at(-1);
  if (!last) return '';
  const sentence = phrases.length === 1 ? last : `${phrases.slice(0, -1).join(', ')}, then ${last}`;
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}`;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface ChatbotUIProps {
  messages: Message[];
  suggestedPrompts?: string[];
  input: string;
  isLoading: boolean;
  error: string | null;
  canRetry?: boolean;
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
  onRetry?: () => void;
  onDismissError?: () => void;
  onToggleExpand: () => void;
}

export default function ChatbotUI({
  messages,
  suggestedPrompts = DEFAULT_SUGGESTED_PROMPTS,
  input,
  isLoading,
  error,
  canRetry = false,
  isExpanded,
  messagesContainerRef,
  messagesContentRef,
  inputRef,
  onInputChange,
  onKeyPress,
  onSendMessage,
  onClearInput,
  onSuggestedPrompt,
  onRetry,
  onDismissError,
  onToggleExpand,
}: ChatbotUIProps) {
  const regionRef = useRef<HTMLDivElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const heldHeightRef = useRef<number | undefined>(undefined);
  const wasExpandedRef = useRef(false);

  // A native modal dialog, so the browser owns containment, Escape and the inert
  // page behind it. The previous hand-built one declared aria-modal and did none
  // of that: focus fell to <body> on open and close, Tab walked out to controls
  // hidden behind the sheet, and Escape only worked from the input.
  useEffect(() => {
    if (isExpanded) {
      const dialog = dialogRef.current;
      if (dialog && !dialog.open) dialog.showModal();
      // Straight to the input where there is a keyboard. On touch, focusing it
      // would throw the software keyboard over the sheet the visitor just opened.
      if (window.matchMedia('(hover: hover)').matches) inputRef.current?.focus();
    } else if (wasExpandedRef.current) {
      expandButtonRef.current?.focus();
    }
    wasExpandedRef.current = isExpanded;
  }, [isExpanded, inputRef]);

  const handleExpand = () => {
    heldHeightRef.current = regionRef.current?.offsetHeight;
    onToggleExpand();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Expanded, Escape belongs to the dialog.
    if (e.key === 'Escape' && !isExpanded) {
      e.preventDefault();
      onClearInput?.();
    }
  };

  // Suggestions used to render only while `messages.length === 1`, so they
  // disappeared permanently after the first question and never appeared at all
  // for a returning visitor whose session history was restored. They now stay
  // available whenever the assistant has finished speaking — narrowed to a
  // couple of options once the conversation is under way, and rotated so a
  // repeat visitor isn't offered the same two every turn.
  const isOpeningTurn = messages.length === 1;
  const lastMessage = messages[messages.length - 1];
  const showSuggestions =
    !isLoading && !error && lastMessage?.role === 'assistant' && suggestedPrompts.length > 0;

  const visiblePrompts = isOpeningTurn
    ? suggestedPrompts
    : Array.from({ length: Math.min(FOLLOW_UP_PROMPT_COUNT, suggestedPrompts.length) }, (_, i) => {
        const offset = Math.floor(messages.length / 2) * FOLLOW_UP_PROMPT_COUNT;
        return suggestedPrompts[(offset + i) % suggestedPrompts.length] as string;
      });

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
              {/* What the assistant did to answer. Sits above the answer
                  because it happened before it, and because it is the one thing
                  on screen while the first tokens are still arriving. */}
              {msg.role === 'assistant' && msg.steps && msg.steps.length > 0 && (
                <div className="bb-chat-steps">{describeSteps(msg.steps)}</div>
              )}
              <div className="text">
                {msg.role === 'assistant' ? (
                  <AssistantMessage content={msg.content} isStreaming={isStreaming} />
                ) : (
                  msg.content
                )}
              </div>
              {/* What the answer was grounded in. The page claims retrieval
                  over the same record it renders; this is that claim made
                  checkable rather than asserted. */}
              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <div className="bb-chat-sources">
                  <span className="bb-chat-sources-label">Read from</span>
                  {msg.sources.map(source => (
                    <span
                      key={`${source.label}:${source.title}`}
                      className="bb-chat-source"
                      title={`${source.label} — ${source.title}`}
                    >
                      {source.title}
                    </span>
                  ))}
                </div>
              )}
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
            <span>{error}</span>
            {/* The error used to sit there until the next send, with nothing to
                act on and the question already lost from the input. */}
            <span className="bb-chat-error-actions">
              {canRetry && onRetry && (
                <button type="button" onClick={onRetry} disabled={isLoading}>
                  Retry
                </button>
              )}
              {onDismissError && (
                <button type="button" onClick={onDismissError}>
                  Dismiss
                </button>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const promptChips = showSuggestions && (
    <div className="bb-chat-prompts">
      {visiblePrompts.map(prompt => (
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
      aria-label="Ask the record"
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
        // Matched to the server-side PromptSchema limit. These were 500 and
        // 1000, so the input silently truncated questions the API would have
        // accepted.
        maxLength={CHAT_LIMITS.maxPromptLength}
      />
      <span id="chat-hint" className="sr-only">
        Press Enter to send your message, Escape to {isExpanded ? 'close' : 'clear'}
      </span>
      <button type="submit" disabled={isLoading || !input.trim()}>
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
        ref={expandButtonRef}
        onClick={handleExpand}
        aria-label="Expand chat"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
        Expand
      </button>
    </div>
  );

  // Rendered in exactly one place at a time. It used to mount in both, which put
  // two inputs on one id and two elements on every shared ref.
  const conversation = (
    <>
      {stream}
      {promptChips}
      {inputRow}
    </>
  );

  return (
    <>
      <div
        ref={regionRef}
        className={isExpanded ? 'invisible' : ''}
        role="region"
        aria-label="Resume chat assistant"
        // Holds the page's height while the conversation is in the dialog, so
        // closing it lands where it opened.
        style={isExpanded ? { minHeight: heldHeightRef.current } : undefined}
      >
        {actions}
        {!isExpanded && conversation}
      </div>

      {isExpanded && (
        <dialog
          ref={dialogRef}
          className="bb-chat-modal"
          aria-label="Expanded chat"
          onClose={onToggleExpand}
        >
          <div className="bb-chat-modal-card">
            <div className="bb-chat-modal-head">
              <span className="bb-chat-modal-title">
                <span className="mark" aria-hidden="true" />
                Ask the record
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
              {/* The inner column is what keeps a full-width sheet readable:
                  the body spans the viewport, the conversation inside it does
                  not. */}
              <div className="bb-chat-modal-inner">{conversation}</div>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
