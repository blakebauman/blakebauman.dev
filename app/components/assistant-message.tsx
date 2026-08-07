import { MarkdownLite } from './markdown-lite';

interface AssistantMessageProps {
  content: string;
  isStreaming?: boolean;
}

export function AssistantMessage({ content, isStreaming = false }: AssistantMessageProps) {
  return (
    <>
      <MarkdownLite content={content} />
      {isStreaming && <span className="bb-chat-cursor" aria-hidden="true" />}
    </>
  );
}
