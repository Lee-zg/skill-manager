use tauri::State;
use crate::{
    commands::skills::DbState,
    db::repositories::{
        add_repository, delete_repository, list_repositories,
        mark_synced, toggle_repository, Repository,
    },
    installer::{install_skill_via_npx, search_registry, update_skill_via_npx, InstallResult, RemoteSkill},
};

// ── Repository CRUD ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_repositories_cmd(state: State<'_, DbState>) -> Result<Vec<Repository>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    list_repositories(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_repository_cmd(
    name: String, url: String, repo_type: String,
    branch: String, skills_dir: String, priority: i64,
    state: State<'_, DbState>,
) -> Result<Repository, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    add_repository(&conn, &name, &url, &repo_type, &branch, &skills_dir, priority)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_repository_cmd(
    id: String, enabled: bool, state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    toggle_repository(&conn, &id, enabled).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_repository_cmd(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    delete_repository(&conn, &id).map_err(|e| e.to_string())
}

// ── Discovery ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn search_registry_cmd(query: String) -> Result<Vec<RemoteSkill>, String> {
    search_registry(&query).await.map_err(|e| e.to_string())
}

// ── Installation ──────────────────────────────────────────────────────────────

#[tauri::command]
pub fn install_skill_cmd(
    source: String, tool_id: String,
    state: State<'_, DbState>,
) -> Result<InstallResult, String> {
    let result = install_skill_via_npx(&source, &tool_id)
        .map_err(|e| e.to_string())?;

    // After install, rescan to pick up the new skill
    if result.success {
        use crate::{
            adapters::{tools::{AgentsAdapter, CcSwitchAdapter, ClaudeCodeAdapter}, ToolAdapter},
            db::upsert_skill,
        };
        let adapters: Vec<Box<dyn ToolAdapter>> = vec![
            Box::new(ClaudeCodeAdapter),
            Box::new(AgentsAdapter),
            Box::new(CcSwitchAdapter),
        ];
        if let Ok(conn) = state.0.lock() {
            for adapter in &adapters {
                if adapter.id() == tool_id {
                    if let Ok(skills) = adapter.scan() {
                        for skill in skills { upsert_skill(&conn, &skill).ok(); }
                    }
                }
            }
        }
    }
    Ok(result)
}

#[tauri::command]
pub fn update_skill_cmd(
    skill_name: String, tool_id: String,
) -> Result<InstallResult, String> {
    update_skill_via_npx(&skill_name, &tool_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn check_updates_cmd(tool_id: String) -> Result<Vec<String>, String> {
    // Run `npx skills check` and parse output for available updates
    let target_dir = match tool_id.as_str() {
        "claude-code" => dirs_next::home_dir().map(|h| h.join(".claude").join("skills")),
        "agents"      => dirs_next::home_dir().map(|h| h.join(".agents").join("skills")),
        "cc-switch"   => dirs_next::home_dir().map(|h| h.join(".cc-switch").join("skills")),
        _             => return Err(format!("Unknown tool: {}", tool_id)),
    };

    let dir = target_dir.ok_or("Could not determine home directory")?;
    if !dir.exists() { return Ok(vec![]); }

    let output = std::process::Command::new("npx")
        .args(["skills", "check"])
        .current_dir(&dir)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    // Parse lines that mention "update available" pattern
    let updates: Vec<String> = stdout.lines()
        .filter(|l| l.contains("update") || l.contains("→") || l.contains("outdated"))
        .map(String::from)
        .collect();

    Ok(updates)
}
