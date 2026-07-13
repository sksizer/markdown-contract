//! The full ontogen pipeline (D-0018 §D4), wired the way the iron-log example
//! consumer does it: the annotated entities in `src/schema/` drive every
//! generated layer on each `cargo build`:
//!
//!   schema → SeaORM entities/conversions → DTOs → CRUD store (+ hook stubs)
//!          → API layer → Tauri IPC + Axum HTTP transports
//!          → TypeScript bindings (../app/bindings/, consumed by the Nuxt SPA)
//!
//! Hand-written code (scan orchestration, custom API fns) sits BEHIND the
//! generated API layer: ontogen scans `src/api/v1` for custom `pub fn`s and
//! generates the per-transport handlers for those too, so nothing is
//! hand-duplicated per transport.

use std::path::PathBuf;

use ontogen::clients::ClientGenerator;
use ontogen::servers::{NamingConfig, ServerGenerator};
use ontogen::{ClientsConfig, Pipeline, ServersConfig};

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    // Rerun when hand-written API modules change (src/api/v1/*.rs), but not
    // when the pipeline rewrites its own outputs (src/api/v1/generated/).
    // parse_schema emits the equivalent directives for src/schema itself.
    ontogen::emit_rerun_directives_excluding(&PathBuf::from("src/api/v1"), &["generated"]);

    let servers_config = ServersConfig {
        api_dir: "src/api/v1".into(),
        state_type: "AppState".into(),
        service_import_path: "crate::api::v1".into(),
        types_import_path: "crate::schema".into(),
        state_import: "crate::AppState".into(),
        naming: NamingConfig::default(),
        generators: vec![
            // The HTTP transport is generated unconditionally but only
            // compiled behind the `daemon` cargo feature (see
            // src/api/transport/mod.rs) — the daemon-convergence seam.
            ServerGenerator::HttpAxum {
                output: "src/api/transport/http/generated.rs".into(),
            },
            ServerGenerator::TauriIpc {
                output: "src/api/transport/ipc/generated.rs".into(),
            },
        ],
        rustfmt_edition: "2024".into(),
        sse_route_overrides: Default::default(),
        route_prefix: None,
        store_type: Some("Store".into()),
        store_import: Some("crate::store::Store".into()),
        pagination: None,
    };

    // NOTE: despite the standalone `gen_clients` being a documented no-op in
    // ontogen 0.2.x, the Pipeline builder DOES run TS client generation (the
    // ontogen-ts AST walker) from this config — iron-log ships the same shape.
    let clients_config = ClientsConfig {
        api_dir: "src/api/v1".into(),
        state_type: "AppState".into(),
        service_import_path: "crate::api::v1".into(),
        types_import_path: "crate::schema".into(),
        state_import: "crate::AppState".into(),
        naming: NamingConfig::default(),
        generators: vec![
            // One file with BOTH createHttpTransport() and createIpcTransport()
            // over the same Transport interface, plus the entity/DTO types —
            // the frontend picks IPC today, HTTP when the daemon face lands.
            ClientGenerator::HttpTauriIpcSplit {
                output: "../app/bindings/transport.ts".into(),
                bindings_path: "../app/bindings/types.ts".into(),
            },
        ],
        sse_route_overrides: Default::default(),
        ts_skip_commands: vec![],
        route_prefix: None,
        store_type: Some("Store".into()),
        store_import: Some("crate::store::Store".into()),
        pagination: None,
        schema_entities: Vec::new(),
        pool_extra_roots: Vec::new(),
        // Pipeline::build also auto-excludes the seaorm entity_output dir
        // (the per-entity `Relation` enums would otherwise make the TS type
        // pool ambiguous); nothing extra to exclude here.
        pool_exclude_paths: Vec::new(),
    };

    let pipeline = Pipeline::new("src/schema")
        .seaorm(
            "src/persistence/db/entities/generated",
            "src/persistence/db/conversions/generated",
        )
        .dtos("src/schema/dto")
        .store(
            "src/store/generated",
            Some::<PathBuf>("src/store/hooks".into()),
        )
        .api("src/api/v1/generated", "AppState")
        .servers(servers_config)
        .clients(clients_config);
    pipeline.build().unwrap_or_else(|e| {
        e.emit_cargo_warning();
        panic!("ontogen pipeline failed: {e}");
    });

    tauri_build::build();
}
