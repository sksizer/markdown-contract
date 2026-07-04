/**
 * The structure plane — the tree-grammar matcher (D-0003 / C-0005).
 *
 * `matchStructure(tree, body, ctx)` walks the projection's section tree against a level's
 * ordered `Spec[]`, recursing through `children`, and emits the `structure/*` findings:
 *
 *   - section presence       — `structure/section-missing`
 *   - ordering               — `structure/section-order` (order × allowUnknown × gap)
 *   - gap windows            — `structure/gap-count`
 *   - duplicates / aliases   — `structure/duplicate-section`
 *   - camelCase collisions   — `structure/key-collision`
 *   - the block kind-gate    — `structure/block-missing`, `structure/block-kind`
 *   - anchors                — `structure/anchor-missing`
 *   - node-local rules       — `rule(...)` carriers run here
 *
 * Kind and presence are structure; data shape is content (D-0001). This plane reads
 * `LeafSpec.kind` only — it never builds or runs the content Zod schema (that is T-5LW7).
 */
import { toCamelKey } from "./camel.js";
import type {
  BlockKind,
  BlockNode,
  Ctx,
  Finding,
  GapSpec,
  LeafSpec,
  OneOfSpec,
  OptionalSpec,
  SectionNode,
  SectionOpts,
  SectionSeq,
  SectionSpec,
  Spec,
} from "./types.js";

// ── Spec inspection helpers ──────────────────────────────────────────────────────

/** A declared section/oneOf slot, after `optional(...)` is unwrapped. */
interface Slot {
  /** index into the level's `specs` array (the gap-bearing one) */
  specIdx: number;
  /** the admissible heading spellings (alias set for oneOf / `section([...])`) */
  names: string[];
  optional: boolean;
  /** the section opts (content / children / rules / anchor), if any */
  opts?: SectionOpts;
}

/** Unwrap `optional(spec)` to its inner spec, tracking optionality. */
function unwrap(spec: Spec): { inner: SectionSpec | OneOfSpec | GapSpec; optional: boolean } {
  if (spec.kind === "optional") {
    const u = unwrap((spec as OptionalSpec).spec);
    return { inner: u.inner, optional: true };
  }
  return { inner: spec, optional: false };
}

/** Project the declared `Spec[]` into the ordered list of section/oneOf slots (gaps excluded). */
function slotsOf(specs: readonly Spec[]): Slot[] {
  const slots: Slot[] = [];
  specs.forEach((spec, specIdx) => {
    const { inner, optional } = unwrap(spec);
    if (inner.kind === "gap") return;
    if (inner.kind === "section") {
      const s = inner as SectionSpec;
      slots.push({
        specIdx,
        names: s.names,
        optional: optional || s.opts?.optional === true,
        opts: s.opts,
      });
    } else if (inner.kind === "oneOf") {
      const o = inner as OneOfSpec;
      slots.push({
        specIdx,
        names: o.names,
        optional: optional || o.opts?.optional === true,
        opts: o.opts,
      });
    }
  });
  return slots;
}

/** The index of the first slot whose name set contains `name`, or -1 (unknown). */
function slotForName(slots: Slot[], name: string): number {
  return slots.findIndex((s) => s.names.includes(name));
}

// ── The per-level match ──────────────────────────────────────────────────────────

/** A doc section paired with the declared slot it matches (or `null` when unknown). */
interface Assigned {
  node: SectionNode;
  /** index into `slots`, or `null` when the section matches no declared slot */
  slotIdx: number | null;
}

/**
 * Match one level: `nodes` (the sibling sections at this depth) against `specs` under
 * `opts`. Emits findings into `out`, then recurses into declared sections' `children`.
 */
function matchLevel(nodes: SectionNode[], seq: SectionSeq, ctx: Ctx, out: Finding[]): void {
  const specs = seq.specs;
  const order = seq.opts.order ?? "none";
  const allowUnknown = seq.opts.allowUnknown ?? true;
  const slots = slotsOf(specs);

  // ── Duplicate headings (exact) and camelCase key collisions (distinct headings) ──
  const seenName = new Map<string, SectionNode>();
  const seenKey = new Map<string, string>(); // camelKey → first heading text
  for (const node of nodes) {
    const prior = seenName.get(node.name);
    if (prior) {
      out.push(
        ctx.finding({
          id: "structure/duplicate-section",
          message: `duplicate section ‘${node.name}’; a heading must not repeat at one level`,
          pos: node.pos,
        }),
      );
      continue; // a duplicate cannot also collide a new key
    }
    seenName.set(node.name, node);
    const key = toCamelKey(node.name);
    if (key !== "") {
      const firstHeading = seenKey.get(key);
      if (firstHeading !== undefined && firstHeading !== node.name) {
        out.push(
          ctx.finding({
            id: "structure/key-collision",
            message: `‘${node.name}’ and ‘${firstHeading}’ collapse to the same key ‘${key}’; headings must yield distinct keys at one level`,
            pos: node.pos,
          }),
        );
      } else if (firstHeading === undefined) {
        seenKey.set(key, node.name);
      }
    }
  }

  // ── Assign each section to its declared slot (first occurrence binds the slot) ────
  const assigned: Assigned[] = nodes.map((node) => ({
    node,
    slotIdx: slotForOrNull(slots, node.name),
  }));

  // ── oneOf / alias ambiguity: a second distinct spelling filling an already-filled slot ──
  const slotBoundBy = new Map<number, string>(); // slotIdx → the heading that first filled it
  for (const a of assigned) {
    if (a.slotIdx === null) continue;
    const slot = slots[a.slotIdx];
    if (!slot) continue; // a.slotIdx is a valid slots index; guard narrows the type
    if (slot.names.length <= 1) continue; // single-spelling slot: handled by duplicate-section above
    const boundHeading = slotBoundBy.get(a.slotIdx);
    if (boundHeading === undefined) {
      slotBoundBy.set(a.slotIdx, a.node.name);
    } else if (boundHeading !== a.node.name) {
      out.push(
        ctx.finding({
          id: "structure/duplicate-section",
          message: `‘${a.node.name}’ is a second spelling of an alias set already filled by ‘${boundHeading}’; supply exactly one`,
          pos: a.node.pos,
        }),
      );
    }
  }

  // ── Missing required slots ───────────────────────────────────────────────────────
  const filledSlots = new Set<number>();
  for (const a of assigned) if (a.slotIdx !== null) filledSlots.add(a.slotIdx);
  slots.forEach((slot, slotIdx) => {
    if (slot.optional) return;
    if (filledSlots.has(slotIdx)) return;
    // Absence localizes to the document: pin pos to the first body heading when one exists,
    // else omit (an empty body has no line to point at). The fixtures pin line 1 / omit.
    const firstHeading = nodes[0];
    out.push(
      ctx.finding({
        id: "structure/section-missing",
        message: `required section ‘${slot.names.join("’ / ‘")}’ is missing`,
        ...(firstHeading ? { pos: firstHeading.pos } : {}),
      }),
    );
  });

  // ── Ordering + unknown admission ─────────────────────────────────────────────────
  if (order === "recognized-relative") {
    checkRecognizedRelative(assigned, ctx, out);
  } else if (order === "strict") {
    checkStrict(nodes, specs, slots, allowUnknown, ctx, out);
  }
  // `order === "none"`: no order check. Unknown admission for none/recognized-relative is
  // governed by allowUnknown (true ⇒ all admitted; false ⇒ a gap is required — handled below).

  if (order !== "strict" && !allowUnknown) {
    // Unknowns are only legal at a gap; with no gap declared, each unknown is out of place.
    const hasGap = specs.some((s) => unwrap(s).inner.kind === "gap");
    if (!hasGap) {
      for (const a of assigned) {
        if (a.slotIdx === null) {
          out.push(
            ctx.finding({
              id: "structure/section-order",
              message: `unexpected unknown section ‘${a.node.name}’; unknown sections are not permitted here`,
              pos: a.node.pos,
            }),
          );
        }
      }
    } else {
      // A gap exists but the level is unordered — count all unknowns against the (single) gap.
      checkUnorderedGap(assigned, specs, ctx, out);
    }
  }

  // ── The kind-gate, anchors, and node-local rules (per declared, present slot) ─────
  for (const a of assigned) {
    if (a.slotIdx === null) continue;
    const slot = slots[a.slotIdx];
    if (!slot || !slot.opts) continue; // a.slotIdx is a valid slots index; guard narrows the type
    runSectionChecks(a.node, slot.opts, ctx, out);
  }
}

/** First slot index for `name`, or `null` when unknown. */
function slotForOrNull(slots: Slot[], name: string): number | null {
  const i = slotForName(slots, name);
  return i === -1 ? null : i;
}

/**
 * recognized-relative: recognized sections must keep declared relative order; unknowns
 * interleave freely. Scanning recognized sections in document order, a section whose
 * declared index is *less* than the largest index already seen is the out-of-place one.
 */
function checkRecognizedRelative(assigned: Assigned[], ctx: Ctx, out: Finding[]): void {
  let maxSlot = -1;
  for (const a of assigned) {
    if (a.slotIdx === null) continue;
    if (a.slotIdx < maxSlot) {
      out.push(
        ctx.finding({
          id: "structure/section-order",
          message: `‘${a.node.name}’ appears after a later-declared section; recognized sections must keep declared order`,
          pos: a.node.pos,
        }),
      );
    } else {
      maxSlot = a.slotIdx;
    }
  }
}

/**
 * strict: recognized sections in declared order, contiguous; unknowns admitted only at a
 * `gap()` window. A positional walk over doc sections and declared specs:
 *   - a section matching the current slot consumes it;
 *   - a section matching a *later* slot while a required slot is pending has jumped ahead
 *     → `structure/section-order` at the jumper, then it consumes the later slot;
 *   - an unknown at a gap is admitted (counted for the gap bound); an unknown with no gap
 *     here and `allowUnknown: false` → `structure/section-order`.
 * Gap bounds are checked against each window's admitted count.
 */
function checkStrict(
  nodes: SectionNode[],
  specs: readonly Spec[],
  slots: Slot[],
  allowUnknown: boolean,
  ctx: Ctx,
  out: Finding[],
): void {
  // Per-spec gap windows: specIdx → { min, max, count, anchorPos }.
  const gapCount = new Map<number, number>();
  specs.forEach((s, i) => {
    if (unwrap(s).inner.kind === "gap") gapCount.set(i, 0);
  });

  /** Does `name` match a section/oneOf slot whose specIdx is ≥ `fromSpecIdx`? */
  function matchesSlotFrom(name: string, fromSpecIdx: number): number | null {
    for (const slot of slots) {
      if (slot.specIdx >= fromSpecIdx && slot.names.includes(name)) return slot.specIdx;
    }
    return null;
  }

  let specIdx = 0;
  let docIdx = 0;
  while (docIdx < nodes.length) {
    const node = nodes[docIdx];
    if (node === undefined) break; // docIdx < nodes.length holds; guard narrows the type

    if (specIdx >= specs.length) {
      // Past the declared sequence. A trailing gap (if the last spec was one) absorbs extras;
      // otherwise an unknown is out of place under allowUnknown:false. A recognized section
      // here matched an earlier (skipped) slot — its disorder was already flagged at the jumper.
      const lastSpec = specs[specs.length - 1];
      const lastWasGap = lastSpec !== undefined && unwrap(lastSpec).inner.kind === "gap";
      const slotIdx = slotForOrNull(slots, node.name);
      if (slotIdx === null && !lastWasGap && !allowUnknown) {
        out.push(
          ctx.finding({
            id: "structure/section-order",
            message: `unexpected section ‘${node.name}’ after the declared sequence`,
            pos: node.pos,
          }),
        );
      } else if (slotIdx === null && lastWasGap) {
        gapCount.set(specs.length - 1, (gapCount.get(specs.length - 1) ?? 0) + 1);
      }
      docIdx++;
      continue;
    }

    const spec = specs[specIdx];
    if (spec === undefined) break; // specIdx < specs.length holds here; guard narrows the type
    const u = unwrap(spec);

    if (u.inner.kind === "gap") {
      // Does this section anchor a later slot? Then close the gap and re-evaluate the section.
      if (matchesSlotFrom(node.name, specIdx + 1) !== null) {
        specIdx++;
        continue;
      }
      // Otherwise admit the unknown into the gap window.
      gapCount.set(specIdx, (gapCount.get(specIdx) ?? 0) + 1);
      docIdx++;
      continue;
    }

    // A section/oneOf slot at the cursor.
    const slot = slots.find((s) => s.specIdx === specIdx);
    if (!slot) {
      // The cursor spec is a non-gap section/oneOf, so slotsOf produced a slot for it; if none
      // is found (impossible), advance the cursor to keep the walk total.
      specIdx++;
      continue;
    }
    if (slot.names.includes(node.name)) {
      specIdx++;
      docIdx++;
      continue;
    }

    // Doesn't match the cursor slot. If it matches a later slot, it jumped ahead of this one.
    const later = matchesSlotFrom(node.name, specIdx + 1);
    if (later !== null) {
      if (!slot.optional) {
        out.push(
          ctx.finding({
            id: "structure/section-order",
            message: `‘${node.name}’ appears before required section ‘${slot.names.join("’ / ‘")}’; strict order is violated`,
            pos: node.pos,
          }),
        );
      }
      // Advance the cursor to the later slot and consume the section there.
      specIdx = later + 1;
      docIdx++;
      continue;
    }

    // The cursor slot is optional and unmatched → skip it and retry the section.
    if (slot.optional) {
      specIdx++;
      continue;
    }

    // An unknown section sitting on a required slot with no gap here.
    if (slotForOrNull(slots, node.name) === null) {
      if (!allowUnknown) {
        out.push(
          ctx.finding({
            id: "structure/section-order",
            message: `unexpected section ‘${node.name}’ in the strict prefix; extras are only permitted after a gap`,
            pos: node.pos,
          }),
        );
      }
      docIdx++;
      continue;
    }

    // A recognized section whose slot is earlier (already consumed/skipped): advance the cursor.
    specIdx++;
  }

  // Gap-count bounds.
  for (const [gapSpecIdx, count] of gapCount) {
    const gapSpec = specs[gapSpecIdx];
    if (gapSpec === undefined) continue; // gapCount keys are gap specIdxs; guard narrows the type
    const gap = unwrap(gapSpec).inner as GapSpec;
    const min = gap.min;
    const max = gap.max;
    if ((min !== undefined && count < min) || (max !== undefined && count > max)) {
      out.push(
        ctx.finding({
          id: "structure/gap-count",
          message:
            min !== undefined && count < min
              ? `gap admitted ${count} unknown sections; expected at least ${min}`
              : `gap admitted ${count} unknown sections; expected at most ${max}`,
          ...gapAnchorPos(specs, slots, nodes, gapSpecIdx),
        }),
      );
    }
  }
}

/**
 * Count unknowns against a single gap on an *unordered* level with `allowUnknown: false`.
 * (Order is unconstrained, so every unknown counts toward the lone gap window.)
 */
function checkUnorderedGap(
  assigned: Assigned[],
  specs: readonly Spec[],
  ctx: Ctx,
  out: Finding[],
): void {
  const gapSpecIdx = specs.findIndex((s) => unwrap(s).inner.kind === "gap");
  if (gapSpecIdx === -1) return;
  const gapSpec = specs[gapSpecIdx];
  if (gapSpec === undefined) return; // gapSpecIdx is a valid findIndex result; guard narrows the type
  const gap = unwrap(gapSpec).inner as GapSpec;
  const count = assigned.filter((a) => a.slotIdx === null).length;
  if ((gap.min !== undefined && count < gap.min) || (gap.max !== undefined && count > gap.max)) {
    out.push(
      ctx.finding({
        id: "structure/gap-count",
        message:
          gap.min !== undefined && count < gap.min
            ? `gap admitted ${count} unknown sections; expected at least ${gap.min}`
            : `gap admitted ${count} unknown sections; expected at most ${gap.max}`,
      }),
    );
  }
}

/** The pos a gap-count finding carries: the first heading after the gap, else omitted. */
function gapAnchorPos(
  specs: readonly Spec[],
  slots: Slot[],
  nodes: SectionNode[],
  gapSpecIdx: number,
): { pos?: SectionNode["pos"] } {
  // The slot immediately following the gap, if any, anchors the window.
  const after = slots.find((s) => s.specIdx > gapSpecIdx);
  if (!after) return {};
  const node = nodes.find((n) => after.names.includes(n.name));
  return node ? { pos: node.pos } : {};
}

// ── Per-section checks: kind-gate, anchors, node-local rules, recursion ───────────

function runSectionChecks(node: SectionNode, opts: SectionOpts, ctx: Ctx, out: Finding[]): void {
  // Anchor presence — a declared `^anchor` must resolve to a block or section anchor.
  if (opts.anchor !== undefined) {
    if (!anchorResolves(node, opts.anchor)) {
      out.push(
        ctx.finding({
          id: "structure/anchor-missing",
          message: `section ‘${node.name}’ is missing required block-id ^${opts.anchor}`,
          pos: node.pos,
        }),
      );
    }
  }

  // The content kind-gate — a single leaf, or named leaves bound by `^anchor`.
  if (opts.content !== undefined) {
    if (isLeafSpec(opts.content)) {
      kindGate(node, opts.content, undefined, ctx, out);
    } else {
      for (const [anchor, leaf] of Object.entries(opts.content)) {
        kindGate(node, leaf, anchor, ctx, out);
      }
    }
  }

  // Node-local rules.
  if (opts.rules) {
    for (const r of opts.rules) {
      out.push(...r.run(node, ctx));
    }
  }

  // Recurse into declared children.
  if (opts.children) {
    matchLevel(node.sections, opts.children, ctx, out);
  }
}

/** Whether an anchor id resolves to a block-bound or section-level anchor in this section. */
function anchorResolves(node: SectionNode, id: string): boolean {
  if (node.anchors.includes(id)) return true;
  return node.blocks.some((b) => b.anchor === id);
}

/** Structural type-guard: a single `LeafSpec` vs a `Record<string, LeafSpec>`. */
function isLeafSpec(c: LeafSpec | Record<string, LeafSpec>): c is LeafSpec {
  return typeof (c as LeafSpec).kind === "string";
}

/**
 * The kind-gate: a declared content slot must be filled by a block of the expected kind.
 *   - no block of any kind present (or, for an anchored leaf, no block at that anchor) →
 *     `structure/block-missing`;
 *   - a block present (at the anchor, or the section's lone block) but the wrong kind →
 *     `structure/block-kind`.
 * Data shape (columns / rows / items) is NOT checked here — that is the content plane (T-5LW7).
 */
function kindGate(
  node: SectionNode,
  leaf: LeafSpec,
  anchor: string | undefined,
  ctx: Ctx,
  out: Finding[],
): void {
  const expected: BlockKind = leaf.kind;
  const candidate = pickBlock(node, anchor);
  if (!candidate) {
    out.push(
      ctx.finding({
        id: "structure/block-missing",
        message: anchor
          ? `section ‘${node.name}’ is missing a ${expected} block at ^${anchor}`
          : `section ‘${node.name}’ is missing a ${expected} block`,
        pos: node.pos,
      }),
    );
    return;
  }
  if (candidate.kind !== expected) {
    out.push(
      ctx.finding({
        id: "structure/block-kind",
        message: `block in section ‘${node.name}’ is a ${candidate.kind}; expected a ${expected}`,
        pos: candidate.pos,
      }),
    );
  }
}

/**
 * The block a content slot addresses: when `anchor` is set, the block carrying that anchor
 * (or `null` if none); otherwise the section's first block of the expected role, here the
 * first block (a single-leaf slot addresses the section's sole content block).
 */
function pickBlock(node: SectionNode, anchor: string | undefined): BlockNode | null {
  if (anchor !== undefined) {
    return node.blocks.find((b) => b.anchor === anchor) ?? null;
  }
  return node.blocks[0] ?? null;
}

// ── Public entry ─────────────────────────────────────────────────────────────────

/**
 * Walk the projection's top-level sections against the body grammar, emitting every
 * `structure/*` finding. The result is returned in emission order; `validate()` applies
 * the deterministic sort (T-3NC8 finalizes the cross-plane merge).
 */
export function matchStructure(tree: { root: SectionNode }, body: SectionSeq, ctx: Ctx): Finding[] {
  const out: Finding[] = [];
  matchLevel(tree.root.sections, body, ctx, out);
  return out;
}

/**
 * Emit `structure/heading-depth-jump` (warn) for a sub-heading nested more than one level
 * below its parent section — an H2 immediately followed by an H4 (D-0002 D3 / D-0003). The
 * projection attaches the deeper heading to its nearest ancestor with its TRUE depth preserved
 * (no synthesized intermediate), so the jump is re-derivable here as `child.depth > parent.depth + 1`.
 *
 * Contract-independent: it scans the whole projected tree, not the grammar, so a malformed
 * outline is flagged whether or not a contract declares those sections. The synthetic root's
 * direct children (the top-level H2s) are not checked against it — "H1-title → H2" is the normal
 * step, and the root's depth is a projection artifact, not an authored heading.
 */
export function scanHeadingDepthJumps(root: SectionNode, ctx: Ctx): Finding[] {
  const out: Finding[] = [];
  const walk = (parent: SectionNode, isRoot: boolean): void => {
    for (const child of parent.sections) {
      if (!isRoot && child.depth > parent.depth + 1) {
        out.push(
          ctx.finding({
            id: "structure/heading-depth-jump",
            message: `heading ‘${child.name}’ (H${child.depth}) skips a level under ‘${parent.name}’ (H${parent.depth})`,
            pos: child.pos,
          }),
        );
      }
      walk(child, false);
    }
  };
  walk(root, true);
  return out;
}
