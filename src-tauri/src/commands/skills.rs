use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

use crate::{
    adapters::{
        tools::{AgentsAdapter, CcSwitchAdapter, ClaudeCodeAdapter},
        ToolAdapter,
    },
    db::{self, SkillRow},
};

pub struct DbState(pub Mutex<rusqlite::Connection>);

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanResult {
    pub total: usize,
    pub by_tool: Vec<ToolScanInfo>,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ToolScanInfo {
    pub tool_id: String,
    pub tool_name: String,
    pub available: bool,
    pub count: usize,
}

// ── Scan & list ─────────────────────────────────────────────────────────────

#[tauri::command]
pub fn scan_skills(state: State<'_, DbState>) -> Result<ScanResult, String> {
    let adapters: Vec<Box<dyn ToolAdapter>> = vec![
        Box::new(ClaudeCodeAdapter),
        Box::new(AgentsAdapter),
        Box::new(CcSwitchAdapter),
    ];

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut result = ScanResult { total: 0, by_tool: vec![], errors: vec![] };

    for adapter in &adapters {
        let available = adapter.is_available();
        let skills = if available {
            match adapter.scan() {
                Ok(skills) => skills,
                Err(err) => {
                    result.errors.push(format!("{} 扫描失败：{}", adapter.name(), err));
                    vec![]
                }
            }
        } else {
            vec![]
        };
        let count = skills.len();

        for mut skill in skills {
            match db::find_skill_id_by_install_path(&conn, adapter.id(), &skill.install_path) {
                Ok(Some(existing_id)) => skill.id = existing_id,
                Ok(None) => {}
                Err(err) => result.errors.push(format!("{} 旧记录匹配失败：{}", skill.name, err)),
            }

            if let Err(err) = db::upsert_skill(&conn, &skill) {
                result.errors.push(format!("{} 写入数据库失败：{}", skill.name, err));
            }
        }

        result.by_tool.push(ToolScanInfo {
            tool_id: adapter.id().to_string(),
            tool_name: adapter.name().to_string(),
            available,
            count,
        });
        result.total += count;
    }

    Ok(result)
}

#[tauri::command]
pub fn list_skills(state: State<'_, DbState>) -> Result<Vec<SkillRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::list_skills(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_skills(query: String, state: State<'_, DbState>) -> Result<Vec<SkillRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::search_skills(&conn, &query).map_err(|e| e.to_string())
}

// ── Toggle / uninstall ───────────────────────────────────────────────────────

#[tauri::command]
pub fn toggle_skill(
    id: String,
    install_path: String,
    tool_id: String,
    enabled: bool,
    state: State<'_, DbState>,
) -> Result<(), String> {
    // Update filesystem marker
    let adapter: Box<dyn ToolAdapter> = match tool_id.as_str() {
        "claude-code" => Box::new(ClaudeCodeAdapter),
        "agents"      => Box::new(AgentsAdapter),
        "cc-switch"   => Box::new(CcSwitchAdapter),
        _             => return Err(format!("Unknown tool: {}", tool_id)),
    };

    if enabled {
        adapter.enable_skill(&install_path).map_err(|e| e.to_string())?;
    } else {
        adapter.disable_skill(&install_path).map_err(|e| e.to_string())?;
    }

    // Update DB
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::toggle_skill(&conn, &id, enabled).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn uninstall_skill(
    id: String,
    install_path: String,
    tool_id: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let adapter: Box<dyn ToolAdapter> = match tool_id.as_str() {
        "claude-code" => Box::new(ClaudeCodeAdapter),
        "agents"      => Box::new(AgentsAdapter),
        "cc-switch"   => Box::new(CcSwitchAdapter),
        _             => return Err(format!("Unknown tool: {}", tool_id)),
    };

    adapter.uninstall_skill(&install_path).map_err(|e| e.to_string())?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::delete_skill(&conn, &id).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn detect_tools() -> Vec<ToolScanInfo> {
    let adapters: Vec<Box<dyn ToolAdapter>> = vec![
        Box::new(ClaudeCodeAdapter),
        Box::new(AgentsAdapter),
        Box::new(CcSwitchAdapter),
    ];
    adapters
        .iter()
        .map(|a| ToolScanInfo {
            tool_id:   a.id().to_string(),
            tool_name: a.name().to_string(),
            available: a.is_available(),
            count:     0,
        })
        .collect()
}
