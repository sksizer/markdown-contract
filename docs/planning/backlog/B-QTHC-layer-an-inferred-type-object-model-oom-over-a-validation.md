---
type: backlog
schema_version: '1'
id: B-QTHC
tags:
- architecture
- api
- types
last_reviewed: '2026-07-04'
---

# Layer an inferred-type object model (OOM) over a validation + raw-data-access layer

API layering idea: split the stack into two layers.

- **Lower layer — validation + data access.** Validates the input and returns a simple, non-inferred access over the validated data (plain/raw accessors; no inferred types).
- **Upper layer — OOM (object model).** Wraps the validation + low-level data access and exposes an inferred-typed data structure on top of it.

So: validation + data → simple non-inferred access; OOM → inferred-type structure built around the validation and the lower-level data access. The inferred typing lives only in the outer layer, keeping the validation/access core type-light and reusable.
