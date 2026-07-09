use tauri::State;
use serde::{Deserialize, Serialize};
use std::{path::PathBuf, process::Command};
use crate::{
    app_meta::CONFIG_DIR_NAME,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncResult {
    pub repository_id: String,
    pub scanned_skills: usize,
    pub message: String,
}

#[tauri::command]
pub fn sync_repository_cmd(id: String, state: State<'_, DbState>) -> Result<SyncResult, String> {
    let repository = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let repositories = list_repositories(&conn).map_err(|e| e.to_string())?;
        repositories
            .into_iter()
            .find(|repo| repo.id == id)
            .ok_or_else(|| "Repository not found".to_string())?
    };

    let scanned_skills = match repository.repo_type.as_str() {
        "registry" => 0,
        "local" => count_local_repository_skills(&repository.url, &repository.skills_dir)?,
        "git" => {
            let cache_path = sync_git_repository(&repository)?;
            count_skill_dirs(&cache_path.join(&repository.skills_dir))?
        }
        other => return Err(format!("Unsupported repository type: {}", other)),
    };

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    mark_synced(&conn, &repository.id).map_err(|e| e.to_string())?;
    Ok(SyncResult {
        repository_id: repository.id,
        scanned_skills,
        message: "同步完成".to_string(),
    })
}

fn repository_cache_dir(repository_id: &str) -> Result<PathBuf, String> {
    let base_dir = dirs_next::cache_dir()
        .ok_or_else(|| "Could not determine cache directory".to_string())?;
    Ok(base_dir.join(CONFIG_DIR_NAME).join("repositories").join(repository_id))
}

fn sync_git_repository(repository: &Repository) -> Result<PathBuf, String> {
    let cache_path = repository_cache_dir(&repository.id)?;
    if cache_path.exists() {
        let fetch_status = Command::new("git")
            .arg("-C")
            .arg(&cache_path)
            .args(["fetch", "--depth", "1", "origin"])
            .arg(&repository.branch)
            .status()
            .map_err(|e| e.to_string())?;
        if !fetch_status.success() {
            return Err("Git fetch failed".to_string());
        }

        let checkout_status = Command::new("git")
            .arg("-C")
            .arg(&cache_path)
            .args(["checkout", "FETCH_HEAD"])
            .status()
            .map_err(|e| e.to_string())?;
        if !checkout_status.success() {
            return Err("Git checkout failed".to_string());
        }
    } else {
        if let Some(parent) = cache_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let clone_status = Command::new("git")
            .args(["clone", "--depth", "1", "--branch"])
            .arg(&repository.branch)
            .arg(&repository.url)
            .arg(&cache_path)
            .status()
            .map_err(|e| e.to_string())?;
        if !clone_status.success() {
            return Err("Git clone failed".to_string());
        }
    }
    Ok(cache_path)
}

fn count_local_repository_skills(url: &str, skills_dir: &str) -> Result<usize, String> {
    count_skill_dirs(&PathBuf::from(url).join(skills_dir))
}

fn count_skill_dirs(skills_path: &PathBuf) -> Result<usize, String> {
    if !skills_path.exists() {
        return Ok(0);
    }
    let entries = std::fs::read_dir(skills_path).map_err(|e| e.to_string())?;
    let count = entries
        .filter_map(Result::ok)
        .filter(|entry| entry.path().join("SKILL.md").exists())
        .count();
    Ok(count)
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
    let mut result = install_skill_via_npx(&source, &tool_id)
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
                        for skill in skills {
                            if let Err(err) = upsert_skill(&conn, &skill) {
                                result.success = false;
                                result.message = format!("安装已执行，但数据库更新失败：{}", err);
                            }
                        }
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
