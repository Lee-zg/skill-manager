use tauri::State;

use crate::{
    commands::skills::DbState,
    core::{
        adapter_registry::TargetInfo,
        install::{
            doctor, install_from_source, link_existing_skill, preview_install, repair, set_alias,
            targets, unlink_installation, CanonicalInstallResult, DoctorReport, InstallPreview,
            InstallRequest,
        },
    },
    db::canonical::{list_audit_events, AuditEventRow, InstallationRow},
};

#[tauri::command]
pub fn list_targets_cmd() -> Vec<TargetInfo> {
    targets()
}

#[tauri::command]
pub fn preview_install_cmd(request: InstallRequest) -> Result<InstallPreview, String> {
    preview_install(&request).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn install_canonical_skill_cmd(
    request: InstallRequest,
    state: State<'_, DbState>,
) -> Result<CanonicalInstallResult, String> {
    let conn = state.0.lock().map_err(|err| err.to_string())?;
    install_from_source(&conn, &request).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn link_skill_cmd(
    skill_id: String,
    target: String,
    scope: Option<String>,
    project_path: Option<String>,
    alias: Option<String>,
    state: State<'_, DbState>,
) -> Result<InstallationRow, String> {
    let conn = state.0.lock().map_err(|err| err.to_string())?;
    link_existing_skill(
        &conn,
        &skill_id,
        &target,
        scope.as_deref().unwrap_or("user"),
        project_path.as_deref(),
        alias.as_deref(),
    )
    .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn unlink_skill_cmd(
    installation_id: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|err| err.to_string())?;
    unlink_installation(&conn, &installation_id).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn set_target_alias_cmd(
    skill_id: String,
    target: String,
    alias: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|err| err.to_string())?;
    set_alias(&conn, &skill_id, &target, &alias).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn doctor_cmd(state: State<'_, DbState>) -> Result<DoctorReport, String> {
    let conn = state.0.lock().map_err(|err| err.to_string())?;
    doctor(&conn).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn repair_cmd(state: State<'_, DbState>) -> Result<DoctorReport, String> {
    let conn = state.0.lock().map_err(|err| err.to_string())?;
    repair(&conn).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn list_audit_events_cmd(
    skill_id: Option<String>,
    state: State<'_, DbState>,
) -> Result<Vec<AuditEventRow>, String> {
    let conn = state.0.lock().map_err(|err| err.to_string())?;
    list_audit_events(&conn, skill_id.as_deref()).map_err(|err| err.to_string())
}
