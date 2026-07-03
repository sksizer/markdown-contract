/**
 * The SSE hub — `GET /api/events`, the live-status wire (D-0012 §D4 layer 2's
 * push path). Every subscribed browser gets every `SseEvent`; a short ring
 * buffer honors `Last-Event-ID` reconnects (EventSource auto-reconnect replays
 * what it missed instead of starting blind).
 */
import type { SseEvent } from "../../types/api";

/** How many events the reconnect ring buffer retains. */
const BUFFER_SIZE = 200;

/** Heartbeat comment cadence, keeping intermediaries from idling the socket out. */
const HEARTBEAT_MS = 15_000;

/** Omit that distributes over a union (plain `Omit` would collapse the payloads). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** What callers emit — the hub stamps `id` and `at`. */
export type SseEventInput = DistributiveOmit<SseEvent, "id" | "at">;

/** One wire frame: `id:` for resumption, `data:` the JSON event. */
function frame(event: SseEvent): string {
  return `id: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`;
}

export class SseHub {
  private clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
  private buffer: SseEvent[] = [];
  private nextId = 1;
  private encoder = new TextEncoder();

  /** Stamp, buffer, and broadcast an event to every connected client. */
  emit(input: SseEventInput): SseEvent {
    const event = { ...input, id: this.nextId++, at: new Date().toISOString() } as SseEvent;
    this.buffer.push(event);
    if (this.buffer.length > BUFFER_SIZE) this.buffer.shift();
    const bytes = this.encoder.encode(frame(event));
    for (const controller of this.clients) {
      try {
        controller.enqueue(bytes);
      } catch {
        this.clients.delete(controller);
      }
    }
    return event;
  }

  /** How many clients are connected right now (for logs/health). */
  get clientCount(): number {
    return this.clients.size;
  }

  /**
   * The `GET /api/events` handler: an unending `text/event-stream` response.
   * On connect, replays buffered events newer than `Last-Event-ID` (when the
   * reconnecting client sends one), then streams live events until the client
   * goes away.
   */
  handler(req: Request): Response {
    const lastIdHeader = req.headers.get("last-event-id");
    const lastId = lastIdHeader ? Number.parseInt(lastIdHeader, 10) : Number.NaN;
    const replay = Number.isFinite(lastId) ? this.buffer.filter((e) => e.id > lastId) : [];

    const clients = this.clients;
    const encoder = this.encoder;
    let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controllerRef = controller;
        // `retry:` tunes EventSource's reconnect delay; the comment line is a hello.
        controller.enqueue(encoder.encode(`retry: 2000\n: connected\n\n`));
        for (const event of replay) controller.enqueue(encoder.encode(frame(event)));
        clients.add(controller);
        heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            if (heartbeat) clearInterval(heartbeat);
          }
        }, HEARTBEAT_MS);
      },
      cancel() {
        if (controllerRef) clients.delete(controllerRef);
        if (heartbeat) clearInterval(heartbeat);
      },
    });

    // NOTE: no explicit `connection` header — Bun owns connection management for
    // streaming responses, and a hand-set value corrupts the chunked encoding.
    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
      },
    });
  }
}
