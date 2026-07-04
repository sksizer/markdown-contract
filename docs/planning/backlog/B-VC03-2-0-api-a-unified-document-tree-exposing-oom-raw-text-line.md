---
type: backlog
schema_version: '1'
id: B-VC03
tags:
- api
- consumption
- projection
last_reviewed: '2026-07-04'
---

# 2.0 API: a unified document tree exposing OOM, raw text, line iterator, and mdast at every level

Design a 2.0 read API built around a single navigable tree where every node — at every nesting level — offers multiple coordinated views of the same span:

- **OOM** — the typed consumption object model (read()/validate().doc) for that node.
- **Raw text** — the verbatim source bytes/string for the node's span.
- **Line iterator** — iterate the node's content by line (position-aware).
- **mdast** — the underlying mdast data structure for the node (optional / where it applies).

The goal is one coherent traversal where a consumer can descend the structure and, at any node, drop down to whichever representation they need — typed value, raw text, lines, or mdast — instead of re-parsing or re-scanning. Relates to the projection/dialect substrate and the consumption object model; think about how the existing tree vs doc boundary (D-0005) and projection (D-0002) map onto a per-node multi-view surface.
