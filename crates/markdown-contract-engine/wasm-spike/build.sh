#!/usr/bin/env bash
# Build the wasm spike for all three wasm-pack targets and print artifact sizes.
#
# Prereqs (see FINDINGS.md §Tooling):
#   rustup target add wasm32-unknown-unknown
#   cargo install wasm-pack            # or the prebuilt-binary installer
#
# Usage:  ./build.sh
set -euo pipefail
cd "$(dirname "$0")"

for target in nodejs web bundler; do
  out="pkg-${target/nodejs/node}"
  echo "== wasm-pack build --target $target --out-dir $out =="
  wasm-pack build . --release --target "$target" --out-dir "$out"
done

echo
echo "== artifact sizes =="
wasm=pkg-node/markdown_contract_engine_wasm_spike_bg.wasm
printf 'wasm raw     : %s bytes\n' "$(wc -c < "$wasm")"
printf 'wasm gzip -9 : %s bytes\n' "$(gzip -9 -c "$wasm" | wc -c)"
command -v brotli >/dev/null && printf 'wasm brotli  : %s bytes\n' "$(brotli -q 11 -c "$wasm" | wc -c)" || true

echo
echo "== run the Node round-trip harness =="
node harness/run-node.cjs
