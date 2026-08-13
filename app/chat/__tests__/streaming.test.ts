import { describe, expect, it, vi } from 'vitest';
import { sseMessageResponse, sseTransformResponse } from '../streaming';

async function readFrames(response: Response): Promise<string[]> {
  const text = await response.text();
  return text
    .split('\n\n')
    .map(frame => frame.replace(/^data: /, '').trim())
    .filter(Boolean);
}

function upstream(chunks: string[]): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe('sseMessageResponse', () => {
  it('escapes the payload as JSON', async () => {
    // The frame used to be built by interpolating into a JSON string literal,
    // which worked only because the single message ever passed in happened to
    // contain no quote, backslash, or newline.
    const message = 'He said "no" \\ then\nleft';
    const frames = await readFrames(sseMessageResponse(message));

    expect(JSON.parse(frames[0] as string)).toEqual({ content: message });
    expect(frames[1]).toBe('[DONE]');
  });
});

describe('sseTransformResponse', () => {
  it('translates upstream response frames into content frames', async () => {
    const stream = upstream([
      'data: {"response":"Hello"}\n\n',
      'data: {"response":" world"}\n\n',
      'data: [DONE]\n\n',
    ]);

    const onComplete = vi.fn();
    const frames = await readFrames(sseTransformResponse(stream, onComplete));

    expect(frames.filter(f => f !== '[DONE]').map(f => JSON.parse(f).content)).toEqual([
      'Hello',
      ' world',
    ]);
    expect(onComplete).toHaveBeenCalledWith('Hello world');
  });

  it('reassembles frames split across network chunk boundaries', async () => {
    // Chunk boundaries do not respect SSE frame boundaries; dropping the
    // trailing partial line loses tokens silently.
    const stream = upstream(['data: {"resp', 'onse":"split"}\n\n', 'data: [DONE]\n\n']);

    const onComplete = vi.fn();
    await readFrames(sseTransformResponse(stream, onComplete));

    expect(onComplete).toHaveBeenCalledWith('split');
  });

  it('emits sources before any content', async () => {
    const stream = upstream(['data: {"response":"answer"}\n\n']);
    const sources = [{ label: 'Projects', title: 'felix' }];

    const frames = await readFrames(sseTransformResponse(stream, vi.fn(), sources));

    expect(JSON.parse(frames[0] as string)).toEqual({ type: 'sources', sources });
  });

  it('omits the sources frame when there are none', async () => {
    const frames = await readFrames(
      sseTransformResponse(upstream(['data: {"response":"a"}\n\n']), vi.fn())
    );

    expect(frames.some(f => f.includes('"sources"'))).toBe(false);
  });

  it('sends an error frame instead of aborting the body mid-stream', async () => {
    const failing = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"response":"partial"}\n\n'));
        controller.error(new Error('upstream died'));
      },
    });

    // controller.error() left the client with a truncated stream and nothing to
    // explain it. The client needs a frame it can render.
    const frames = await readFrames(sseTransformResponse(failing, vi.fn()));
    const errorFrame = frames
      .map(f => JSON.parse(f === '[DONE]' ? '{}' : f))
      .find(f => f.type === 'error');

    expect(errorFrame).toBeTruthy();
    expect(frames[frames.length - 1]).toBe('[DONE]');
  });

  it('ignores malformed upstream frames rather than failing the response', async () => {
    const stream = upstream([
      'data: not json\n\n',
      'data: {"response":"ok"}\n\n',
      'data: [DONE]\n\n',
    ]);

    const onComplete = vi.fn();
    await readFrames(sseTransformResponse(stream, onComplete));

    expect(onComplete).toHaveBeenCalledWith('ok');
  });

  it('does not call onComplete when nothing was generated', async () => {
    const onComplete = vi.fn();
    await readFrames(sseTransformResponse(upstream(['data: [DONE]\n\n']), onComplete));

    expect(onComplete).not.toHaveBeenCalled();
  });
});
