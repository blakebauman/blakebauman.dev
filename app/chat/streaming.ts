const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const;

// Wrap a fixed message (e.g. a guardrail redirect) as a single-chunk SSE response
export function sseMessageResponse(message: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: {"content":"${message}"}\n\n`));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}

// Transform a Workers AI stream (data: {"response":"text"}) into our SSE format
// (data: {"content":"text"}), invoking onComplete with the full accumulated text.
export function sseTransformResponse(
  stream: ReadableStream,
  onComplete: (accumulatedResponse: string) => void
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
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: parsed.response })}\n\n`)
            );
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
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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
        controller.error(error);
      }
    },
  });

  return new Response(transformedStream, { headers: SSE_HEADERS });
}
