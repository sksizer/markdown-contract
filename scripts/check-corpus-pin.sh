#!/usr/bin/env bash
# Checks that the pinned corpus copy matches CORPUS-SOURCE, or rewrites the
# checksum with --update. The checksum covers every file path and content in the
# corpus folder, so any edit, addition or removal changes it.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dir="$root/crates/markdown-contract-engine/tests/corpus"
source_file="$root/crates/markdown-contract-engine/tests/CORPUS-SOURCE"

actual="$(cd "$dir" && LC_ALL=C find . -type f | LC_ALL=C sort | xargs shasum -a 256 | shasum -a 256 | cut -d' ' -f1)"

if [ "${1:-}" = "--update" ]; then
  sed -i.bak "s/^sha256=.*/sha256=$actual/" "$source_file" && rm "$source_file.bak"
  echo "sha256=$actual"
  exit 0
fi

expected="$(sed -n 's/^sha256=//p' "$source_file")"
if [ "$actual" != "$expected" ]; then
  echo "Corpus pin mismatch." >&2
  echo "  recorded: $expected" >&2
  echo "  actual:   $actual" >&2
  echo "The pinned corpus must equal $(sed -n 's/^tag=//p' "$source_file") in osdlc/osdlc." >&2
  exit 1
fi
echo "Corpus pin OK ($expected)"
