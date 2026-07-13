/**
 * debounce — a tiny trailing-edge debouncer for form → YAML-buffer sync.
 *
 * Form text inputs commit through this (~300–400ms) so the buffer (the single
 * source of truth the YAML pane renders) tracks typing without a reparse per
 * keystroke. `flush()` is wired to blur/change so a pending edit always lands
 * before a mode switch, file switch, or save can observe the buffer.
 */

export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  /** Run the pending call NOW (no-op when nothing is pending). */
  flush(): void;
  /** Drop the pending call without running it. */
  cancel(): void;
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs = 300,
): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: A | null = null;

  const run = (): void => {
    if (pending === null) return;
    const args = pending;
    pending = null;
    fn(...args);
  };

  const call = ((...args: A): void => {
    pending = args;
    clearTimeout(timer);
    timer = setTimeout(run, delayMs);
  }) as Debounced<A>;

  call.flush = (): void => {
    clearTimeout(timer);
    run();
  };
  call.cancel = (): void => {
    clearTimeout(timer);
    pending = null;
  };

  return call;
}
