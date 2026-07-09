//! The contract model + builder API (C-0005 / D-0008) — programmatic construction of the
//! body grammar the structure plane matches, mirroring the TS `section()` / `optional()`
//! / `oneOf()` / `gap()` / `sections()` combinators.
//!
//! This is also the **programmatic rule seam**: the [`Rule`] (node-scoped) and
//! [`DocRule`] (doc-scoped) traits mirror the TS `rule` / `docRule` escapes and are
//! invoked during validation — node rules per declared, present section, doc rules over
//! the whole projected tree.
//!
//! Content-plane seams (TODO, next phase): [`Contract::frontmatter`] and
//! [`LeafSpec::config`] exist and are carried inert — the structure plane reads only
//! `LeafSpec::kind` (the kind-gate); the frontmatter schema, table/list/code/maxWords
//! content checks, declarative text constraints, and the YAML loader land with the
//! content plane and are skipped by `validate` until then.

use crate::finding::Finding;
use crate::registry::Ctx;
use crate::tree::{BlockKind, DocTree, SectionNode};

// ── Rules: the programmatic escape (mirrors TS `rule` / `docRule`) ──────────────────

/// A node-scoped named rule, run against each declared, present section that carries it.
pub trait Rule {
    fn id(&self) -> &str;
    fn run(&self, node: &SectionNode, ctx: &Ctx) -> Vec<Finding>;
}

/// A doc-scoped named rule, run once over the whole projected tree.
pub trait DocRule {
    fn id(&self) -> &str;
    fn run(&self, tree: &DocTree, ctx: &Ctx) -> Vec<Finding>;
}

struct FnRule<F> {
    id: String,
    f: F,
}

impl<F> Rule for FnRule<F>
where
    F: Fn(&SectionNode, &Ctx) -> Vec<Finding>,
{
    fn id(&self) -> &str {
        &self.id
    }
    fn run(&self, node: &SectionNode, ctx: &Ctx) -> Vec<Finding> {
        (self.f)(node, ctx)
    }
}

struct FnDocRule<F> {
    id: String,
    f: F,
}

impl<F> DocRule for FnDocRule<F>
where
    F: Fn(&DocTree, &Ctx) -> Vec<Finding>,
{
    fn id(&self) -> &str {
        &self.id
    }
    fn run(&self, tree: &DocTree, ctx: &Ctx) -> Vec<Finding> {
        (self.f)(tree, ctx)
    }
}

/// A per-node named rule from a closure — the TS `rule(id, fn)`.
pub fn rule<F>(id: impl Into<String>, f: F) -> Box<dyn Rule>
where
    F: Fn(&SectionNode, &Ctx) -> Vec<Finding> + 'static,
{
    Box::new(FnRule { id: id.into(), f })
}

/// A doc-scoped named rule from a closure — the TS `docRule(id, fn)`.
pub fn doc_rule<F>(id: impl Into<String>, f: F) -> Box<dyn DocRule>
where
    F: Fn(&DocTree, &Ctx) -> Vec<Finding> + 'static,
{
    Box::new(FnDocRule { id: id.into(), f })
}

// ── Leaves & section options ─────────────────────────────────────────────────────────

/// A content leaf: the structural kind-gate (checked by the structure plane) plus the
/// inert `config` the content plane will interpret next phase.
#[derive(Debug, Clone, PartialEq)]
pub struct LeafSpec {
    pub kind: BlockKind,
    /// the raw leaf config (columns / minRows / everyItem / lang / maxWords …), carried
    /// untouched for the content plane (TODO next phase — see module docs)
    pub config: Option<serde_yaml::Value>,
}

impl LeafSpec {
    pub fn new(kind: BlockKind) -> Self {
        Self { kind, config: None }
    }

    /// A table leaf (kind-gate only this phase).
    pub fn table() -> Self {
        Self::new(BlockKind::Table)
    }

    /// A list leaf (kind-gate only this phase).
    pub fn list() -> Self {
        Self::new(BlockKind::List)
    }

    /// A code leaf (kind-gate only this phase).
    pub fn code() -> Self {
        Self::new(BlockKind::Code)
    }

    /// A paragraph leaf (kind-gate only this phase).
    pub fn paragraph() -> Self {
        Self::new(BlockKind::Paragraph)
    }

    /// A paragraph leaf bounding word count — the TS `maxWords(n)`; the bound itself is
    /// content-plane config, inert this phase.
    pub fn max_words(n: u64) -> Self {
        let config = serde_yaml::to_value(std::collections::BTreeMap::from([("maxWords", n)])).ok();
        Self {
            kind: BlockKind::Paragraph,
            config,
        }
    }

    /// Attach a raw content-plane config (carried inert this phase).
    pub fn with_config(mut self, config: serde_yaml::Value) -> Self {
        self.config = Some(config);
        self
    }
}

/// A section's content declaration: a single leaf, or named leaves bound by `^anchor`.
pub enum SectionContent {
    Single(LeafSpec),
    /// `(anchor, leaf)` pairs, in declaration order
    Anchored(Vec<(String, LeafSpec)>),
}

/// Per-section options — the TS `SectionOpts`.
#[derive(Default)]
pub struct SectionOpts {
    pub optional: bool,
    pub content: Option<SectionContent>,
    /// nested subsequence (recursion)
    pub children: Option<SectionSeq>,
    /// node-local named rules
    pub rules: Vec<Box<dyn Rule>>,
    /// require a `^block-id`, e.g. `"summary"`
    pub anchor: Option<String>,
    /// repeatable slot: the declared heading may recur as peers at one level
    pub repeatable: bool,
    /// minimum occurrence count for a repeatable slot (below → `structure/repeat-count`)
    pub min: Option<usize>,
    /// maximum occurrence count for a repeatable slot (above → `structure/repeat-count`)
    pub max: Option<usize>,
}

// ── The level grammar ─────────────────────────────────────────────────────────────────

/// `order` and `allow_unknown` are independent knobs over a level's content model.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Order {
    None,
    RecognizedRelative,
    Strict,
}

/// A level's options; defaults mirror the TS engine (`order: "none"`, `allowUnknown: true`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LevelOpts {
    pub order: Order,
    pub allow_unknown: bool,
}

impl Default for LevelOpts {
    fn default() -> Self {
        Self {
            order: Order::None,
            allow_unknown: true,
        }
    }
}

/// A declared section slot: one or more admissible heading spellings plus options.
pub struct SectionSpec {
    pub names: Vec<String>,
    pub opts: Option<SectionOpts>,
}

/// A `oneOf` slot: one required slot, several interchangeable spellings.
pub struct OneOfSpec {
    pub names: Vec<String>,
    pub opts: Option<SectionOpts>,
}

/// A `gap()` window admitting unknown sections, optionally bounded.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct GapSpec {
    pub min: Option<usize>,
    pub max: Option<usize>,
}

/// One element of a level's ordered content model — the output of the builder functions.
pub enum Spec {
    Section(SectionSpec),
    Optional(Box<Spec>),
    OneOf(OneOfSpec),
    Gap(GapSpec),
}

/// The body grammar of one level — the output of [`sections`].
#[derive(Default)]
pub struct SectionSeq {
    pub opts: LevelOpts,
    pub specs: Vec<Spec>,
}

// ── Builders (mirror the TS combinators) ─────────────────────────────────────────────

/// A required section with a single exact heading — `section("Overview")`.
pub fn section(name: impl Into<String>) -> Spec {
    Spec::Section(SectionSpec {
        names: vec![name.into()],
        opts: None,
    })
}

/// A section with options — `section("Summary", { anchor: "summary", … })`.
pub fn section_with(name: impl Into<String>, opts: SectionOpts) -> Spec {
    Spec::Section(SectionSpec {
        names: vec![name.into()],
        opts: Some(opts),
    })
}

/// One required slot with several interchangeable spellings — `oneOf([...])`.
pub fn one_of<I, S>(names: I) -> Spec
where
    I: IntoIterator<Item = S>,
    S: Into<String>,
{
    Spec::OneOf(OneOfSpec {
        names: names.into_iter().map(Into::into).collect(),
        opts: None,
    })
}

/// A `oneOf` slot with options.
pub fn one_of_with<I, S>(names: I, opts: SectionOpts) -> Spec
where
    I: IntoIterator<Item = S>,
    S: Into<String>,
{
    Spec::OneOf(OneOfSpec {
        names: names.into_iter().map(Into::into).collect(),
        opts: Some(opts),
    })
}

/// Mark a spec optional — `optional(section("Appendix"))`.
pub fn optional(spec: Spec) -> Spec {
    Spec::Optional(Box::new(spec))
}

/// An unbounded gap window admitting unknown sections.
pub fn gap() -> Spec {
    Spec::Gap(GapSpec::default())
}

/// A bounded gap window — `gap({ min, max })`.
pub fn gap_bounds(min: Option<usize>, max: Option<usize>) -> Spec {
    Spec::Gap(GapSpec { min, max })
}

/// A level's ordered content model — `sections(opts, [ … ])`.
pub fn sections(opts: LevelOpts, specs: Vec<Spec>) -> SectionSeq {
    SectionSeq { opts, specs }
}

// ── The contract ──────────────────────────────────────────────────────────────────────

/// Placeholder for the frontmatter plane's declarative schema (TODO next phase — see
/// module docs): carried on the contract, not yet validated.
#[derive(Debug, Clone, PartialEq)]
pub struct FrontmatterSpec {
    pub schema: serde_yaml::Value,
}

/// A compiled contract for one markdown class: frontmatter schema (inert this phase),
/// body grammar, and doc-scoped rules.
#[derive(Default)]
pub struct Contract {
    /// TODO(content plane): validated next phase; carried inert now (see module docs)
    pub frontmatter: Option<FrontmatterSpec>,
    pub body: Option<SectionSeq>,
    /// cross-plane rules over the whole projected tree
    pub rules: Vec<Box<dyn DocRule>>,
}

impl Contract {
    pub fn new() -> Self {
        Self::default()
    }

    /// Set the body grammar.
    pub fn body(mut self, body: SectionSeq) -> Self {
        self.body = Some(body);
        self
    }

    /// Attach a doc-scoped rule.
    pub fn doc_rule(mut self, rule: Box<dyn DocRule>) -> Self {
        self.rules.push(rule);
        self
    }

    /// Set the (inert, next-phase) frontmatter schema.
    pub fn frontmatter(mut self, spec: FrontmatterSpec) -> Self {
        self.frontmatter = Some(spec);
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::finding::SourcePos;
    use crate::registry::{FindingSpec, Registry};

    // Contract first: the builder assembles the same shapes the TS combinators produce.
    #[test]
    fn builders_assemble_the_grammar() {
        let seq = sections(
            LevelOpts {
                order: Order::Strict,
                allow_unknown: false,
            },
            vec![
                section("Title"),
                one_of(["Goal", "Goal / Problem statement"]),
                gap_bounds(Some(1), Some(2)),
                optional(section("Appendix")),
            ],
        );
        assert_eq!(seq.specs.len(), 4);
        let Spec::Section(s) = &seq.specs[0] else {
            panic!("expected a section")
        };
        assert_eq!(s.names, vec!["Title"]);
        let Spec::OneOf(o) = &seq.specs[1] else {
            panic!("expected a oneOf")
        };
        assert_eq!(o.names.len(), 2);
        let Spec::Gap(g) = &seq.specs[2] else {
            panic!("expected a gap")
        };
        assert_eq!((g.min, g.max), (Some(1), Some(2)));
        let Spec::Optional(inner) = &seq.specs[3] else {
            panic!("expected optional")
        };
        assert!(matches!(**inner, Spec::Section(_)));
    }

    #[test]
    fn max_words_is_a_paragraph_kind_leaf() {
        // `maxWords(n)` gates on a paragraph; the bound itself is content-plane config.
        assert_eq!(LeafSpec::max_words(120).kind, BlockKind::Paragraph);
        assert_eq!(LeafSpec::table().kind, BlockKind::Table);
    }

    #[test]
    fn a_closure_rule_runs_against_a_node_and_mints_via_ctx() {
        let r = rule("summary/mentions-outcome", |node, ctx| {
            vec![
                ctx.finding(
                    FindingSpec::new(
                        "summary/mentions-outcome",
                        "Summary must mention the outcome",
                    )
                    .pos(node.pos),
                ),
            ]
        });
        let registry = Registry::default();
        let ctx = Ctx::new("doc.md", &registry);
        let node = SectionNode::new("Summary", 2, SourcePos::at(1, 1));
        let out = r.run(&node, &ctx);
        assert_eq!(r.id(), "summary/mentions-outcome");
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].path, "doc.md");
        assert_eq!(out[0].pos, Some(SourcePos::at(1, 1)));
    }

    #[test]
    fn default_level_opts_match_the_ts_defaults() {
        let opts = LevelOpts::default();
        assert_eq!(opts.order, Order::None);
        assert!(opts.allow_unknown);
    }
}
