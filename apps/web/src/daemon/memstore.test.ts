import { describe, expect, it } from "bun:test";

import { MemStore, MemStoreError } from "./memstore";

interface Pref {
  id: string;
  app_id: string;
  enabled: boolean;
  sort_order: number;
}

const pref = (id: string): Pref => ({ id, app_id: "code", enabled: true, sort_order: 0 });

describe("MemStore", () => {
  it("creates, lists in insertion order, and gets by id", () => {
    const store = new MemStore<Pref>();
    store.create(pref("a"));
    store.create(pref("b"));
    expect(store.list().map((p) => p.id)).toEqual(["a", "b"]);
    expect(store.get("a")?.app_id).toBe("code");
    expect(store.get("missing")).toBeUndefined();
  });

  it("rejects a duplicate id on create", () => {
    const store = new MemStore<Pref>();
    store.create(pref("a"));
    expect(() => store.create(pref("a"))).toThrow(MemStoreError);
  });

  it("update merges present, non-null fields and leaves the rest", () => {
    const store = new MemStore<Pref>();
    store.create(pref("a"));
    const updated = store.update("a", { enabled: false, app_id: null, sort_order: 5 });
    expect(updated).toEqual({ id: "a", app_id: "code", enabled: false, sort_order: 5 });
  });

  it("update on an unknown id returns undefined", () => {
    expect(new MemStore<Pref>().update("nope", { enabled: false })).toBeUndefined();
  });

  it("delete reports whether the id was present", () => {
    const store = new MemStore<Pref>();
    store.create(pref("a"));
    expect(store.delete("a")).toBe(true);
    expect(store.delete("a")).toBe(false);
    expect(store.list()).toEqual([]);
  });
});
