/**
 * A tiny in-memory CRUD store keyed by `id`, insertion-ordered — the backing for
 * the ontogen entity collections the daemon serves (`scan-runs`,
 * `finding-records`, `opener-preferences`). Live-only by design: like the status
 * layer (D-0012 §D4 layer 2), nothing here is persisted — a daemon restart
 * starts empty and re-derives on the next scan. Durable history (layer 3,
 * SQLite) is deferred.
 *
 * `update` follows the ontogen `Update…Input` convention: every field is
 * optional, and a field is applied only when it is present and non-null (a
 * `null`/absent field leaves the stored value untouched); `id` is never patched.
 */

/** A CRUD rejection a caller can fix (duplicate id on create) — maps to HTTP 409. */
export class MemStoreError extends Error {}

/** A patch over `T`: every field optional and nullable, `id` excluded (ontogen `Update…Input` shape). */
export type Patch<T> = { [K in Exclude<keyof T, "id">]?: T[K] | null };

export class MemStore<T extends { id: string }> {
  private items = new Map<string, T>();

  /** Every record, in insertion order. */
  list(): T[] {
    return [...this.items.values()];
  }

  /** One record by id, or undefined when unknown. */
  get(id: string): T | undefined {
    return this.items.get(id);
  }

  /** True iff a record with this id exists. */
  has(id: string): boolean {
    return this.items.has(id);
  }

  /** Insert a fully-formed record; throws `MemStoreError` if its id is already taken. */
  create(item: T): T {
    if (this.items.has(item.id)) {
      throw new MemStoreError(`already exists: ${item.id}`);
    }
    this.items.set(item.id, item);
    return item;
  }

  /**
   * Merge a patch into an existing record (present, non-null fields only; `id`
   * ignored). Returns the updated record, or undefined when the id is unknown.
   */
  update(id: string, patch: Patch<T>): T | undefined {
    const current = this.items.get(id);
    if (!current) return undefined;
    const next = { ...current };
    for (const [key, value] of Object.entries(patch)) {
      if (key === "id" || value === undefined || value === null) continue;
      (next as Record<string, unknown>)[key] = value;
    }
    this.items.set(id, next);
    return next;
  }

  /** Remove a record; returns false when the id was unknown. */
  delete(id: string): boolean {
    return this.items.delete(id);
  }
}
