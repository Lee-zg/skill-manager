use tauri::State;
use crate::{
    commands::skills::DbState,
    db::{
        categories::{
            Category, create_category, delete_category, list_categories,
            remove_skill_category, set_skill_category, update_category,
        },
        metadata::{
            add_alias, add_tag, list_all_tags, remove_alias, remove_tag,
            rename_skill, upsert_note,
        },
    },
};

// ── Categories ────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_categories_cmd(state: State<'_, DbState>) -> Result<Vec<Category>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    list_categories(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_category_cmd(
    name: String, color: String, icon: String, parent_id: Option<String>,
    state: State<'_, DbState>,
) -> Result<Category, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    create_category(&conn, &name, &color, &icon, parent_id.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_category_cmd(
    id: String, name: String, color: String, icon: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    update_category(&conn, &id, &name, &color, &icon).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_category_cmd(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    delete_category(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_skill_category_cmd(
    skill_id: String, category_id: String, state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    set_skill_category(&conn, &skill_id, &category_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_skill_category_cmd(
    skill_id: String, category_id: String, state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    remove_skill_category(&conn, &skill_id, &category_id).map_err(|e| e.to_string())
}

// ── Tags ──────────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn add_tag_cmd(skill_id: String, tag: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    add_tag(&conn, &skill_id, &tag).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_tag_cmd(skill_id: String, tag: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    remove_tag(&conn, &skill_id, &tag).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_all_tags_cmd(state: State<'_, DbState>) -> Result<Vec<(String, i64)>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    list_all_tags(&conn).map_err(|e| e.to_string())
}

// ── Notes ─────────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn upsert_note_cmd(skill_id: String, content: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    upsert_note(&conn, &skill_id, &content).map_err(|e| e.to_string())
}

// ── Aliases & Rename ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn add_alias_cmd(skill_id: String, alias: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    add_alias(&conn, &skill_id, &alias).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_alias_cmd(skill_id: String, alias: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    remove_alias(&conn, &skill_id, &alias).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_skill_cmd(id: String, new_name: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    rename_skill(&conn, &id, &new_name).map_err(|e| e.to_string())
}
