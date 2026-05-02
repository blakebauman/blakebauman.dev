import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from './markdown-components';

interface AssistantMessageProps {
  content: string;
  isStreaming?: boolean;
}

export function AssistantMessage({ content, isStreaming = false }: AssistantMessageProps) {
  return (
    <>
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </Markdown>
      {isStreaming && <span className="bb-chat-cursor" aria-hidden="true" />}
    </>
  );
}
