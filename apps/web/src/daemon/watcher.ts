/**
 * File watching — the optional freshness loop of D-0012 §D4: a recursive
 * `fs.watch` per watched vault, debounced, firing a callback the daemon maps to
 * "re-validate and push over SSE". Watching keeps the in-memory live status
 * fresh with zero persistence (explicitly DB-free).
 *
 * Scope: only markdown and contract-config changes trigger (`.md`, `.yaml`,
 * `.yml`); `.git`, `node_modules`, and dotfile trees are ignored.
 */
import { type FSWatcher, watch } from "node:fs";

/** Quiet window after the last event before a vault's re-run fires. */
const DEBOUNCE_MS = 300;

/** Does a changed relative path warrant a re-run? Exported for its peer test. */
export function isRelevantChange(relPath: string | null): boolean {
  // A null filename (some platforms under load) is an unknown change — re-run to be safe.
  if (relPath === null) return true;
  const posix = relPath.split("\\").join("/");
  const segments = posix.split("/");
  if (
    segments.some((s) => s === ".git" || s === "node_modules" || (s.startsWith(".") && s !== "."))
  ) {
    return false;
  }
  return /\.(?:md|ya?ml)$/i.test(posix);
}

interface ActiveWatch {
  watcher: FSWatcher;
  timer: ReturnType<typeof setTimeout> | null;
}

/**
 * The per-vault watcher registry. `start` is idempotent per id (restarts the
 * watch); `stop`/`stopAll` tear down watchers and any pending debounce.
 */
export class VaultWatcher {
  private active = new Map<string, ActiveWatch>();

  /** Watch `root` recursively; `onChange` fires at most once per quiet window. */
  start(id: string, root: string, onChange: () => void): boolean {
    this.stop(id);
    let entry: ActiveWatch;
    try {
      const watcher = watch(root, { recursive: true }, (_eventType, filename) => {
        if (!isRelevantChange(filename === null ? null : filename.toString())) return;
        if (entry.timer) clearTimeout(entry.timer);
        entry.timer = setTimeout(() => {
          entry.timer = null;
          onChange();
        }, DEBOUNCE_MS);
      });
      entry = { watcher, timer: null };
    } catch {
      // Recursive watch unavailable (platform/fs edge) — the vault just isn't live.
      return false;
    }
    this.active.set(id, entry);
    return true;
  }

  watching(id: string): boolean {
    return this.active.has(id);
  }

  stop(id: string): void {
    const entry = this.active.get(id);
    if (!entry) return;
    if (entry.timer) clearTimeout(entry.timer);
    entry.watcher.close();
    this.active.delete(id);
  }

  stopAll(): void {
    for (const id of [...this.active.keys()]) this.stop(id);
  }
}
