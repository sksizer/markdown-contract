> Example 18a for [[D-0014-markdown-structure-validation|D-0014]] — camelCase key collision
> (contract-build error). Exercises the proposed API (proposed-shape.md); non-normative; where
> they disagree, that doc wins.

# 18a · camelCase key collision (contract-build error)

## Capability

Builds on 18 (OOM dual-key access). Stresses the *contract-build-time* guard behind the §6
dual-access guarantee: the OOM exposes each section under both its exact heading text and a
generated `lowerCamelCase` key (`doc.body.filesToTouch`). For that generated key to be
unambiguous, no two declared sections may collapse onto the same camelCase key. §6 states this is
"a contract-build error, caught at definition time, not at document time" — so the failure here is
raised when `contract(...)` is *evaluated*, before any document is seen. This is the build-time
mirror of 03a's document-time `structure/duplicate-section`.

## Use case

A contract author declares two distinct sections whose names differ only in casing/spacing:
`section("Files to touch")` and `section("Files To Touch")`. Both reduce to the camelCase key
`filesToTouch`, which would make `doc.body.filesToTouch` ambiguous. The two names are legitimately
distinct heading text — there is no document yet — so this cannot be a validation finding; it must
be rejected at the moment the contract is constructed.

## Sample document

There is no document. The defect lives in the contract definition, not in any markdown instance, so
this case is exercised purely by evaluating the contract below. (A document is shown only to make
clear that even a perfectly conforming one never gets the chance to validate.)

```md
## Files to touch
## Files To Touch
```

## Proposed contract

```ts
import { contract, sections, section } from "markdown-contract";

// Two distinct heading names that both reduce to the camelCase key `filesToTouch`.
// Per proposed-shape.md §6 this must fail at definition time, when contract(...) runs.
export const BadContract = contract({
  body: sections({ order: "none", allowUnknown: true }, [
    section("Files to touch"),
    section("Files To Touch"),
  ]),
});
```

## Expected findings

This case has no `validate()` call and therefore no `Finding[]`. The two outcomes are about
*building* the contract.

PASS — rename one section so the camelCase keys are distinct, then the contract builds and the OOM
keys are well-defined:

```ts
const GoodContract = contract({
  body: sections({ order: "none", allowUnknown: true }, [
    section("Files to touch"),     // → doc.body.filesToTouch
    section("Files changed"),      // → doc.body.filesChanged
  ]),
});
// Building succeeds; a later validate() of a conforming doc yields:
//   { findings: [], value: { frontmatter: {}, body: { filesToTouch: {}, filesChanged: {} } } }
```

FAIL — evaluating `BadContract` above (both names → `filesToTouch`) throws at definition time:

```text
ContractBuildError: section names ‘Files to touch’ and ‘Files To Touch’
  both generate the camelCase key ‘filesToTouch’; generated OOM keys must be unique
```

Because the error is thrown by `contract(...)`, the module that declares `BadContract` fails to
load — `BadContract.validate(...)` is never reachable, and no `Finding` object is produced. This is
the deliberate contrast with 03a: a *document* repeating a heading is a runtime `error`-level
finding; a *contract* whose declared names collide is a build-time throw.

## Gaps & questions

The §6 guarantee that this is "caught at definition time" is stated, but the *mechanism* is not
documented — so the case is only partially expressible against the API as written.

- The proposed surface (§3) types `contract<F, B>(def): Contract<F, B>` as a total function with no
  documented failure mode. There is no `ContractBuildError` type, no thrown-error contract, and no
  build-time diagnostic shape; `Finding`/`level` (§4) are explicitly document-validation outputs
  ("contract data, not call-site choice"), not build errors. The thrown class name and message
  above are invented.
- The camelCase derivation rule itself is named only by example (`"Files to touch"` →
  `filesToTouch`); the normalization (whitespace, punctuation, slashes as in
  `"Goal / Problem statement"`) is unspecified, so *which* name pairs collide is undefined.

Smallest delta that closes the gap: document in §3 that `contract(...)` throws a typed
`ContractBuildError` (id + message + the colliding names) when two declared section names — at the
same level — produce the same generated key, and pin the camelCase normalization rule (e.g. split
on non-alphanumeric runs, drop empties, lowerCamel-join) as the basis for collision detection.

Open question for human review: should the collision be a hard throw at build time (matching the §6
wording), or should it instead surface lazily — as a `contract/key-collision` finding the first time
`validate()`/`read()` is called — so a malformed contract can still be introspected? And does the
guard run per level (siblings only) or across the whole nested tree?
