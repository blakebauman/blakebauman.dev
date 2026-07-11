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
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            if (accumulatedResponse) {
              onComplete(accumulatedResponse);
            }
            controller.close();
            break;
          }

          // Decode the chunk and extract content
          const text = decoder.decode(value, { stream: true });

          // Workers AI streams in SSE format: data: {"response":"text"}
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                continue;
              }
              try {
                const parsed = JSON.parse(jsonStr) as { response?: string };
                if (parsed.response) {
                  accumulatedResponse += parsed.response;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content: parsed.response })}\n\n`)
                  );
                }
              } catch {
                // Not valid JSON, might be partial - skip
              }
            }
          }
        }
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(transformedStream, { headers: SSE_HEADERS });
}
