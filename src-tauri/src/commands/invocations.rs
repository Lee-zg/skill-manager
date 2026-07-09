#![allow(dead_code)]
// 旧导出写文件能力已从 Tauri handler 移除；相关函数暂时保留用于历史数据兼容和后续安全迁移。

use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    fs,
    path::{Path, PathBuf},
};
use tauri::State;

use crate::{
    commands::skills::DbState,
    db::{
        self,
        categories::list_categories,
        invocations::{
            delete_invocation, delete_invocation_export, delete_invocation_route,
            find_invocation_route_by_paths, get_invocation, get_invocation_route,
            list_invocation_routes, list_invocations, record_invocation,
            update_invocation_route_status, upsert_invocation_export, upsert_invocation_route,
            InvocationExportInput, InvocationRecordInput, InvocationRoute, InvocationRouteInput,
            SkillInvocation,
        },
        workspaces::{list_workspace_skills, list_workspaces},
        SkillRow,
    },
};

const MANAGED_MARKER_FILE: &str = ".skillmanager-export.json";
const PROMPT_MARKER_PREFIX: &str = "<!-- skillmanager-export:";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolInvocationProfile {
    pub tool_id: String,
    pub scope: String,
    pub export_mode: String,
    pub base_path: String,
    pub supports_direct_slash: bool,
    pub supports_skills: bool,
    pub supports_prompt_shim: bool,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvocationPreviewItem {
    pub invocation_id: String,
    pub skill_id: String,
    pub target_type: String,
    pub target_id: String,
    pub display_name: String,
    pub command_name: String,
    pub slug: String,
    pub category_ids: Vec<String>,
    pub workspace_id: Option<String>,
    pub export_mode: String,
    pub destination_path: String,
    pub prompt_path: Option<String>,
    pub invocation_hint: String,
    pub conflict: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportPreview {
    pub target_type: String,
    pub target_id: String,
    pub tool_id: String,
    pub scope: String,
    pub export_mode: String,
    pub items: Vec<InvocationPreviewItem>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteExportPreviewItem {
    pub export_id: String,
    pub route_id: String,
    pub tool_id: String,
    pub scope: String,
    pub export_mode: String,
    pub expected_invocation: String,
    pub actual_invocation: String,
    pub fallback_invocation: Option<String>,
    pub destination_path: Option<String>,
    pub prompt_path: Option<String>,
    pub status: String,
    pub conflict: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutePreviewItem {
    pub route_id: String,
    pub canonical_path: String,
    pub display_path: String,
    pub route_type: String,
    pub workspace_id: Option<String>,
    pub skill_id: Option<String>,
    pub alias: Option<String>,
    pub tool_id: String,
    pub scope: String,
    pub slug: String,
    pub status: String,
    pub conflict: Option<String>,
    pub exports: Vec<RouteExportPreviewItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutePreview {
    pub target_type: String,
    pub target_id: String,
    pub tool_id: String,
    pub scope: String,
    pub mode: String,
    pub routes: Vec<RoutePreviewItem>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteResolution {
    pub input: String,
    pub normalized_input: String,
    pub tool_id: String,
    pub scope: String,
    pub matched: bool,
    pub route: Option<InvocationRoute>,
    pub actual_invocations: Vec<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublishResult {
    pub published: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
    pub items: Vec<InvocationPreviewItem>,
    pub routes: Vec<RoutePreviewItem>,
}

#[derive(Debug, Clone)]
struct InvocationProfileResolved {
    tool_id: String,
    scope: String,
    export_mode: String,
    base_path: PathBuf,
    prompt_path: Option<PathBuf>,
    supports_direct_slash: bool,
    supports_skills: bool,
    supports_prompt_shim: bool,
    enabled: bool,
}

#[derive(Debug, Clone)]
struct RouteSpec {
    route_id: String,
    canonical_path: String,
    display_path: String,
    route_type: String,
    workspace_id: Option<String>,
    skill_id: Option<String>,
    alias: Option<String>,
    tool_id: String,
    scope: String,
    slug: String,
    status: String,
    conflict: Option<String>,
}

#[tauri::command]
pub fn list_tool_invocation_profiles_cmd() -> Vec<ToolInvocationProfile> {
    supported_profiles()
        .into_iter()
        .map(|profile| ToolInvocationProfile {
            tool_id: profile.tool_id,
            scope: profile.scope,
            export_mode: profile.export_mode,
            base_path: profile.base_path.to_string_lossy().to_string(),
            supports_direct_slash: profile.supports_direct_slash,
            supports_skills: profile.supports_skills,
            supports_prompt_shim: profile.supports_prompt_shim,
            enabled: profile.enabled,
        })
        .collect()
}

#[tauri::command]
pub fn preview_invocations_cmd(
    target_type: String,
    target_id: String,
    tool_id: String,
    scope: String,
    export_mode: String,
    state: State<'_, DbState>,
) -> Result<ExportPreview, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let profile = resolve_profile(&tool_id, &scope, &export_mode)?;
    let skills = collect_target_skills(&conn, &target_type, &target_id)?;
    let existing = list_invocations(&conn, Some(&tool_id), None, None)
        .map_err(|e| e.to_string())?;
    let preview = build_preview(&profile, &target_type, &target_id, skills, existing)
        .map_err(|e| e.to_string())?;
    Ok(preview)
}

#[tauri::command]
pub fn publish_invocations_cmd(
    target_type: String,
    target_id: String,
    tool_id: String,
    scope: String,
    export_mode: String,
    state: State<'_, DbState>,
) -> Result<PublishResult, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let profile = resolve_profile(&tool_id, &scope, &export_mode)?;
    let skills = collect_target_skills(&conn, &target_type, &target_id)?;
    let existing = list_invocations(&conn, Some(&tool_id), None, None)
        .map_err(|e| e.to_string())?;
    let preview = build_preview(&profile, &target_type, &target_id, skills.clone(), existing)
        .map_err(|e| e.to_string())?;
    drop(conn);

    let mut published = 0;
    let mut skipped = 0;
    let mut errors = vec![];

    for item in &preview.items {
        let Some(skill) = skills.iter().find(|skill| skill.id == item.skill_id) else {
            skipped += 1;
            continue;
        };
        if let Some(conflict) = &item.conflict {
            skipped += 1;
            errors.push(format!("{} 跳过：{}", item.display_name, conflict));
            continue;
        }

        match export_invocation(&profile, item, skill) {
            Ok(record) => {
                let conn = state.0.lock().map_err(|e| e.to_string())?;
                if let Err(err) = record_invocation(&conn, &record) {
                    errors.push(format!("{} 记录失败：{}", item.display_name, err));
                    skipped += 1;
                } else {
                    published += 1;
                }
            }
            Err(err) => {
                skipped += 1;
                errors.push(format!("{} 发布失败：{}", item.display_name, err));
            }
        }
    }

    Ok(PublishResult { published, skipped, errors, items: preview.items, routes: vec![] })
}

#[tauri::command]
pub fn list_invocations_cmd(
    tool_id: Option<String>,
    workspace_id: Option<String>,
    category_id: Option<String>,
    state: State<'_, DbState>,
) -> Result<Vec<SkillInvocation>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    list_invocations(
        &conn,
        tool_id.as_deref(),
        workspace_id.as_deref(),
        category_id.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_invocation_cmd(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let invocation = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        get_invocation(&conn, &id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "调用记录不存在".to_string())?
    };

    remove_managed_export(&PathBuf::from(&invocation.exported_path))
        .map_err(|e| e.to_string())?;
    if let Some(prompt_path) = invocation.prompt_path.as_deref() {
        remove_managed_prompt(&PathBuf::from(prompt_path)).map_err(|e| e.to_string())?;
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    delete_invocation(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn resolve_invocation_route_cmd(
    input: String,
    tool_id: String,
    scope: Option<String>,
    state: State<'_, DbState>,
) -> Result<RouteResolution, String> {
    let scope = scope.unwrap_or_else(|| "user".to_string());
    let normalized_input = normalize_route_input(&input);
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let route = find_invocation_route_by_paths(&conn, &normalized_input, &tool_id, &scope)
        .map_err(|e| e.to_string())?;
    let actual_invocations = route
        .as_ref()
        .map(|route| {
            route
                .exports
                .iter()
                .filter(|export| export.status == "mapped" || export.status == "exported")
                .map(|export| export.actual_invocation.clone())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let message = if let Some(route) = &route {
        if actual_invocations.is_empty() {
            format!("已找到映射 {}，但尚未启用到 {}", route.display_path, tool_id)
        } else {
            format!("已找到映射 {}，请使用目标工具的实际入口调用", route.display_path)
        }
    } else {
        format!("未找到 {} 对应的配置映射", normalized_input)
    };

    Ok(RouteResolution {
        input,
        normalized_input,
        tool_id,
        scope,
        matched: route.is_some(),
        route,
        actual_invocations,
        message,
    })
}

#[tauri::command]
pub fn preview_config_mappings_cmd(
    target_type: String,
    target_id: String,
    tool_id: String,
    scope: Option<String>,
    mode: Option<String>,
    state: State<'_, DbState>,
) -> Result<RoutePreview, String> {
    let scope = scope.unwrap_or_else(|| "user".to_string());
    let mode = mode.unwrap_or_else(|| "auto".to_string());
    let profile = resolve_profile(&tool_id, &scope, "skill")?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut preview = build_route_preview(&conn, &target_type, &target_id, &profile, &mode, false)
        .map_err(|e| e.to_string())?;
    normalize_config_mapping_statuses(&mut preview);
    Ok(preview)
}

#[tauri::command]
pub fn add_config_mappings_cmd(
    target_type: String,
    target_id: String,
    tool_id: String,
    scope: Option<String>,
    mode: Option<String>,
    state: State<'_, DbState>,
) -> Result<RoutePreview, String> {
    let scope = scope.unwrap_or_else(|| "user".to_string());
    let mode = mode.unwrap_or_else(|| "auto".to_string());
    let profile = resolve_profile(&tool_id, &scope, "skill")?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut preview = build_route_preview(&conn, &target_type, &target_id, &profile, &mode, false)
        .map_err(|e| e.to_string())?;
    normalize_config_mapping_statuses(&mut preview);
    persist_config_mapping_preview(&conn, &mut preview).map_err(|e| e.to_string())?;
    Ok(preview)
}

#[tauri::command]
pub fn list_config_mappings_cmd(
    tool_id: Option<String>,
    workspace_id: Option<String>,
    skill_id: Option<String>,
    status: Option<String>,
    state: State<'_, DbState>,
) -> Result<Vec<InvocationRoute>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let routes = list_invocation_routes(
        &conn,
        tool_id.as_deref(),
        workspace_id.as_deref(),
        skill_id.as_deref(),
    )
    .map_err(|e| e.to_string())?;

    Ok(match status {
        Some(status) => routes
            .into_iter()
            .filter(|route| route.status == status)
            .collect(),
        None => routes,
    })
}

#[tauri::command]
pub fn remove_config_mapping_cmd(route_id: String, state: State<'_, DbState>) -> Result<(), String> {
    let route = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        get_invocation_route(&conn, &route_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "配置映射不存在".to_string())?
    };

    // 只清理本轮映射功能创建的受管目录；历史 exported 产物不在取消映射时主动删除。
    for export in route.exports.iter().filter(|export| export.status == "mapped") {
        if let Some(path) = export.exported_path.as_deref() {
            remove_managed_export(&PathBuf::from(path)).map_err(|e| e.to_string())?;
        }
        if let Some(path) = export.prompt_path.as_deref() {
            remove_managed_prompt(&PathBuf::from(path)).map_err(|e| e.to_string())?;
        }
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    delete_invocation_route(&conn, &route_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn preview_invocation_routes_cmd(
    target_type: String,
    target_id: String,
    tool_id: String,
    mode: String,
    scope: Option<String>,
    state: State<'_, DbState>,
) -> Result<RoutePreview, String> {
    let scope = scope.unwrap_or_else(|| "user".to_string());
    let profile = resolve_profile(&tool_id, &scope, "skill")?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    build_route_preview(&conn, &target_type, &target_id, &profile, &mode, true)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn publish_invocation_routes_cmd(
    route_ids: Vec<String>,
    tool_id: String,
    export_modes: Vec<String>,
    scope: Option<String>,
    state: State<'_, DbState>,
) -> Result<PublishResult, String> {
    let scope = scope.unwrap_or_else(|| "user".to_string());
    let profile = resolve_profile(&tool_id, &scope, "skill")?;
    let mut published = 0;
    let mut skipped = 0;
    let mut errors = vec![];
    let mut published_routes = vec![];

    for route_id in route_ids {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let route = match get_invocation_route(&conn, &route_id).map_err(|e| e.to_string())? {
            Some(route) => route,
            None => {
                skipped += 1;
                errors.push(format!("路由不存在：{route_id}"));
                continue;
            }
        };
        if route.tool_id != tool_id || route.scope != scope {
            skipped += 1;
            errors.push(format!("{} 与当前发布目标不匹配", route.display_path));
            continue;
        }

        let requested_modes = if export_modes.is_empty() {
            default_route_export_modes(&profile, &route.route_type, "auto")
        } else {
            normalize_route_export_modes(&profile, &route.route_type, &export_modes)
        };
        let route_preview = route_preview_from_route(&profile, &route, &requested_modes);
        let mut route_failed = false;
        let mut route_exported = false;

        for export in &route_preview.exports {
            if let Some(conflict) = &export.conflict {
                route_failed = true;
                skipped += 1;
                errors.push(format!("{} 跳过：{}", route.display_path, conflict));
                continue;
            }

            match export_route(&conn, &profile, &route, export) {
                Ok(record) => {
                    upsert_invocation_export(&conn, &record).map_err(|e| e.to_string())?;
                    route_exported = true;
                }
                Err(err) => {
                    route_failed = true;
                    skipped += 1;
                    errors.push(format!("{} 发布失败：{}", route.display_path, err));
                }
            }
        }

        let next_status = if route_failed { "warning" } else { "exported" };
        update_invocation_route_status(&conn, &route.id, next_status, None)
            .map_err(|e| e.to_string())?;
        if route_exported {
            published += 1;
        }
        published_routes.push(route_preview);
    }

    Ok(PublishResult {
        published,
        skipped,
        errors,
        items: vec![],
        routes: published_routes,
    })
}

#[tauri::command]
pub fn list_invocation_routes_cmd(
    tool_id: Option<String>,
    workspace_id: Option<String>,
    skill_id: Option<String>,
    state: State<'_, DbState>,
) -> Result<Vec<InvocationRoute>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    list_invocation_routes(
        &conn,
        tool_id.as_deref(),
        workspace_id.as_deref(),
        skill_id.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_invocation_route_cmd(
    route_id: String,
    remove_exports: bool,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let route = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        get_invocation_route(&conn, &route_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "调用路由不存在".to_string())?
    };

    if remove_exports {
        for export in &route.exports {
            if let Some(path) = export.exported_path.as_deref() {
                remove_managed_export(&PathBuf::from(path)).map_err(|e| e.to_string())?;
            }
            if let Some(path) = export.prompt_path.as_deref() {
                remove_managed_prompt(&PathBuf::from(path)).map_err(|e| e.to_string())?;
            }
        }
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    for export in &route.exports {
        delete_invocation_export(&conn, &export.id).map_err(|e| e.to_string())?;
    }
    delete_invocation_route(&conn, &route_id).map_err(|e| e.to_string())
}

fn supported_profiles() -> Vec<InvocationProfileResolved> {
    let home = dirs_next::home_dir().unwrap_or_else(|| PathBuf::from("."));
    vec![
        InvocationProfileResolved {
            tool_id: "codex".to_string(),
            scope: "user".to_string(),
            export_mode: "skill".to_string(),
            base_path: home.join(".agents").join("skills"),
            prompt_path: Some(home.join(".codex").join("prompts")),
            supports_direct_slash: false,
            supports_skills: true,
            supports_prompt_shim: true,
            enabled: true,
        },
        InvocationProfileResolved {
            tool_id: "claude-code".to_string(),
            scope: "user".to_string(),
            export_mode: "skill".to_string(),
            base_path: home.join(".claude").join("skills"),
            prompt_path: None,
            supports_direct_slash: false,
            supports_skills: true,
            supports_prompt_shim: false,
            enabled: true,
        },
        InvocationProfileResolved {
            tool_id: "agents".to_string(),
            scope: "user".to_string(),
            export_mode: "skill".to_string(),
            base_path: home.join(".agents").join("skills"),
            prompt_path: None,
            supports_direct_slash: false,
            supports_skills: true,
            supports_prompt_shim: false,
            enabled: true,
        },
        InvocationProfileResolved {
            tool_id: "cc-switch".to_string(),
            scope: "user".to_string(),
            export_mode: "skill".to_string(),
            base_path: home.join(".cc-switch").join("skills"),
            prompt_path: None,
            supports_direct_slash: false,
            supports_skills: true,
            supports_prompt_shim: false,
            enabled: true,
        },
        InvocationProfileResolved {
            tool_id: "cursor".to_string(),
            scope: "user".to_string(),
            export_mode: "skill".to_string(),
            base_path: home.join(".cursor").join("skills"),
            prompt_path: None,
            supports_direct_slash: false,
            supports_skills: true,
            supports_prompt_shim: false,
            enabled: true,
        },
        InvocationProfileResolved {
            tool_id: "gemini".to_string(),
            scope: "user".to_string(),
            export_mode: "skill".to_string(),
            base_path: home.join(".gemini").join("skills"),
            prompt_path: None,
            supports_direct_slash: false,
            supports_skills: true,
            supports_prompt_shim: false,
            enabled: true,
        },
        InvocationProfileResolved {
            tool_id: "qoder".to_string(),
            scope: "user".to_string(),
            export_mode: "skill".to_string(),
            base_path: home.join(".qoder").join("skills"),
            prompt_path: None,
            supports_direct_slash: false,
            supports_skills: true,
            supports_prompt_shim: false,
            enabled: true,
        },
    ]
}

fn resolve_profile(
    tool_id: &str,
    scope: &str,
    export_mode: &str,
) -> Result<InvocationProfileResolved, String> {
    let mut profile = supported_profiles()
        .into_iter()
        .find(|profile| profile.tool_id == tool_id && profile.scope == scope)
        .ok_or_else(|| format!("暂不支持映射到工具 {tool_id} / {scope}"))?;
    profile.export_mode = export_mode.to_string();

    if export_mode.contains("prompt") && !profile.supports_prompt_shim {
        return Err(format!("{tool_id} 不支持 prompt shim 导出"));
    }
    if export_mode.contains("slash") && !profile.supports_direct_slash {
        return Err(format!("{tool_id} 不支持裸 slash command，将使用官方技能入口"));
    }
    if export_mode.contains("skill") && !profile.supports_skills {
        return Err(format!("{tool_id} 不支持技能映射"));
    }
    Ok(profile)
}

fn collect_target_skills(
    conn: &rusqlite::Connection,
    target_type: &str,
    target_id: &str,
) -> Result<Vec<SkillRow>, String> {
    let all_skills = db::list_skills(conn).map_err(|e| e.to_string())?;
    match target_type {
        "skill" => Ok(all_skills
            .into_iter()
            .filter(|skill| skill.id == target_id)
            .collect()),
        "category" => Ok(all_skills
            .into_iter()
            .filter(|skill| skill.category_ids.iter().any(|id| id == target_id))
            .collect()),
        "workspace" => {
            let workspace_skill_ids: HashSet<String> = list_workspace_skills(conn, target_id)
                .map_err(|e| e.to_string())?
                .into_iter()
                .map(|skill| skill.skill_id)
                .collect();
            Ok(all_skills
                .into_iter()
                .filter(|skill| workspace_skill_ids.contains(&skill.id))
                .collect())
        }
        _ => Err(format!("未知映射目标：{target_type}")),
    }
}

fn build_route_preview(
    conn: &rusqlite::Connection,
    target_type: &str,
    target_id: &str,
    profile: &InvocationProfileResolved,
    mode: &str,
    persist_preview: bool,
) -> Result<RoutePreview> {
    let specs = collect_route_specs(conn, target_type, target_id, profile)?;
    let mut warnings = route_mode_warnings(profile, mode);
    let mut routes = vec![];

    for spec in specs {
        let export_modes = default_route_export_modes(profile, &spec.route_type, mode);
        let item = route_preview_from_spec(profile, &spec, &export_modes);

        if persist_preview {
            // 旧路由预览会生成草稿，保留兼容历史数据和旧调用方。
            upsert_invocation_route(conn, &InvocationRouteInput {
                id: spec.route_id.clone(),
                canonical_path: spec.canonical_path.clone(),
                display_path: spec.display_path.clone(),
                route_type: spec.route_type.clone(),
                workspace_id: spec.workspace_id.clone(),
                skill_id: spec.skill_id.clone(),
                alias: spec.alias.clone(),
                tool_id: spec.tool_id.clone(),
                scope: spec.scope.clone(),
                slug: spec.slug.clone(),
                status: spec.status.clone(),
                conflict: spec.conflict.clone(),
            })?;
            for export in &item.exports {
                upsert_invocation_export(conn, &InvocationExportInput {
                    id: export.export_id.clone(),
                    route_id: export.route_id.clone(),
                    tool_id: export.tool_id.clone(),
                    scope: export.scope.clone(),
                    export_mode: export.export_mode.clone(),
                    expected_invocation: export.expected_invocation.clone(),
                    actual_invocation: export.actual_invocation.clone(),
                    fallback_invocation: export.fallback_invocation.clone(),
                    exported_path: export.destination_path.clone(),
                    prompt_path: export.prompt_path.clone(),
                    status: "preview".to_string(),
                    conflict: export.conflict.clone(),
                })?;
            }
        }

        routes.push(item);
    }

    if routes.is_empty() {
        warnings.push("当前目标下没有可生成调用路由的本地技能。".to_string());
    }

    Ok(RoutePreview {
        target_type: target_type.to_string(),
        target_id: target_id.to_string(),
        tool_id: profile.tool_id.clone(),
        scope: profile.scope.clone(),
        mode: mode.to_string(),
        routes,
        warnings,
    })
}

fn normalize_config_mapping_statuses(preview: &mut RoutePreview) {
    for route in &mut preview.routes {
        // 映射功能只维护应用内配置，状态统一收敛到 mapped/conflict。
        let route_conflict = route
            .conflict
            .clone()
            .or_else(|| route.exports.iter().find_map(|export| export.conflict.clone()));
        if let Some(conflict) = route_conflict {
            route.status = "conflict".to_string();
            route.conflict = Some(conflict);
        } else {
            route.status = "mapped".to_string();
            route.conflict = None;
        }

        for export in &mut route.exports {
            export.status = if export.conflict.is_some() {
                "conflict".to_string()
            } else {
                "mapped".to_string()
            };
        }
    }
}

fn persist_config_mapping_preview(
    conn: &rusqlite::Connection,
    preview: &mut RoutePreview,
) -> Result<()> {
    let preview_context = ConfigMappingPersistContext {
        target_type: preview.target_type.clone(),
        target_id: preview.target_id.clone(),
    };

    for route in &mut preview.routes {
        let mut route_conflict = route.conflict.clone();
        let route_snapshot = RoutePreviewItem {
            exports: vec![],
            ..route.clone()
        };
        for export in &mut route.exports {
            if export.status == "conflict" {
                route_conflict = route_conflict.or_else(|| export.conflict.clone());
                continue;
            }
            if let Err(err) = materialize_config_mapping_export(conn, &preview_context, &route_snapshot, export) {
                export.status = "conflict".to_string();
                export.conflict = Some(err.to_string());
                route_conflict = route_conflict.or_else(|| Some(err.to_string()));
            }
        }

        route.status = if let Some(conflict) = route_conflict {
            route.conflict = Some(conflict);
            "conflict".to_string()
        } else {
            route.conflict = None;
            "mapped".to_string()
        };

        // 写入应用内映射记录；Codex 分类集合会额外生成受管 Skill 目录用于被 Codex 检索。
        upsert_invocation_route(conn, &InvocationRouteInput {
            id: route.route_id.clone(),
            canonical_path: route.canonical_path.clone(),
            display_path: route.display_path.clone(),
            route_type: route.route_type.clone(),
            workspace_id: route.workspace_id.clone(),
            skill_id: route.skill_id.clone(),
            alias: route.alias.clone(),
            tool_id: route.tool_id.clone(),
            scope: route.scope.clone(),
            slug: route.slug.clone(),
            status: route.status.clone(),
            conflict: route.conflict.clone(),
        })?;
        for export in &route.exports {
            upsert_invocation_export(conn, &InvocationExportInput {
                id: export.export_id.clone(),
                route_id: export.route_id.clone(),
                tool_id: export.tool_id.clone(),
                scope: export.scope.clone(),
                export_mode: export.export_mode.clone(),
                expected_invocation: export.expected_invocation.clone(),
                actual_invocation: export.actual_invocation.clone(),
                fallback_invocation: export.fallback_invocation.clone(),
                exported_path: export.destination_path.clone(),
                prompt_path: export.prompt_path.clone(),
                status: export.status.clone(),
                conflict: export.conflict.clone(),
            })?;
        }
    }
    Ok(())
}

struct ConfigMappingPersistContext {
    target_type: String,
    target_id: String,
}

fn materialize_config_mapping_export(
    conn: &rusqlite::Connection,
    context: &ConfigMappingPersistContext,
    route: &RoutePreviewItem,
    export: &RouteExportPreviewItem,
) -> Result<()> {
    if route.tool_id != "codex" || context.target_type != "category" || route.route_type != "category_all" {
        return Ok(());
    }
    if export.export_mode != "codex-skill" {
        return Ok(());
    }
    let destination = export
        .destination_path
        .as_deref()
        .ok_or_else(|| anyhow!("缺少 Codex 分类集合 Skill 路径"))?;
    let category = list_categories(conn)?
        .into_iter()
        .find(|category| category.id == context.target_id)
        .ok_or_else(|| anyhow!("分类不存在：{}", context.target_id))?;
    let skills = collect_category_bundle_skills(conn, &context.target_id)?;
    let route_record = route_preview_item_to_route(route);
    write_category_bundle_wrapper(
        Path::new(destination),
        &route_record,
        export,
        &category.name,
        &skills,
    )
}

fn route_preview_item_to_route(route: &RoutePreviewItem) -> InvocationRoute {
    InvocationRoute {
        id: route.route_id.clone(),
        canonical_path: route.canonical_path.clone(),
        display_path: route.display_path.clone(),
        route_type: route.route_type.clone(),
        workspace_id: route.workspace_id.clone(),
        skill_id: route.skill_id.clone(),
        alias: route.alias.clone(),
        tool_id: route.tool_id.clone(),
        scope: route.scope.clone(),
        slug: route.slug.clone(),
        status: route.status.clone(),
        conflict: route.conflict.clone(),
        created_at: None,
        updated_at: None,
        exports: vec![],
    }
}

fn collect_route_specs(
    conn: &rusqlite::Connection,
    target_type: &str,
    target_id: &str,
    profile: &InvocationProfileResolved,
) -> Result<Vec<RouteSpec>> {
    let existing_routes = list_invocation_routes(conn, Some(&profile.tool_id), None, None)?;
    let mut used_paths: HashSet<String> = existing_routes
        .iter()
        .filter(|route| route.scope == profile.scope)
        .map(|route| route.canonical_path.clone())
        .collect();
    let mut used_slugs: HashSet<String> = existing_routes
        .iter()
        .filter(|route| route.scope == profile.scope)
        .map(|route| route.slug.clone())
        .collect();
    let existing_by_id: HashMap<String, InvocationRoute> = existing_routes
        .into_iter()
        .map(|route| (route.id.clone(), route))
        .collect();
    let all_skills = db::list_skills(conn)?;
    let mut skills_by_id: HashMap<String, SkillRow> = all_skills
        .iter()
        .cloned()
        .map(|skill| (skill.id.clone(), skill))
        .collect();

    match target_type {
        "skill" => {
            let Some(skill) = skills_by_id.remove(target_id) else {
                return Ok(vec![]);
            };
            Ok(vec![make_route_spec(
                profile,
                "skill_alias",
                target_id,
                Some(&skill),
                None,
                vec![skill.name.clone()],
                vec![make_slug(&skill.name, &skill.id)],
                Some(skill.name.clone()),
                &existing_by_id,
                &mut used_paths,
                &mut used_slugs,
            )])
        }
        "workspace" => {
            let workspace = list_workspaces(conn)?
                .into_iter()
                .find(|workspace| workspace.id == target_id)
                .ok_or_else(|| anyhow!("工作区不存在：{target_id}"))?;
            let workspace_slug = make_slug(&workspace.name, &workspace.id);
            let workspace_skills = list_workspace_skills(conn, target_id)?;
            let mut specs = vec![];

            for workspace_skill in workspace_skills {
                if let Some(skill) = skills_by_id.get(&workspace_skill.skill_id) {
                    specs.push(make_route_spec(
                        profile,
                        "workspace_skill",
                        target_id,
                        Some(skill),
                        Some(&workspace.id),
                        vec![workspace.name.clone(), skill.name.clone()],
                        vec![workspace_slug.clone(), make_slug(&skill.name, &skill.id)],
                        Some(skill.name.clone()),
                        &existing_by_id,
                        &mut used_paths,
                        &mut used_slugs,
                    ));
                }
            }

            specs.push(make_route_spec(
                profile,
                "workspace_all",
                target_id,
                None,
                Some(&workspace.id),
                vec![workspace.name.clone(), "all".to_string()],
                vec![workspace_slug, "all".to_string()],
                Some("all".to_string()),
                &existing_by_id,
                &mut used_paths,
                &mut used_slugs,
            ));
            Ok(specs)
        }
        "category" => {
            let category = list_categories(conn)?
                .into_iter()
                .find(|category| category.id == target_id)
                .ok_or_else(|| anyhow!("分类不存在：{target_id}"))?;
            let category_slug = make_prefixed_slug(&category.name, &category.id, "category");
            let mut specs = vec![];
            specs.push(make_route_spec(
                profile,
                "category_all",
                target_id,
                None,
                None,
                vec![category.name.clone()],
                vec![category_slug.clone()],
                Some(category.name.clone()),
                &existing_by_id,
                &mut used_paths,
                &mut used_slugs,
            ));
            for skill in all_skills
                .iter()
                .filter(|skill| skill.category_ids.iter().any(|id| id == target_id))
            {
                specs.push(make_route_spec(
                    profile,
                    "category_skill",
                    target_id,
                    Some(skill),
                    None,
                    vec![category.name.clone(), skill.name.clone()],
                    vec![category_slug.clone(), make_slug(&skill.name, &skill.id)],
                    Some(skill.name.clone()),
                    &existing_by_id,
                    &mut used_paths,
                    &mut used_slugs,
                ));
            }
            Ok(specs)
        }
        _ => Err(anyhow!("未知配置映射目标：{target_type}")),
    }
}

fn make_route_spec(
    profile: &InvocationProfileResolved,
    route_type: &str,
    target_id: &str,
    skill: Option<&SkillRow>,
    workspace_id: Option<&str>,
    display_segments: Vec<String>,
    slug_segments: Vec<String>,
    alias: Option<String>,
    existing_by_id: &HashMap<String, InvocationRoute>,
    used_paths: &mut HashSet<String>,
    used_slugs: &mut HashSet<String>,
) -> RouteSpec {
    let skill_id = skill.map(|skill| skill.id.clone());
    let route_id = stable_route_id(
        &profile.tool_id,
        &profile.scope,
        route_type,
        target_id,
        skill_id.as_deref().unwrap_or("all"),
    );

    if let Some(existing) = existing_by_id.get(&route_id) {
        used_paths.remove(&existing.canonical_path);
        used_slugs.remove(&existing.slug);
    }

    let display_path = make_display_path(&display_segments);
    let mut candidate_segments = slug_segments;
    let base_leaf = candidate_segments
        .last()
        .cloned()
        .unwrap_or_else(|| "route".to_string());
    let base_slug = candidate_segments.join("-");
    let mut slug = base_slug.clone();
    let mut canonical_path = make_canonical_path(&candidate_segments);
    let mut index = 2;
    while used_paths.contains(&canonical_path) || used_slugs.contains(&slug) {
        if let Some(last) = candidate_segments.last_mut() {
            *last = format!("{base_leaf}-{index}");
        }
        slug = format!("{base_slug}-{index}");
        canonical_path = make_canonical_path(&candidate_segments);
        index += 1;
    }

    used_paths.insert(canonical_path.clone());
    used_slugs.insert(slug.clone());

    RouteSpec {
        route_id,
        canonical_path,
        display_path,
        route_type: route_type.to_string(),
        workspace_id: workspace_id.map(String::from),
        skill_id,
        alias,
        tool_id: profile.tool_id.clone(),
        scope: profile.scope.clone(),
        slug,
        status: "ready".to_string(),
        conflict: None,
    }
}

fn route_preview_from_spec(
    profile: &InvocationProfileResolved,
    spec: &RouteSpec,
    export_modes: &[String],
) -> RoutePreviewItem {
    RoutePreviewItem {
        route_id: spec.route_id.clone(),
        canonical_path: spec.canonical_path.clone(),
        display_path: spec.display_path.clone(),
        route_type: spec.route_type.clone(),
        workspace_id: spec.workspace_id.clone(),
        skill_id: spec.skill_id.clone(),
        alias: spec.alias.clone(),
        tool_id: spec.tool_id.clone(),
        scope: spec.scope.clone(),
        slug: spec.slug.clone(),
        status: spec.status.clone(),
        conflict: spec.conflict.clone(),
        exports: build_route_export_previews(
            profile,
            &spec.route_id,
            &spec.route_type,
            &spec.slug,
            &spec.display_path,
            &spec.canonical_path,
            export_modes,
        ),
    }
}

fn route_preview_from_route(
    profile: &InvocationProfileResolved,
    route: &InvocationRoute,
    export_modes: &[String],
) -> RoutePreviewItem {
    RoutePreviewItem {
        route_id: route.id.clone(),
        canonical_path: route.canonical_path.clone(),
        display_path: route.display_path.clone(),
        route_type: route.route_type.clone(),
        workspace_id: route.workspace_id.clone(),
        skill_id: route.skill_id.clone(),
        alias: route.alias.clone(),
        tool_id: route.tool_id.clone(),
        scope: route.scope.clone(),
        slug: route.slug.clone(),
        status: route.status.clone(),
        conflict: route.conflict.clone(),
        exports: build_route_export_previews(
            profile,
            &route.id,
            &route.route_type,
            &route.slug,
            &route.display_path,
            &route.canonical_path,
            export_modes,
        ),
    }
}

fn build_route_export_previews(
    profile: &InvocationProfileResolved,
    route_id: &str,
    route_type: &str,
    slug: &str,
    display_path: &str,
    canonical_path: &str,
    export_modes: &[String],
) -> Vec<RouteExportPreviewItem> {
    export_modes
        .iter()
        .map(|mode| {
            let export_id = stable_export_id(route_id, &profile.tool_id, &profile.scope, mode);
            let mut destination_path = None;
            let mut prompt_path = None;
            let mut conflict = None;
            let (actual_invocation, fallback_invocation) = match mode.as_str() {
                "codex-skill" | "codex-workspace-bundle" => {
                    let destination = profile.base_path.join(slug);
                    conflict = managed_path_conflict(&destination);
                    destination_path = Some(destination.to_string_lossy().to_string());
                    if route_type == "category_all" {
                        (
                            format!("Codex app: /{slug}；CLI: ${slug} 或 /skills 搜索 {display_path}"),
                            Some(format!("${slug} 或 /skills 搜索 {display_path}")),
                        )
                    } else {
                        (
                            format!("${slug} 或 /skills 搜索 {display_path}"),
                            Some(format!("/skills 搜索 {display_path}")),
                        )
                    }
                }
                "codex-prompt-shim" => {
                    if let Some(base_path) = &profile.prompt_path {
                        let path = base_path.join(format!("{slug}.md"));
                        conflict = managed_prompt_conflict(&path);
                        prompt_path = Some(path.to_string_lossy().to_string());
                    } else {
                        conflict = Some(format!("{} 不支持 prompt shim", profile.tool_id));
                    }
                    (format!("/prompts:{slug}"), Some(format!("${slug}")))
                }
                "direct-slash" => {
                    if !profile.supports_direct_slash {
                        conflict = Some(format!(
                            "{} 不支持任意裸 slash command，请使用实际入口",
                            profile.tool_id
                        ));
                    }
                    let destination = profile.base_path.join(format!("{slug}.md"));
                    destination_path = Some(destination.to_string_lossy().to_string());
                    (display_path.to_string(), Some(canonical_path.to_string()))
                }
                "agents-md" => {
                    let path = dirs_next::home_dir()
                        .unwrap_or_else(|| PathBuf::from("."))
                        .join(".codex")
                        .join("AGENTS.md");
                    destination_path = Some(path.to_string_lossy().to_string());
                    (format!("AGENTS.md managed block: {display_path}"), None)
                }
                "cursor-rule" => {
                    let path = dirs_next::home_dir()
                        .unwrap_or_else(|| PathBuf::from("."))
                        .join(".cursor")
                        .join("rules")
                        .join(format!("{slug}.mdc"));
                    conflict = managed_file_conflict(&path);
                    destination_path = Some(path.to_string_lossy().to_string());
                    (format!("Cursor Rule: {slug}"), Some(canonical_path.to_string()))
                }
                "gemini-command" => {
                    let path = dirs_next::home_dir()
                        .unwrap_or_else(|| PathBuf::from("."))
                        .join(".gemini")
                        .join("commands")
                        .join(format!("{slug}.toml"));
                    conflict = managed_file_conflict(&path);
                    destination_path = Some(path.to_string_lossy().to_string());
                    (format!("/{} via Gemini command", slug), Some(canonical_path.to_string()))
                }
                "qoder-rule" => {
                    let path = dirs_next::home_dir()
                        .unwrap_or_else(|| PathBuf::from("."))
                        .join(".qoder")
                        .join("rules")
                        .join(format!("{slug}.md"));
                    conflict = managed_file_conflict(&path);
                    destination_path = Some(path.to_string_lossy().to_string());
                    (format!("Qoder Rule: {slug}"), Some(canonical_path.to_string()))
                }
                _ => {
                    let destination = profile.base_path.join(slug);
                    conflict = managed_path_conflict(&destination);
                    destination_path = Some(destination.to_string_lossy().to_string());
                    (
                        format!("在 {} 的技能列表中选择 {}", profile.tool_id, slug),
                        Some(canonical_path.to_string()),
                    )
                }
            };

            if route_type == "workspace_all" && mode == "codex-skill" {
                conflict = Some("工作区 all 路由需要使用 codex-workspace-bundle 导出模式".to_string());
            }

            RouteExportPreviewItem {
                export_id,
                route_id: route_id.to_string(),
                tool_id: profile.tool_id.clone(),
                scope: profile.scope.clone(),
                export_mode: mode.clone(),
                expected_invocation: display_path.to_string(),
                actual_invocation,
                fallback_invocation,
                destination_path,
                prompt_path,
                status: "preview".to_string(),
                conflict,
            }
        })
        .collect()
}

fn export_route(
    conn: &rusqlite::Connection,
    profile: &InvocationProfileResolved,
    route: &InvocationRoute,
    export: &RouteExportPreviewItem,
) -> Result<InvocationExportInput> {
    match export.export_mode.as_str() {
        "codex-skill" | "tool-skill" => {
            let skill = load_route_skill(conn, route)?;
            let destination = export
                .destination_path
                .as_deref()
                .ok_or_else(|| anyhow!("缺少技能导出路径"))?;
            write_route_skill_wrapper(Path::new(destination), route, export, &skill)
                .with_context(|| format!("写入技能导出目录失败：{destination}"))?;
        }
        "codex-workspace-bundle" => {
            let workspace_id = route
                .workspace_id
                .as_deref()
                .ok_or_else(|| anyhow!("工作区 all 路由缺少 workspace_id"))?;
            let destination = export
                .destination_path
                .as_deref()
                .ok_or_else(|| anyhow!("缺少工作区集合导出路径"))?;
            let workspace_name = list_workspaces(conn)?
                .into_iter()
                .find(|workspace| workspace.id == workspace_id)
                .map(|workspace| workspace.name)
                .unwrap_or_else(|| route.display_path.clone());
            let skills = collect_workspace_bundle_skills(conn, workspace_id)?;
            write_workspace_bundle_wrapper(
                Path::new(destination),
                route,
                export,
                &workspace_name,
                &skills,
            )
            .with_context(|| format!("写入工作区集合技能失败：{destination}"))?;
        }
        "codex-prompt-shim" => {
            let prompt_path = export
                .prompt_path
                .as_deref()
                .ok_or_else(|| anyhow!("缺少 prompt shim 路径"))?;
            let skill = route
                .skill_id
                .as_deref()
                .and_then(|_| load_route_skill(conn, route).ok());
            write_route_prompt_shim(Path::new(prompt_path), route, export, skill.as_ref())
                .with_context(|| format!("写入 prompt shim 失败：{prompt_path}"))?;
        }
        "direct-slash" => {
            return Err(anyhow!(
                "{} 当前没有启用真实自定义 slash command 适配器",
                profile.tool_id
            ));
        }
        "agents-md" => {
            let destination = export
                .destination_path
                .as_deref()
                .ok_or_else(|| anyhow!("缺少 AGENTS.md 导出路径"))?;
            write_agents_md_block(Path::new(destination), route, export)
                .with_context(|| format!("写入 AGENTS.md managed block 失败：{destination}"))?;
        }
        "cursor-rule" => {
            let destination = export
                .destination_path
                .as_deref()
                .ok_or_else(|| anyhow!("缺少 Cursor Rule 导出路径"))?;
            write_managed_text_file(
                Path::new(destination),
                route,
                export,
                &cursor_rule_content(route, export),
            )?;
        }
        "gemini-command" => {
            let destination = export
                .destination_path
                .as_deref()
                .ok_or_else(|| anyhow!("缺少 Gemini Command 导出路径"))?;
            write_managed_text_file(
                Path::new(destination),
                route,
                export,
                &gemini_command_content(route, export),
            )?;
        }
        "qoder-rule" => {
            let destination = export
                .destination_path
                .as_deref()
                .ok_or_else(|| anyhow!("缺少 Qoder Rule 导出路径"))?;
            write_managed_text_file(
                Path::new(destination),
                route,
                export,
                &qoder_rule_content(route, export),
            )?;
        }
        other => return Err(anyhow!("未知导出模式：{other}")),
    }

    Ok(InvocationExportInput {
        id: export.export_id.clone(),
        route_id: export.route_id.clone(),
        tool_id: export.tool_id.clone(),
        scope: export.scope.clone(),
        export_mode: export.export_mode.clone(),
        expected_invocation: export.expected_invocation.clone(),
        actual_invocation: export.actual_invocation.clone(),
        fallback_invocation: export.fallback_invocation.clone(),
        exported_path: export.destination_path.clone(),
        prompt_path: export.prompt_path.clone(),
        status: "exported".to_string(),
        conflict: None,
    })
}

fn load_route_skill(conn: &rusqlite::Connection, route: &InvocationRoute) -> Result<SkillRow> {
    let skill_id = route
        .skill_id
        .as_deref()
        .ok_or_else(|| anyhow!("该路由不是单技能路由"))?;
    db::list_skills(conn)?
        .into_iter()
        .find(|skill| skill.id == skill_id)
        .ok_or_else(|| anyhow!("技能不存在：{skill_id}"))
}

fn collect_workspace_bundle_skills(
    conn: &rusqlite::Connection,
    workspace_id: &str,
) -> Result<Vec<SkillRow>> {
    let workspace_skill_ids: HashSet<String> = list_workspace_skills(conn, workspace_id)?
        .into_iter()
        .map(|skill| skill.skill_id)
        .collect();
    Ok(db::list_skills(conn)?
        .into_iter()
        .filter(|skill| workspace_skill_ids.contains(&skill.id))
        .collect())
}

fn collect_category_bundle_skills(
    conn: &rusqlite::Connection,
    category_id: &str,
) -> Result<Vec<SkillRow>> {
    Ok(db::list_skills(conn)?
        .into_iter()
        .filter(|skill| skill.category_ids.iter().any(|id| id == category_id))
        .collect())
}

fn default_route_export_modes(
    profile: &InvocationProfileResolved,
    route_type: &str,
    mode: &str,
) -> Vec<String> {
    normalize_route_export_modes(profile, route_type, &[mode.to_string()])
}

fn normalize_route_export_modes(
    profile: &InvocationProfileResolved,
    route_type: &str,
    requested_modes: &[String],
) -> Vec<String> {
    let mut modes = vec![];
    for requested in requested_modes {
        let requested = requested.trim();
        let wants_prompt = requested.contains("prompt");
        let wants_direct = requested.contains("direct-slash") || requested == "slash";
        let wants_rule_export = matches!(
            requested,
            "agents-md" | "cursor-rule" | "gemini-command" | "qoder-rule"
        );
        let wants_skill = requested == "auto"
            || requested == "skill"
            || requested.contains("codex-skill")
            || requested.contains("workspace-bundle")
            || requested.contains("tool-skill");

        if wants_rule_export {
            modes.push(requested.to_string());
        } else if wants_direct {
            modes.push("direct-slash".to_string());
        } else if wants_skill {
            if profile.tool_id == "codex" && route_type == "workspace_all" {
                modes.push("codex-workspace-bundle".to_string());
            } else if profile.tool_id == "codex" {
                modes.push("codex-skill".to_string());
            } else {
                modes.push("tool-skill".to_string());
            }
        }

        if wants_prompt && profile.supports_prompt_shim {
            modes.push("codex-prompt-shim".to_string());
        }
        if requested == "codex-prompt-shim" && profile.supports_prompt_shim {
            modes.push("codex-prompt-shim".to_string());
        }
    }

    if modes.is_empty() {
        if profile.tool_id == "codex" && route_type == "workspace_all" {
            modes.push("codex-workspace-bundle".to_string());
        } else if profile.supports_skills {
            modes.push(if profile.tool_id == "codex" {
                "codex-skill".to_string()
            } else {
                "tool-skill".to_string()
            });
        } else {
            modes.push("direct-slash".to_string());
        }
    }

    let mut seen = HashSet::new();
    modes
        .into_iter()
        .filter(|mode| seen.insert(mode.clone()))
        .collect()
}

fn route_mode_warnings(profile: &InvocationProfileResolved, mode: &str) -> Vec<String> {
    let mut warnings = vec![];
    if profile.tool_id == "codex" {
        warnings.push(
            "Codex 当前稳定入口是 /skills 搜索或 $skill；裸 /工作区/技能 作为 SkillManager 期望路由展示。"
                .to_string(),
        );
    }
    if mode.contains("prompt") {
        warnings.push("prompt shim 提供 /prompts:<name> 兼容入口，但不作为首选调用方式。".to_string());
    }
    warnings
}

fn make_display_path(segments: &[String]) -> String {
    let safe_segments: Vec<String> = segments
        .iter()
        .map(|segment| {
            let segment = segment.trim().replace('/', "／");
            if segment.is_empty() { "未命名".to_string() } else { segment }
        })
        .collect();
    format!("/{}", safe_segments.join("/"))
}

fn make_canonical_path(segments: &[String]) -> String {
    let safe_segments: Vec<String> = segments
        .iter()
        .map(|segment| make_slug(segment, segment))
        .collect();
    format!("/{}", safe_segments.join("/"))
}

fn normalize_route_input(input: &str) -> String {
    let parts: Vec<&str> = input
        .trim()
        .trim_start_matches('/')
        .split('/')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .collect();
    if parts.is_empty() {
        "/".to_string()
    } else {
        format!("/{}", parts.join("/"))
    }
}

fn build_preview(
    profile: &InvocationProfileResolved,
    target_type: &str,
    target_id: &str,
    skills: Vec<SkillRow>,
    existing: Vec<SkillInvocation>,
) -> Result<ExportPreview> {
    let mut used_slugs: HashSet<String> = existing
        .iter()
        .filter(|invocation| invocation.scope == profile.scope)
        .map(|invocation| invocation.slug.clone())
        .collect();
    let mut warnings = vec![];
    if profile.tool_id == "codex" && profile.export_mode.contains("prompt") {
        warnings.push("Codex prompt shim 使用 /prompts:<name>，官方已建议优先使用 Skills。".to_string());
    }

    let mut items = vec![];
    for skill in skills {
        let invocation_id = stable_invocation_id(
            &profile.tool_id,
            &profile.scope,
            &profile.export_mode,
            target_type,
            target_id,
            &skill.id,
        );
        if let Some(existing_same) = existing.iter().find(|item| item.id == invocation_id) {
            used_slugs.remove(&existing_same.slug);
        }
        let base_slug = make_slug(&skill.name, &skill.id);
        let slug = unique_slug(&base_slug, &mut used_slugs);
        let destination = profile.base_path.join(&slug);
        let prompt_path = if profile.export_mode.contains("prompt") {
            profile.prompt_path.as_ref().map(|path| path.join(format!("{slug}.md")))
        } else {
            None
        };
        let conflict = managed_path_conflict(&destination);
        let invocation_hint = invocation_hint(profile, &slug);
        items.push(InvocationPreviewItem {
            invocation_id,
            skill_id: skill.id,
            target_type: target_type.to_string(),
            target_id: target_id.to_string(),
            display_name: skill.name.clone(),
            command_name: skill.name,
            slug,
            category_ids: skill.category_ids,
            workspace_id: if target_type == "workspace" { Some(target_id.to_string()) } else { None },
            export_mode: profile.export_mode.clone(),
            destination_path: destination.to_string_lossy().to_string(),
            prompt_path: prompt_path.map(|path| path.to_string_lossy().to_string()),
            invocation_hint,
            conflict,
        });
    }

    if items.is_empty() {
        warnings.push("当前目标下没有可发布的本地技能。".to_string());
    }

    Ok(ExportPreview {
        target_type: target_type.to_string(),
        target_id: target_id.to_string(),
        tool_id: profile.tool_id.clone(),
        scope: profile.scope.clone(),
        export_mode: profile.export_mode.clone(),
        items,
        warnings,
    })
}

fn export_invocation(
    profile: &InvocationProfileResolved,
    item: &InvocationPreviewItem,
    skill: &SkillRow,
) -> Result<InvocationRecordInput> {
    let destination = PathBuf::from(&item.destination_path);
    let prompt_path = item.prompt_path.as_ref().map(PathBuf::from);

    if profile.export_mode.contains("skill") {
        write_skill_wrapper(&destination, item, skill)
            .with_context(|| format!("写入技能导出目录失败：{}", destination.display()))?;
    }
    if profile.export_mode.contains("prompt") {
        let prompt_path = prompt_path
            .as_ref()
            .ok_or_else(|| anyhow!("当前工具没有 prompt shim 目录"))?;
        write_prompt_shim(prompt_path, item, skill)
            .with_context(|| format!("写入 prompt shim 失败：{}", prompt_path.display()))?;
    }

    Ok(InvocationRecordInput {
        id: item.invocation_id.clone(),
        skill_id: item.skill_id.clone(),
        tool_id: profile.tool_id.clone(),
        display_name: item.display_name.clone(),
        command_name: item.command_name.clone(),
        slug: item.slug.clone(),
        category_ids: item.category_ids.clone(),
        workspace_id: item.workspace_id.clone(),
        target_type: item.target_type.clone(),
        target_id: item.target_id.clone(),
        scope: profile.scope.clone(),
        export_mode: profile.export_mode.clone(),
        exported_path: destination.to_string_lossy().to_string(),
        prompt_path: prompt_path.map(|path| path.to_string_lossy().to_string()),
        status: "exported".to_string(),
    })
}

fn write_skill_wrapper(
    destination: &Path,
    item: &InvocationPreviewItem,
    skill: &SkillRow,
) -> Result<()> {
    ensure_managed_dir(destination)?;
    fs::create_dir_all(destination.join("source"))?;
    let source_skill_md = PathBuf::from(&skill.install_path).join("SKILL.md");
    if source_skill_md.exists() {
        fs::copy(&source_skill_md, destination.join("source").join("SKILL.md"))?;
    }

    let marker = serde_json::json!({
        "managedBy": "SkillManager",
        "invocationId": item.invocation_id,
        "skillId": item.skill_id,
        "exportMode": item.export_mode,
    });
    fs::write(
        destination.join(MANAGED_MARKER_FILE),
        serde_json::to_string_pretty(&marker)?,
    )?;
    fs::write(destination.join("SKILL.md"), skill_wrapper_content(item, skill))?;
    Ok(())
}

fn write_prompt_shim(path: &Path, item: &InvocationPreviewItem, skill: &SkillRow) -> Result<()> {
    if path.exists() {
        let existing = fs::read_to_string(path)?;
        if !existing.contains(PROMPT_MARKER_PREFIX) {
            return Err(anyhow!("目标 prompt 已存在且不是 SkillManager 管理文件"));
        }
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, prompt_shim_content(item, skill))?;
    Ok(())
}

fn write_route_skill_wrapper(
    destination: &Path,
    route: &InvocationRoute,
    export: &RouteExportPreviewItem,
    skill: &SkillRow,
) -> Result<()> {
    ensure_managed_dir(destination)?;
    fs::create_dir_all(destination.join("source"))?;
    let source_skill_md = PathBuf::from(&skill.install_path).join("SKILL.md");
    if source_skill_md.exists() {
        fs::copy(&source_skill_md, destination.join("source").join("SKILL.md"))?;
    }

    let marker = serde_json::json!({
        "managedBy": "SkillManager",
        "routeId": route.id,
        "skillId": route.skill_id,
        "routeType": route.route_type,
        "expectedInvocation": export.expected_invocation,
        "actualInvocation": export.actual_invocation,
        "exportMode": export.export_mode,
    });
    fs::write(
        destination.join(MANAGED_MARKER_FILE),
        serde_json::to_string_pretty(&marker)?,
    )?;
    fs::write(destination.join("SKILL.md"), route_skill_wrapper_content(route, export, skill))?;
    Ok(())
}

fn write_workspace_bundle_wrapper(
    destination: &Path,
    route: &InvocationRoute,
    export: &RouteExportPreviewItem,
    workspace_name: &str,
    skills: &[SkillRow],
) -> Result<()> {
    ensure_managed_dir(destination)?;
    let manifest = serde_json::json!({
        "managedBy": "SkillManager",
        "routeId": route.id,
        "workspaceId": route.workspace_id,
        "workspaceName": workspace_name,
        "expectedInvocation": export.expected_invocation,
        "actualInvocation": export.actual_invocation,
        "skills": skills.iter().map(|skill| serde_json::json!({
            "id": skill.id,
            "name": skill.name,
            "originalName": skill.original_name,
            "description": skill.description,
            "toolId": skill.tool_id,
            "installPath": skill.install_path,
            "tags": skill.tags,
            "aliases": skill.aliases,
        })).collect::<Vec<_>>()
    });
    fs::write(destination.join(MANAGED_MARKER_FILE), serde_json::to_string_pretty(&manifest)?)?;
    fs::write(
        destination.join("skillmanager-workspace.json"),
        serde_json::to_string_pretty(&manifest)?,
    )?;
    fs::write(
        destination.join("SKILL.md"),
        workspace_bundle_content(route, export, workspace_name, skills),
    )?;
    Ok(())
}

fn write_category_bundle_wrapper(
    destination: &Path,
    route: &InvocationRoute,
    export: &RouteExportPreviewItem,
    category_name: &str,
    skills: &[SkillRow],
) -> Result<()> {
    ensure_managed_dir(destination)?;
    let manifest = serde_json::json!({
        "managedBy": "SkillManager",
        "routeId": route.id,
        "routeType": route.route_type,
        "categoryName": category_name,
        "expectedInvocation": export.expected_invocation,
        "actualInvocation": export.actual_invocation,
        "skills": skills.iter().map(|skill| serde_json::json!({
            "id": skill.id,
            "name": skill.name,
            "originalName": skill.original_name,
            "description": skill.description,
            "toolId": skill.tool_id,
            "installPath": skill.install_path,
            "tags": skill.tags,
            "aliases": skill.aliases,
        })).collect::<Vec<_>>()
    });
    fs::write(destination.join(MANAGED_MARKER_FILE), serde_json::to_string_pretty(&manifest)?)?;
    fs::write(
        destination.join("skillmanager-category.json"),
        serde_json::to_string_pretty(&manifest)?,
    )?;
    fs::write(
        destination.join("SKILL.md"),
        category_bundle_content(route, export, category_name, skills),
    )?;
    Ok(())
}

fn write_route_prompt_shim(
    path: &Path,
    route: &InvocationRoute,
    export: &RouteExportPreviewItem,
    skill: Option<&SkillRow>,
) -> Result<()> {
    if path.exists() {
        let existing = fs::read_to_string(path)?;
        if !existing.contains(PROMPT_MARKER_PREFIX) {
            return Err(anyhow!("目标 prompt 已存在且不是 SkillManager 管理文件"));
        }
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, route_prompt_shim_content(route, export, skill))?;
    Ok(())
}

fn skill_wrapper_content(item: &InvocationPreviewItem, skill: &SkillRow) -> String {
    let description = skill.description.clone().unwrap_or_else(|| {
        format!("SkillManager 导出的 {} 调用入口。", item.display_name)
    });
    format!(
        "---\nname: {}\ndescription: {}\n---\n\n# {}\n\n此技能由 SkillManager 导出，用于在目标工具中调用已分类或重命名的本地技能。\n\n- 原始技能名称：{}\n- 原始工具：{}\n- 原始路径：`{}`\n- 来源：{}\n- 推荐调用：`{}`\n\n## 使用要求\n\n当用户明确调用本技能时，先阅读 `source/SKILL.md`；如果该文件不存在，则读取原始路径下的 `SKILL.md`。随后按原技能说明执行，保留 SkillManager 中的重命名、分类、标签、备注和别名语义。\n",
        item.slug,
        yaml_single_line(&description),
        item.display_name,
        skill.original_name,
        skill.tool_id,
        skill.install_path,
        skill.source.clone().unwrap_or_else(|| "本地安装".to_string()),
        item.invocation_hint,
    )
}

fn route_skill_wrapper_content(
    route: &InvocationRoute,
    export: &RouteExportPreviewItem,
    skill: &SkillRow,
) -> String {
    let description = skill.description.clone().unwrap_or_else(|| {
        format!("SkillManager 导出的 {} 调用路由。", route.display_path)
    });
    format!(
        "---\nname: {}\ndescription: {}\n---\n\n# {}\n\n此技能由 SkillManager 根据统一调用路由导出。\n\n- 期望调用：`{}`\n- Codex 实际入口：`{}`\n- 兼容入口：{}\n- 原始技能名称：{}\n- 当前显示名称：{}\n- 原始工具：{}\n- 原始路径：`{}`\n- 来源：{}\n\n## 使用要求\n\n当用户通过 SkillManager 路由、`$` 技能名或 `/skills` 选择本技能时，先读取 `source/SKILL.md`；如果该文件不存在，则读取原始路径下的 `SKILL.md`。随后按原技能说明执行，并保留 SkillManager 中的重命名、分类、标签、备注和别名语义。\n",
        route.slug,
        yaml_single_line(&description),
        route.display_path,
        export.expected_invocation,
        export.actual_invocation,
        export.fallback_invocation.as_deref().unwrap_or("无"),
        skill.original_name,
        skill.name,
        skill.tool_id,
        skill.install_path,
        skill.source.clone().unwrap_or_else(|| "本地安装".to_string()),
    )
}

fn workspace_bundle_content(
    route: &InvocationRoute,
    export: &RouteExportPreviewItem,
    workspace_name: &str,
    skills: &[SkillRow],
) -> String {
    let skill_lines = skills
        .iter()
        .map(|skill| {
            format!(
                "- `{}`：{}（原始路径：`{}`）",
                skill.name,
                skill.description.clone().unwrap_or_else(|| "无描述".to_string()),
                skill.install_path,
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    format!(
        "---\nname: {}\ndescription: {}\n---\n\n# {}\n\n这是 SkillManager 导出的工作区集合技能，用于快速进入一个工作区内的技能集。\n\n- 期望调用：`{}`\n- Codex 实际入口：`{}`\n- 工作区：{}\n- 技能数量：{}\n\n## 使用要求\n\n当用户调用本工作区集合时，读取 `skillmanager-workspace.json`，根据用户任务在清单中选择最匹配的技能；如果需要完整说明，读取对应 `installPath` 下的 `SKILL.md`。如果用户要求使用全部技能，按任务顺序组合这些技能的说明，不要假设 Codex 原生支持裸 `/工作区/all`。\n\n## 工作区技能\n\n{}\n",
        route.slug,
        yaml_single_line(&format!("SkillManager 工作区 {} 的集合技能。", workspace_name)),
        route.display_path,
        export.expected_invocation,
        export.actual_invocation,
        workspace_name,
        skills.len(),
        if skill_lines.is_empty() { "暂无技能".to_string() } else { skill_lines },
    )
}

fn category_bundle_content(
    route: &InvocationRoute,
    export: &RouteExportPreviewItem,
    category_name: &str,
    skills: &[SkillRow],
) -> String {
    let skill_lines = skills
        .iter()
        .map(|skill| {
            format!(
                "- `{}`：{}（原始路径：`{}`）",
                skill.name,
                skill.description.clone().unwrap_or_else(|| "无描述".to_string()),
                skill.install_path,
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    format!(
        "---\nname: {}\ndescription: {}\n---\n\n# {}\n\n这是 SkillManager 生成的分类集合技能，用于在 Codex 中按分类检索和选择技能。\n\n- 分类：{}\n- 期望入口：`{}`\n- Codex 实际入口：`{}`\n- 技能数量：{}\n\n## 使用要求\n\n当用户调用本分类集合时，读取 `skillmanager-category.json`，根据用户任务在清单中选择最匹配的技能；如果需要完整说明，读取对应 `installPath` 下的 `SKILL.md`。如果用户输入中文分类名但 Codex slash 列表没有直接显示，请优先使用本技能实际入口或通过 `/skills` 搜索分类名称。\n\n## 分类技能\n\n{}\n",
        route.slug,
        yaml_single_line(&format!("SkillManager 分类 {} 的集合技能。", category_name)),
        route.display_path,
        category_name,
        export.expected_invocation,
        export.actual_invocation,
        skills.len(),
        if skill_lines.is_empty() { "暂无技能".to_string() } else { skill_lines },
    )
}

fn prompt_shim_content(item: &InvocationPreviewItem, skill: &SkillRow) -> String {
    let marker = serde_json::json!({
        "managedBy": "SkillManager",
        "invocationId": item.invocation_id,
        "skillId": item.skill_id,
    });
    format!(
        "---\ndescription: 使用 SkillManager 技能 {}\nargument-hint: [需求]\n---\n{}\n\n请使用 SkillManager 导出的技能 `{}` 处理以下请求：$ARGUMENTS\n\n原始技能路径：`{}`\n调用提示：`{}`\n如果需要完整说明，读取原始目录中的 `SKILL.md`。\n",
        item.display_name,
        format!("{PROMPT_MARKER_PREFIX}{} -->", serde_json::to_string(&marker).unwrap_or_default()),
        item.display_name,
        skill.install_path,
        item.invocation_hint,
    )
}

fn route_prompt_shim_content(
    route: &InvocationRoute,
    export: &RouteExportPreviewItem,
    skill: Option<&SkillRow>,
) -> String {
    let marker = serde_json::json!({
        "managedBy": "SkillManager",
        "routeId": route.id,
        "skillId": route.skill_id,
        "exportMode": export.export_mode,
    });
    let source_hint = skill
        .map(|skill| format!("原始技能路径：`{}`", skill.install_path))
        .unwrap_or_else(|| "这是工作区集合路由，请读取对应导出目录中的 `skillmanager-workspace.json`。".to_string());
    format!(
        "---\ndescription: 使用 SkillManager 路由 {}\nargument-hint: [需求]\n---\n{}\n\n请按 SkillManager 路由 `{}` 处理以下请求：$ARGUMENTS\n\n实际推荐入口：`{}`\n{}\n如果存在导出的 Codex Skill，请优先使用 `$` 技能入口或 `/skills` 搜索。\n",
        route.display_path,
        format!("{PROMPT_MARKER_PREFIX}{} -->", serde_json::to_string(&marker).unwrap_or_default()),
        export.expected_invocation,
        export.fallback_invocation.as_deref().unwrap_or(&export.actual_invocation),
        source_hint,
    )
}

fn write_agents_md_block(
    destination: &Path,
    route: &InvocationRoute,
    export: &RouteExportPreviewItem,
) -> Result<()> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)?;
    }
    let start = format!("<!-- skillmanager:start {} -->", route.id);
    let end = format!("<!-- skillmanager:end {} -->", route.id);
    let block = format!(
        "{start}\n## {}\n\nSource: `skillmanager://{}`\n\n实际入口：`{}`\n\n请按 SkillManager 路由 `{}` 处理相关任务。\n{end}",
        route.display_path.trim_start_matches('/'),
        route.id,
        export.actual_invocation,
        route.display_path,
    );
    let existing = fs::read_to_string(destination).unwrap_or_default();
    let next = if let (Some(start_index), Some(end_index)) = (existing.find(&start), existing.find(&end)) {
        let end_index = end_index + end.len();
        format!("{}{}{}", &existing[..start_index], block, &existing[end_index..])
    } else if existing.trim().is_empty() {
        format!("{block}\n")
    } else {
        format!("{}\n\n{block}\n", existing.trim_end())
    };
    fs::write(destination, next)?;
    Ok(())
}

fn write_managed_text_file(
    destination: &Path,
    route: &InvocationRoute,
    export: &RouteExportPreviewItem,
    content: &str,
) -> Result<()> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)?;
    }
    if destination.exists() {
        let existing = fs::read_to_string(destination)?;
        if !existing.contains("skillmanager-export") {
            return Err(anyhow!("拒绝覆盖非 SkillManager 管理文件"));
        }
    }
    let marker = serde_json::json!({
        "routeId": route.id,
        "exportId": export.export_id,
        "exportMode": export.export_mode,
    });
    fs::write(
        destination,
        format!(
            "<!-- skillmanager-export:{} -->\n{}",
            serde_json::to_string(&marker)?,
            content
        ),
    )?;
    Ok(())
}

fn cursor_rule_content(route: &InvocationRoute, export: &RouteExportPreviewItem) -> String {
    format!(
        "---\ndescription: SkillManager route {}\nalwaysApply: false\n---\n\nUse SkillManager route `{}`.\nActual invocation: `{}`.\n",
        route.display_path,
        route.display_path,
        export.actual_invocation,
    )
}

fn gemini_command_content(route: &InvocationRoute, export: &RouteExportPreviewItem) -> String {
    format!(
        "description = \"SkillManager route {}\"\nprompt = \"\"\"\nUse SkillManager route `{}`.\nActual invocation: `{}`.\nHandle the selected context according to this route.\n\"\"\"\n",
        toml_escape(&route.display_path),
        route.display_path,
        export.actual_invocation,
    )
}

fn qoder_rule_content(route: &InvocationRoute, export: &RouteExportPreviewItem) -> String {
    format!(
        "# SkillManager Route {}\n\nUse route `{}`.\nActual invocation: `{}`.\n",
        route.display_path.trim_start_matches('/'),
        route.display_path,
        export.actual_invocation,
    )
}

fn toml_escape(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

fn ensure_managed_dir(destination: &Path) -> Result<()> {
    if destination.exists() {
        if !destination.join(MANAGED_MARKER_FILE).exists() {
            return Err(anyhow!("目标目录已存在且不是 SkillManager 管理目录"));
        }
        fs::remove_dir_all(destination)?;
    }
    fs::create_dir_all(destination)?;
    Ok(())
}

fn remove_managed_export(path: &Path) -> Result<()> {
    if !path.exists() {
        return Ok(());
    }
    if path.is_dir() {
        if !path.join(MANAGED_MARKER_FILE).exists() {
            return Err(anyhow!("拒绝删除非 SkillManager 管理目录"));
        }
        fs::remove_dir_all(path)?;
    } else if path.is_file() {
        let content = fs::read_to_string(path)?;
        if !content.contains("skillmanager-export") && !content.contains("skillmanager:start") {
            return Err(anyhow!("拒绝删除非 SkillManager 管理文件"));
        }
        fs::remove_file(path)?;
    }
    Ok(())
}

fn remove_managed_prompt(path: &Path) -> Result<()> {
    if !path.exists() {
        return Ok(());
    }
    let content = fs::read_to_string(path)?;
    if !content.contains(PROMPT_MARKER_PREFIX) {
        return Err(anyhow!("拒绝删除非 SkillManager 管理 prompt"));
    }
    fs::remove_file(path)?;
    Ok(())
}

fn managed_path_conflict(destination: &Path) -> Option<String> {
    if destination.exists() && !destination.join(MANAGED_MARKER_FILE).exists() {
        Some("目标目录已存在且不是 SkillManager 管理目录".to_string())
    } else {
        None
    }
}

fn managed_file_conflict(destination: &Path) -> Option<String> {
    if !destination.exists() {
        return None;
    }
    match fs::read_to_string(destination) {
        Ok(content) if content.contains("skillmanager-export") || content.contains("skillmanager:start") => None,
        Ok(_) => Some("目标文件已存在且不是 SkillManager 管理文件".to_string()),
        Err(err) => Some(format!("无法读取目标文件：{err}")),
    }
}

fn managed_prompt_conflict(path: &Path) -> Option<String> {
    if !path.exists() {
        return None;
    }
    match fs::read_to_string(path) {
        Ok(content) if content.contains(PROMPT_MARKER_PREFIX) => None,
        Ok(_) => Some("目标 prompt 已存在且不是 SkillManager 管理文件".to_string()),
        Err(err) => Some(format!("无法读取目标 prompt：{err}")),
    }
}

fn invocation_hint(profile: &InvocationProfileResolved, slug: &str) -> String {
    if profile.tool_id == "codex" && profile.export_mode.contains("prompt") {
        format!("/prompts:{slug}")
    } else if profile.tool_id == "codex" {
        format!("${slug} 或 /skills 选择 {slug}")
    } else if profile.supports_direct_slash {
        format!("/{slug}")
    } else {
        format!("在 {} 的技能列表中选择 {}", profile.tool_id, slug)
    }
}

fn stable_route_id(
    tool_id: &str,
    scope: &str,
    route_type: &str,
    target_id: &str,
    item_id: &str,
) -> String {
    let input = format!("{tool_id}:{scope}:{route_type}:{target_id}:{item_id}");
    format!("route-{}", short_hash(&input))
}

fn stable_export_id(route_id: &str, tool_id: &str, scope: &str, export_mode: &str) -> String {
    let input = format!("{route_id}:{tool_id}:{scope}:{export_mode}");
    format!("export-{}", short_hash(&input))
}

fn stable_invocation_id(
    tool_id: &str,
    scope: &str,
    export_mode: &str,
    target_type: &str,
    target_id: &str,
    skill_id: &str,
) -> String {
    let input = format!("{tool_id}:{scope}:{export_mode}:{target_type}:{target_id}:{skill_id}");
    let mut hash = 0xcbf29ce484222325u64;
    for byte in input.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("inv-{hash:016x}")
}

fn make_slug(name: &str, fallback: &str) -> String {
    let mut slug = String::new();
    let mut last_dash = false;
    for ch in name.to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch);
            last_dash = false;
        } else if (ch == '-' || ch == '_' || ch.is_whitespace()) && !last_dash && !slug.is_empty() {
            slug.push('-');
            last_dash = true;
        }
    }
    let mut slug = slug.trim_matches('-').chars().take(48).collect::<String>();
    if slug.is_empty() {
        slug = format!("skill-{}", short_hash(fallback));
    }
    if reserved_slugs().contains(slug.as_str()) {
        slug = format!("skill-{slug}");
    }
    slug
}

fn make_prefixed_slug(name: &str, fallback: &str, prefix: &str) -> String {
    let slug = make_slug(name, fallback);
    if slug.starts_with("skill-") && name.chars().any(|ch| !ch.is_ascii()) {
        format!("{prefix}-{}", short_hash(fallback))
    } else {
        slug
    }
}

fn unique_slug(base: &str, used: &mut HashSet<String>) -> String {
    let mut slug = base.to_string();
    let mut index = 2;
    while used.contains(&slug) {
        slug = format!("{base}-{index}");
        index += 1;
    }
    used.insert(slug.clone());
    slug
}

fn short_hash(value: &str) -> String {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in value.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{hash:08x}")
}

fn reserved_slugs() -> HashSet<&'static str> {
    [
        "status", "skills", "model", "review", "plan", "goal", "permissions", "clear",
        "archive", "delete", "diff", "exit", "quit", "import", "plugins", "hooks",
    ]
    .into_iter()
    .collect()
}

fn yaml_single_line(value: &str) -> String {
    let escaped = value.replace('"', "\\\"");
    format!("\"{}\"", escaped.lines().next().unwrap_or(""))
}
