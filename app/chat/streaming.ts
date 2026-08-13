import type { ContextSource } from './context';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const;

function frame(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

const DONE_FRAME = 'data: [DONE]\n\n';

/**
 * Wraps a fixed message (e.g. a guardrail redirect) as a single-chunk SSE
 * response.
 *
 * The payload goes through JSON.stringify. It was previously built by string
 * interpolation into a JSON literal, which happened to work only because the
 * one message ever passed in contained no quote, backslash, or newline.
 */
export function sseMessageResponse(message: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(frame({ content: message })));
      controller.enqueue(encoder.encode(DONE_FRAME));
      controller.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}

/**
 * Transforms a Workers AI stream (`data: {"response":"text"}`) into this app's
 * SSE format (`data: {"content":"text"}`), invoking onComplete with the full
 * accumulated text.
 *
 * Sources are emitted as a *trailing* frame, derived from the finished answer by
 * `resolveSources`. They were previously sent up front, computed from retrieval
 * scores alone — which meant they named the highest-scoring chunks rather than
 * the ones the answer was actually built from, and the two are not the same
 * whenever the best match is not the one that answered. Attribution needs the
 * answer to exist, so the frame has to come last.
 */
export function sseTransformResponse(
  stream: ReadableStream,
  onComplete: (accumulatedResponse: string) => void,
  resolveSources?: (accumulatedResponse: string) => ContextSource[]
): Response {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let accumulatedResponse = '';

  const transformedStream = new ReadableStream({
    async start(controller) {
      const reader = stream.getReader();

      // Workers AI streams in SSE format: data: {"response":"text"}
      const processLine = (line: string) => {
        if (!line.startsWith('data: ')) return;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') return;
        try {
          const parsed = JSON.parse(jsonStr) as { response?: string };
          if (parsed.response) {
            accumulatedResponse += parsed.response;
            controller.enqueue(encoder.encode(frame({ content: parsed.response })));
          }
        } catch {
          // Malformed event - skip
        }
      };

      try {
        // SSE events can be split across network chunks, so buffer the trailing
        // partial line and prepend it to the next chunk instead of dropping it.
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            buffer += decoder.decode();
            if (buffer) processLine(buffer);

            if (accumulatedResponse) {
              // Attribution failing must not cost the reader their answer, which
              // has already streamed in full by this point.
              try {
                const sources = resolveSources?.(accumulatedResponse) ?? [];
                if (sources.length) {
                  controller.enqueue(encoder.encode(frame({ type: 'sources', sources })));
                }
              } catch (error) {
                console.error('[chat-stream] source attribution failed', error);
              }
            }

            controller.enqueue(encoder.encode(DONE_FRAME));
            if (accumulatedResponse) {
              onComplete(accumulatedResponse);
            }
            controller.close();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            processLine(line);
          }
        }
      } catch (error) {
        // Send an error frame and close cleanly rather than calling
        // controller.error(), which aborts the body and leaves the client with
        // a truncated stream and nothing to explain it. The failure is logged
        // here because this is the only place that sees it — the outer handler
        // has already returned the response by the time the stream breaks.
        console.error('[chat-stream] failed mid-stream', error);
        try {
          controller.enqueue(
            encoder.encode(frame({ type: 'error', error: 'The response was interrupted.' }))
          );
          controller.enqueue(encoder.encode(DONE_FRAME));
          controller.close();
        } catch {
          controller.error(error);
        }
      }
    },
  });

  return new Response(transformedStream, { headers: SSE_HEADERS });
}
