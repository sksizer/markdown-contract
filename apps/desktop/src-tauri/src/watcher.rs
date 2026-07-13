//! Scan-on-change (D-0018 §D5): one recursive `notify` watcher per
//! watch-enabled vault, mirroring the Bun daemon's watcher semantics
//! (apps/web/src/daemon/watcher.ts): 300 ms trailing debounce, only
//! `.md`/`.yaml`/`.yml` changes count, `.git`/`node_modules`/dotfile trees
//! are ignored. Fires `run_scan` with trigger "watch".
//!
//! Rearming: rather than hooking each generated store method, the module
//! subscribes to the Store's change broadcast (the seam the generated CRUD
//! already emits on) and rebuilds the watcher set whenever a Vault row
//! changes — create/update/delete all converge on one resync.

use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Manager};
use tokio::sync::mpsc;

use crate::AppState;
use crate::schema::EntityKind;

/// Quiet window after the last relevant event before a vault's re-scan fires
/// (same value as the Bun watcher's DEBOUNCE_MS).
pub const DEBOUNCE: Duration = Duration::from_millis(300);

/// Does a changed vault-relative path warrant a re-scan? Mirror of
/// `isRelevantChange` in apps/web/src/daemon/watcher.ts: dotfile/`.git`/
/// `node_modules` segments never do; otherwise only markdown and contract
/// config extensions count.
pub fn is_relevant_change(rel_path: &str) -> bool {
    let posix = rel_path.replace('\\', "/");
    let segments: Vec<&str> = posix.split('/').collect();
    if segments
        .iter()
        .any(|s| *s == ".git" || *s == "node_modules" || (s.starts_with('.') && *s != "."))
    {
        return false;
    }
    let extension = posix.rsplit('.').next().unwrap_or("").to_ascii_lowercase();
    posix.contains('.') && matches!(extension.as_str(), "md" | "yaml" | "yml")
}

/// Trailing debounce: after the first tick, wait for a full `quiet` gap in
/// the tick stream, then fire once; repeat. Returns when the sender closes.
pub async fn debounce<F, Fut>(mut ticks: mpsc::UnboundedReceiver<()>, quiet: Duration, mut fire: F)
where
    F: FnMut() -> Fut,
    Fut: Future<Output = ()>,
{
    while ticks.recv().await.is_some() {
        loop {
            match tokio::time::timeout(quiet, ticks.recv()).await {
                Ok(Some(())) => {}  // another event — keep waiting
                Ok(None) => return, // sender gone mid-burst
                Err(_) => break,    // quiet window elapsed
            }
        }
        fire().await;
    }
}

/// One armed vault watch: the notify handle (watching stops when dropped)
/// and its debounce task.
struct WatchEntry {
    _watcher: RecommendedWatcher,
    debouncer: tauri::async_runtime::JoinHandle<()>,
}

impl Drop for WatchEntry {
    fn drop(&mut self) {
        self.debouncer.abort();
    }
}

/// Arm the watching lifecycle: build watchers for the current vault set, then
/// rebuild on every Vault change event. Called once from app setup.
pub fn spawn(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let state: Arc<AppState> = app.state::<Arc<AppState>>().inner().clone();
        let mut changes = match state.store().await {
            Ok(store) => store.subscribe(),
            Err(e) => {
                eprintln!("watcher: store unavailable, watching disabled: {e}");
                return;
            }
        };
        let mut active: HashMap<String, WatchEntry> = HashMap::new();
        sync(&app, &state, &mut active).await;
        loop {
            match changes.recv().await {
                Ok(change) if matches!(change.kind, EntityKind::Vault) => {
                    sync(&app, &state, &mut active).await;
                }
                Ok(_) => {}
                // Lagged: resync to be safe; Closed: store dropped, stop.
                Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {
                    sync(&app, &state, &mut active).await;
                }
                Err(tokio::sync::broadcast::error::RecvError::Closed) => return,
            }
        }
    });
}

/// Rebuild the watcher set from the registry: every watch-enabled vault gets
/// a fresh recursive watch (paths may have changed, so rebuild-all is the
/// simple correct move at vault-registry scale).
async fn sync(app: &AppHandle, state: &Arc<AppState>, active: &mut HashMap<String, WatchEntry>) {
    let vaults = match state.store().await {
        Ok(store) => match store.list_vaults(None, None).await {
            Ok(vaults) => vaults,
            Err(e) => {
                eprintln!("watcher: listing vaults failed: {e}");
                return;
            }
        },
        Err(e) => {
            eprintln!("watcher: store unavailable: {e}");
            return;
        }
    };
    active.clear();
    for vault in vaults.into_iter().filter(|v| v.watch_enabled) {
        match start_watch(app.clone(), &vault.id, &vault.path) {
            Ok(entry) => {
                active.insert(vault.id, entry);
            }
            Err(e) => {
                // Recursive watch unavailable (missing dir, platform edge) —
                // the vault just isn't live, matching the Bun watcher.
                eprintln!(
                    "watcher: cannot watch '{}' at {}: {e}",
                    vault.id, vault.path
                );
            }
        }
    }
}

/// Start one recursive watch: notify events are filtered to relevant
/// vault-relative paths, debounced 300 ms, then a "watch"-triggered scan runs.
fn start_watch(app: AppHandle, vault_id: &str, root: &str) -> notify::Result<WatchEntry> {
    let (tx, rx) = mpsc::unbounded_channel();
    let root_path = std::path::PathBuf::from(root);
    let filter_root = root_path.clone();
    let mut watcher = notify::recommended_watcher(move |event: notify::Result<notify::Event>| {
        let Ok(event) = event else { return };
        if event.paths.is_empty() {
            // An unknown change — re-run to be safe (the Bun watcher's
            // null-filename rule).
            let _ = tx.send(());
            return;
        }
        for path in &event.paths {
            let rel = path.strip_prefix(&filter_root).unwrap_or(path);
            if is_relevant_change(&rel.to_string_lossy()) {
                let _ = tx.send(());
                return;
            }
        }
    })?;
    watcher.watch(Path::new(root), RecursiveMode::Recursive)?;

    let id = vault_id.to_string();
    let debouncer = tauri::async_runtime::spawn(async move {
        let state: Arc<AppState> = app.state::<Arc<AppState>>().inner().clone();
        debounce(rx, DEBOUNCE, || {
            let state = state.clone();
            let id = id.clone();
            async move {
                if let Err(e) = crate::scans::run_scan(&state, &id, "watch").await {
                    eprintln!("watcher: scan of '{id}' failed: {e}");
                }
            }
        })
        .await;
    });

    Ok(WatchEntry {
        _watcher: watcher,
        debouncer,
    })
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};

    use super::*;

    // The filter contract, mirrored from the Bun watcher's peer test:
    // markdown and contract configs re-run; everything else doesn't.
    #[test]
    fn markdown_and_contract_configs_are_relevant() {
        assert!(is_relevant_change("README.md"));
        assert!(is_relevant_change("docs/guide.md"));
        assert!(is_relevant_change("markdown-contract.yaml"));
        assert!(is_relevant_change("sub/dir/rules.yml"));
        assert!(is_relevant_change("UPPER/CASE.MD"));
    }

    #[test]
    fn other_files_are_not_relevant() {
        assert!(!is_relevant_change("notes.txt"));
        assert!(!is_relevant_change("src/main.rs"));
        assert!(!is_relevant_change("image.png"));
        assert!(!is_relevant_change("md")); // no extension at all
    }

    #[test]
    fn ignored_trees_and_dotfiles_are_not_relevant() {
        assert!(!is_relevant_change(".git/config.yaml"));
        assert!(!is_relevant_change("docs/node_modules/pkg/readme.md"));
        assert!(!is_relevant_change(".obsidian/workspace.yml"));
        assert!(!is_relevant_change("docs/.hidden/file.md"));
        assert!(!is_relevant_change(".hidden.md"));
    }

    #[test]
    fn windows_separators_are_normalized() {
        assert!(is_relevant_change("docs\\guide.md"));
        assert!(!is_relevant_change(".git\\config.yaml"));
    }

    // The debounce contract: a burst of events fires exactly once, after the
    // quiet window; a second burst fires again.
    #[tokio::test]
    async fn a_burst_fires_once_and_a_later_burst_fires_again() {
        let (tx, rx) = mpsc::unbounded_channel();
        let fired = Arc::new(AtomicUsize::new(0));
        let counted = fired.clone();
        let quiet = Duration::from_millis(20);

        let task = tokio::spawn(async move {
            debounce(rx, quiet, move || {
                let counted = counted.clone();
                async move {
                    counted.fetch_add(1, Ordering::SeqCst);
                }
            })
            .await;
        });

        for _ in 0..5 {
            tx.send(()).unwrap();
        }
        tokio::time::sleep(quiet * 3).await;
        assert_eq!(
            fired.load(Ordering::SeqCst),
            1,
            "burst collapses to one run"
        );

        tx.send(()).unwrap();
        tokio::time::sleep(quiet * 3).await;
        assert_eq!(fired.load(Ordering::SeqCst), 2, "a later burst fires again");

        drop(tx);
        task.await.unwrap();
    }
}
