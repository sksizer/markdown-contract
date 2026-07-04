/**
 * Peer test for the static face's pure core: `lookupAsset` maps a request
 * pathname to a manifest entry (the embedded-SPA resolution rules), given the
 * manifest explicitly — so the cases hold whether or not a UI build exists on
 * disk.
 */
import { describe, expect, test } from "bun:test";

import { lookupAsset } from "./static";

const manifest = {
  "/index.html": "embedded/index.html",
  "/_nuxt/app.js": "embedded/_nuxt/app.js",
  "/about/index.html": "embedded/about/index.html",
};

describe("lookupAsset", () => {
  test("an exact asset path resolves to its manifest entry", () => {
    expect(lookupAsset("/_nuxt/app.js", manifest)).toBe("embedded/_nuxt/app.js");
  });

  test("`/` resolves to the SPA shell", () => {
    expect(lookupAsset("/", manifest)).toBe("embedded/index.html");
  });

  test("a prerendered route resolves to its directory index (with or without the trailing slash)", () => {
    expect(lookupAsset("/about", manifest)).toBe("embedded/about/index.html");
    expect(lookupAsset("/about/", manifest)).toBe("embedded/about/index.html");
  });

  test("an unknown extension-less path falls back to the SPA shell (client-side routes)", () => {
    expect(lookupAsset("/some/spa/route", manifest)).toBe("embedded/index.html");
  });

  test("an unknown path WITH an extension is a miss (the server 404s)", () => {
    expect(lookupAsset("/missing.png", manifest)).toBeNull();
  });

  test("an empty manifest (the committed stub) never resolves anything", () => {
    expect(lookupAsset("/", {})).toBeNull();
    expect(lookupAsset("/anything", {})).toBeNull();
  });
});
