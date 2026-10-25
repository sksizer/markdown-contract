#!/usr/bin/env bash
# Checks that the pinned corpus copy equals the corpus at the tag recorded in
# crates/markdown-contract-engine/tests/CORPUS-SOURCE. Sparse-clones the public
# source repo, checks that the tag points at the recorded commit, and diffs the
# two folders. Needs network access and git.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_file="$root/crates/markdown-contract-engine/tests/CORPUS-SOURCE"
pinned="$root/crates/markdown-contract-engine/tests/corpus"

field() { sed -n "s/^$1=//p" "$source_file"; }
repo="$(field repo)"
tag="$(field tag)"
commit="$(field commit)"
path="$(field path)"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

git -c advice.detachedHead=false clone --quiet --depth 1 --filter=blob:none --sparse --branch "$tag" "$repo" "$work/src"
git -C "$work/src" sparse-checkout set "$path"

actual="$(git -C "$work/src" rev-parse HEAD)"
if [ "$actual" != "$commit" ]; then
  echo "Tag $tag points at $actual, but CORPUS-SOURCE records $commit." >&2
  exit 1
fi

if ! diff -r "$work/src/$path" "$pinned"; then
  echo "The pinned corpus differs from $path at $tag (see the diff above)." >&2
  exit 1
fi
echo "Corpus pin OK ($tag, $commit)"
