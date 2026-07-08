use tauri::State;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

pub struct AppSettings {
    pub launch_at_startup: bool,
    pub default_tool: String,
    pub theme: String,
    pub language: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            launch_at_startup: false,
            default_tool: "claude-code".to_string(),
            theme: "dark".to_string(),
            language: "zh".to_string(),
        }
    }
}

pub struct SettingsState(pub Mutex<AppSettings>);

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SettingsDto {
    pub launch_at_startup: bool,
    pub default_tool: String,
    pub theme: String,
    pub language: String,
}

#[tauri::command]
pub fn get_settings(state: State<'_, SettingsState>) -> Result<SettingsDto, String> {
    let s = state.0.lock().map_err(|e| e.to_string())?;
    Ok(SettingsDto {
        launch_at_startup: s.launch_at_startup,
        default_tool: s.default_tool.clone(),
        theme: s.theme.clone(),
        language: s.language.clone(),
    })
}

#[tauri::command]
pub fn update_settings(
    launch_at_startup: bool,
    default_tool: String,
    theme: String,
    language: String,
    state: State<'_, SettingsState>,
) -> Result<(), String> {
    let mut s = state.0.lock().map_err(|e| e.to_string())?;
    s.launch_at_startup = launch_at_startup;
    s.default_tool = default_tool;
    s.theme = theme;
    s.language = language;
    Ok(())
}

#[tauri::command]
pub fn get_tool_paths() -> Vec<ToolPath> {
    let home = dirs_next::home_dir().unwrap_or_default();
    vec![
        ToolPath {
            tool_id: "claude-code".to_string(),
            name: "Claude Code".to_string(),
            path: home.join(".claude").join("skills").to_string_lossy().to_string(),
            exists: home.join(".claude").join("skills").exists(),
        },
        ToolPath {
            tool_id: "agents".to_string(),
            name: "Agents".to_string(),
            path: home.join(".agents").join("skills").to_string_lossy().to_string(),
            exists: home.join(".agents").join("skills").exists(),
        },
        ToolPath {
            tool_id: "cc-switch".to_string(),
            name: "cc-switch".to_string(),
            path: home.join(".cc-switch").join("skills").to_string_lossy().to_string(),
            exists: home.join(".cc-switch").join("skills").exists(),
        },
    ]
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ToolPath {
    pub tool_id: String,
    pub name: String,
    pub path: String,
    pub exists: bool,
}

#[tauri::command]
pub fn get_app_stats(state: State<'_, crate::commands::skills::DbState>) -> Result<AppStats, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let total_skills: i64 = conn.query_row(
        "SELECT COUNT(*) FROM skills", [], |r| r.get(0)
    ).unwrap_or(0);
    let enabled_skills: i64 = conn.query_row(
        "SELECT COUNT(*) FROM skills WHERE enabled=1", [], |r| r.get(0)
    ).unwrap_or(0);
    let total_workspaces: i64 = conn.query_row(
        "SELECT COUNT(*) FROM workspaces", [], |r| r.get(0)
    ).unwrap_or(0);
    let total_categories: i64 = conn.query_row(
        "SELECT COUNT(*) FROM categories WHERE is_system=0", [], |r| r.get(0)
    ).unwrap_or(0);
    Ok(AppStats { total_skills, enabled_skills, total_workspaces, total_categories })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppStats {
    pub total_skills: i64,
    pub enabled_skills: i64,
    pub total_workspaces: i64,
    pub total_categories: i64,
}
