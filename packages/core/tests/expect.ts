/**
 * Shared narrowing assertion helpers for the test suites.
 *
 * Under `strict` + `noUncheckedIndexedAccess`, an indexed read (`arr[0]`), a `Map.get(k)`,
 * or an `Array.find(...)` is statically `T | undefined`. A test that means "this value is
 * present — fail loudly if it isn't" should assert that presence ONCE, honestly, rather than
 * silence the type with a `!` at every use.
 *
 * `expect(x).toBeDefined()` does NOT narrow `x`'s static type — Vitest's matcher carries no
 * `asserts` signature — so these helpers do the narrowing themselves: `expectDefined` is an
 * assertion function, `first` / `byName` throw on the empty/missing case and return the
 * non-nullable value. A thrown error fails the enclosing test cleanly (with a locating message)
 * exactly where a stray `undefined` would otherwise have crashed with a less legible read.
 */

/**
 * Assert `value` is neither `null` nor `undefined`, narrowing its static type for the code that
 * follows. Throws (failing the test) with an optional `label` for locating the failure.
 */
export function expectDefined<T>(value: T, label?: string): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(`expected a defined value${label ? ` (${label})` : ""}, got ${String(value)}`);
  }
}

/** The first element of `arr`, or throw (failing the test) when it is empty. */
export function first<T>(arr: readonly T[], label?: string): T {
  const [head] = arr;
  if (head === undefined) {
    throw new Error(
      `expected a non-empty array${label ? ` (${label})` : ""}, got length ${arr.length}`,
    );
  }
  return head;
}

/**
 * Find the single item whose `name` matches, or throw (failing the test) when none does — the
 * shared, throwing replacement for the per-fixture `byName` copies that returned `undefined` and
 * were asserted with `!` at every call site.
 */
export function byName<T extends { name: string }>(items: readonly T[], name: string): T {
  const found = items.find((item) => item.name === name);
  if (found === undefined) {
    throw new Error(
      `no item named ‘${name}’ (have: ${items.map((i) => i.name).join(", ") || "∅"})`,
    );
  }
  return found;
}
