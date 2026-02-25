import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from './markdown-components';

interface AssistantMessageProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * Renders an assistant message with markdown formatting.
 * Includes a streaming cursor indicator when the message is being generated.
 */
export function AssistantMessage({ content, isStreaming = false }: AssistantMessageProps) {
  return (
    <>
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </Markdown>
      {isStreaming && (
        <span
          className="inline-block w-2 h-4 ml-1 bg-red-500 dark:bg-red-400 animate-pulse"
          aria-hidden="true"
        />
      )}
    </>
  );
}
