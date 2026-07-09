use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::db::workspaces::{
    activate_workspace, add_skill_to_workspace, create_workspace, delete_workspace,
    list_workspace_skills, list_workspaces, remove_skill_from_workspace, update_workspace,
    Workspace, WorkspaceSkill,
};
use crate::commands::skills::DbState;
use crate::{
    adapters::{
        tools::{AgentsAdapter, CcSwitchAdapter, ClaudeCodeAdapter},
        ToolAdapter,
    },
    db,
};
use tauri::State;

// ── YAML schema ───────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceYaml {
    pub version: String,
    pub name: String,
    pub description: Option<String>,
    pub tool: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub skills: Vec<WorkspaceSkillYaml>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceSkillYaml {
    pub id: String,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

// ── List / CRUD ───────────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_workspaces_cmd(state: State<'_, DbState>) -> Result<Vec<Workspace>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    list_workspaces(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_workspace_cmd(
    name: String, description: Option<String>, tool_id: Option<String>,
    color: String, icon: String, state: State<'_, DbState>,
) -> Result<Workspace, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    create_workspace(&conn, &name, description.as_deref(),
        tool_id.as_deref(), &color, &icon)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_workspace_cmd(
    id: String, name: String, description: Option<String>, tool_id: Option<String>,
    color: String, icon: String, state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    update_workspace(&conn, &id, &name, description.as_deref(), tool_id.as_deref(), &color, &icon)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_workspace_cmd(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    delete_workspace(&conn, &id).map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceActivationResult {
    pub enabled: usize,
    pub disabled: usize,
    pub errors: Vec<String>,
}

fn adapter_for_tool(tool_id: &str) -> Option<Box<dyn ToolAdapter>> {
    match tool_id {
        "claude-code" => Some(Box::new(ClaudeCodeAdapter)),
        "agents" => Some(Box::new(AgentsAdapter)),
        "cc-switch" => Some(Box::new(CcSwitchAdapter)),
        _ => None,
    }
}

#[tauri::command]
pub fn activate_workspace_cmd(
    id: String,
    state: State<'_, DbState>,
) -> Result<WorkspaceActivationResult, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let workspaces = list_workspaces(&conn).map_err(|e| e.to_string())?;
    let workspace = workspaces
        .iter()
        .find(|workspace| workspace.id == id)
        .ok_or_else(|| "Workspace not found".to_string())?;
    let workspace_skills = list_workspace_skills(&conn, &id).map_err(|e| e.to_string())?;
    let workspace_skill_map: HashMap<String, bool> = workspace_skills
        .iter()
        .map(|skill| (skill.skill_id.clone(), skill.enabled))
        .collect();
    let all_skills = db::list_skills(&conn).map_err(|e| e.to_string())?;

    // 先写入当前工作区，再做文件层差量同步，确保 UI 可以立即反映切换状态。
    activate_workspace(&conn, &id).map_err(|e| e.to_string())
        ?;

    let mut result = WorkspaceActivationResult { enabled: 0, disabled: 0, errors: vec![] };

    for skill in all_skills {
        if workspace.tool_id.as_deref().is_some_and(|tool_id| tool_id != skill.tool_id) {
            continue;
        }

        let should_enable = workspace_skill_map.get(&skill.id).copied().unwrap_or(false);
        if should_enable == skill.enabled {
            continue;
        }

        let Some(adapter) = adapter_for_tool(&skill.tool_id) else {
            result.errors.push(format!("未知工具：{}", skill.tool_id));
            continue;
        };

        let operation = if should_enable {
            adapter.enable_skill(&skill.install_path)
        } else {
            adapter.disable_skill(&skill.install_path)
        };

        match operation {
            Ok(()) => {
                db::toggle_skill(&conn, &skill.id, should_enable).map_err(|e| e.to_string())?;
                if should_enable { result.enabled += 1 } else { result.disabled += 1 }
            }
            Err(err) => result.errors.push(format!("{} 同步失败：{}", skill.name, err)),
        }
    }

    Ok(result)
}

// ── Workspace skills ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_workspace_skills_cmd(
    workspace_id: String, state: State<'_, DbState>,
) -> Result<Vec<WorkspaceSkill>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    list_workspace_skills(&conn, &workspace_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_skill_to_workspace_cmd(
    workspace_id: String, skill_id: String, state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    add_skill_to_workspace(&conn, &workspace_id, &skill_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_skill_from_workspace_cmd(
    workspace_id: String, skill_id: String, state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    remove_skill_from_workspace(&conn, &workspace_id, &skill_id).map_err(|e| e.to_string())
}

// ── YAML Export ───────────────────────────────────────────────────────────────

#[tauri::command]
pub fn export_workspace_yaml(
    workspace_id: String, state: State<'_, DbState>,
) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let workspaces = list_workspaces(&conn).map_err(|e| e.to_string())?;
    let ws = workspaces.iter().find(|w| w.id == workspace_id)
        .ok_or_else(|| "Workspace not found".to_string())?;
    let ws_skills = list_workspace_skills(&conn, &workspace_id).map_err(|e| e.to_string())?;

    let yaml = WorkspaceYaml {
        version: "1.0".to_string(),
        name: ws.name.clone(),
        description: ws.description.clone(),
        tool: ws.tool_id.clone(),
        color: Some(ws.color.clone()),
        icon: Some(ws.icon.clone()),
        skills: ws_skills.iter().map(|s| WorkspaceSkillYaml {
            id: s.skill_id.clone(),
            enabled: s.enabled,
            note: s.note.clone(),
        }).collect(),
    };

    serde_yaml::to_string(&yaml).map_err(|e| e.to_string())
}

// ── YAML Import ───────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResult {
    pub workspace_id: String,
    pub name: String,
    pub imported_skills: usize,
    pub missing_skills: Vec<String>,
}

#[tauri::command]
pub fn import_workspace_yaml(
    yaml_str: String, state: State<'_, DbState>,
) -> Result<ImportResult, String> {
    let yaml: WorkspaceYaml = serde_yaml::from_str(&yaml_str)
        .map_err(|e| format!("Invalid YAML: {}", e))?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let ws = create_workspace(
        &conn, &yaml.name,
        yaml.description.as_deref(),
        yaml.tool.as_deref(),
        yaml.color.as_deref().unwrap_or("#6366f1"),
        yaml.icon.as_deref().unwrap_or("🔲"),
    ).map_err(|e| e.to_string())?;

    let mut imported = 0;
    let mut missing = vec![];

    for skill_yaml in &yaml.skills {
        // Verify skill exists in DB
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM skills WHERE id=?1",
            rusqlite::params![skill_yaml.id],
            |row| row.get::<_, i64>(0),
        ).unwrap_or(0) > 0;

        if exists {
            add_skill_to_workspace(&conn, &ws.id, &skill_yaml.id)
                .map_err(|e| format!("Failed to add skill {}: {}", skill_yaml.id, e))?;
            imported += 1;
        } else {
            missing.push(skill_yaml.id.clone());
        }
    }

    Ok(ImportResult {
        workspace_id: ws.id,
        name: ws.name,
        imported_skills: imported,
        missing_skills: missing,
    })
}
