use anyhow::{anyhow, Result};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

use crate::{
    adapters::SkillMeta,
    core::{
        adapter_registry::{list_target_info, resolve_target_mount, TargetInfo},
        audit,
        manifest::{inspect_skill_dir, safe_alias, ValidatedSkill},
        materializer::{materialize, unlink_managed_mount, MaterializeRequest},
        policy,
        store::commit_to_store,
    },
    db::{
        self,
        canonical::{
            get_installation, get_latest_version, installation_id_for, list_installations,
            find_canonical_id_by_name, mark_installation_status, set_target_alias, stable_skill_id,
            upsert_canonical_skill, upsert_installation, upsert_skill_version,
            CanonicalSkillInput, InstallationInput, InstallationRow, SkillVersionInput,
        },
        categories::set_skill_category,
        workspaces::add_skill_to_workspace,
    },
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallTargetRequest {
    pub target: String,
    pub alias: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallRequest {
    pub source: String,
    pub targets: Vec<InstallTargetRequest>,
    pub scope: Option<String>,
    pub project_path: Option<String>,
    pub category_ids: Vec<String>,
    pub workspace_id: Option<String>,
    pub trust: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallPreviewTarget {
    pub target: String,
    pub alias: String,
    pub destination_path: String,
    pub mode: String,
    pub conflict: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallPreview {
    pub canonical_name: String,
    pub display_name: String,
    pub version: String,
    pub content_hash: String,
    pub source_path: String,
    pub warnings: Vec<String>,
    pub targets: Vec<InstallPreviewTarget>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanonicalInstallResult {
    pub success: bool,
    pub message: String,
    pub skill_id: Option<String>,
    pub canonical_name: Option<String>,
    pub version: Option<String>,
    pub installations: Vec<InstallationRow>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DoctorIssue {
    pub installation_id: String,
    pub skill_id: String,
    pub target: String,
    pub path: String,
    pub issue_type: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DoctorReport {
    pub checked: usize,
    pub issues: Vec<DoctorIssue>,
}

pub fn targets() -> Vec<TargetInfo> {
    list_target_info()
}

pub fn preview_install(request: &InstallRequest) -> Result<InstallPreview> {
    let source_path = PathBuf::from(&request.source);
    let skill = inspect_skill_dir(&source_path)?;
    let mut warnings = skill.warnings.clone();
    warnings.extend(policy::source_warnings(&source_path));
    let scope = request.scope.as_deref().unwrap_or("user");
    let targets = normalize_targets(request, &skill)?
        .into_iter()
        .map(|target_request| {
            let alias = target_request.alias;
            let mount = resolve_target_mount(
                &target_request.target,
                scope,
                request.project_path.as_deref(),
            )?;
            let destination = mount.root.join(&alias);
            let mode = if alias != skill.canonical_name || mount.descriptor.requires_materialized_alias {
                "materialized-symlink"
            } else {
                "symlink"
            };
            Ok(InstallPreviewTarget {
                target: mount.descriptor.tool_id.to_string(),
                alias,
                conflict: existing_conflict(&destination),
                destination_path: destination.to_string_lossy().to_string(),
                mode: mode.to_string(),
            })
        })
        .collect::<Result<Vec<_>>>()?;

    Ok(InstallPreview {
        canonical_name: skill.canonical_name,
        display_name: skill.display_name,
        version: skill.version,
        content_hash: skill.content_hash,
        source_path: source_path.to_string_lossy().to_string(),
        warnings,
        targets,
    })
}

pub fn install_from_source(conn: &Connection, request: &InstallRequest) -> Result<CanonicalInstallResult> {
    let source_path = PathBuf::from(&request.source);
    let skill = inspect_skill_dir(&source_path)?;
    let mut warnings = skill.warnings.clone();
    warnings.extend(policy::source_warnings(&source_path));
    let skill_id = find_canonical_id_by_name(conn, &skill.canonical_name)?
        .unwrap_or_else(|| stable_skill_id(&skill.canonical_name));
    let canonical_path = commit_to_store(&skill)?;

    upsert_canonical_skill(
        conn,
        &CanonicalSkillInput {
            id: skill_id.clone(),
            canonical_name: skill.canonical_name.clone(),
            display_name: skill.display_name.clone(),
            latest_version: skill.version.clone(),
        },
    )?;
    upsert_skill_version(
        conn,
        &SkillVersionInput {
            skill_id: skill_id.clone(),
            version: skill.version.clone(),
            content_hash: skill.content_hash.clone(),
            canonical_path: canonical_path.to_string_lossy().to_string(),
            source_type: "local".to_string(),
            source_uri: source_path.to_string_lossy().to_string(),
            trusted: request.trust.unwrap_or(false),
            staged: false,
        },
    )?;

    let scope = request.scope.as_deref().unwrap_or("user");
    let mut installation_rows = vec![];
    for target_request in normalize_targets(request, &skill)? {
        let row = link_validated_skill(
            conn,
            &skill_id,
            &skill,
            &canonical_path,
            &target_request.target,
            scope,
            request.project_path.as_deref(),
            &target_request.alias,
            &request.category_ids,
            request.workspace_id.as_deref(),
        )?;
        installation_rows.push(row);
    }

    audit::record(
        conn,
        "install",
        Some(&skill_id),
        None,
        Some(&canonical_path.to_string_lossy()),
        &format!("已安装 canonical skill {}", skill.canonical_name),
    )?;

    Ok(CanonicalInstallResult {
        success: true,
        message: format!("已安装 {}", skill.canonical_name),
        skill_id: Some(skill_id),
        canonical_name: Some(skill.canonical_name),
        version: Some(skill.version),
        installations: installation_rows,
        warnings,
    })
}

pub fn link_existing_skill(
    conn: &Connection,
    skill_id: &str,
    target: &str,
    scope: &str,
    project_path: Option<&str>,
    alias: Option<&str>,
) -> Result<InstallationRow> {
    let version = get_latest_version(conn, skill_id)?
        .ok_or_else(|| anyhow!("未找到 canonical skill：{}", skill_id))?;
    let canonical_path = PathBuf::from(&version.canonical_path);
    let skill = inspect_skill_dir(&canonical_path)?;
    let alias = alias.unwrap_or(&version.canonical_name);
    link_validated_skill(
        conn,
        skill_id,
        &skill,
        &canonical_path,
        target,
        scope,
        project_path,
        alias,
        &[],
        None,
    )
}

pub fn unlink_installation(conn: &Connection, installation_id: &str) -> Result<()> {
    let installation = get_installation(conn, installation_id)?
        .ok_or_else(|| anyhow!("安装记录不存在：{}", installation_id))?;
    unlink_managed_mount(Path::new(&installation.mount_path))?;
    mark_installation_status(conn, installation_id, "uninstalled")?;
    db::delete_skill(conn, installation_id)?;
    audit::record(
        conn,
        "unlink",
        Some(&installation.skill_id),
        Some(&installation.target),
        Some(&installation.mount_path),
        "已移除目标工具映射",
    )?;
    Ok(())
}

pub fn set_alias(conn: &Connection, skill_id: &str, target: &str, alias: &str) -> Result<()> {
    let alias = safe_alias(alias)?;
    set_target_alias(conn, skill_id, target, &alias)?;
    audit::record(
        conn,
        "alias",
        Some(skill_id),
        Some(target),
        None,
        &format!("已设置目标别名：{}", alias),
    )?;
    Ok(())
}

pub fn doctor(conn: &Connection) -> Result<DoctorReport> {
    let installations = list_installations(conn, None, None)?;
    let mut issues = vec![];
    for installation in &installations {
        match std::fs::symlink_metadata(&installation.mount_path) {
            Ok(_) => {}
            Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
                issues.push(DoctorIssue {
                    installation_id: installation.id.clone(),
                    skill_id: installation.skill_id.clone(),
                    target: installation.target.clone(),
                    path: installation.mount_path.clone(),
                    issue_type: "missing-mount".to_string(),
                    message: "目标工具映射路径不存在".to_string(),
                });
            }
            Err(err) => {
                issues.push(DoctorIssue {
                    installation_id: installation.id.clone(),
                    skill_id: installation.skill_id.clone(),
                    target: installation.target.clone(),
                    path: installation.mount_path.clone(),
                    issue_type: "metadata-error".to_string(),
                    message: err.to_string(),
                });
            }
        }
    }
    Ok(DoctorReport { checked: installations.len(), issues })
}

pub fn repair(conn: &Connection) -> Result<DoctorReport> {
    let report = doctor(conn)?;
    for issue in &report.issues {
        if issue.issue_type != "missing-mount" {
            continue;
        }
        if let Some(installation) = get_installation(conn, &issue.installation_id)? {
            let alias = installation.alias.clone().unwrap_or_else(|| "skill".to_string());
            let _ = link_existing_skill(
                conn,
                &installation.skill_id,
                &installation.target,
                &installation.scope,
                installation.project_path.as_deref(),
                Some(&alias),
            );
        }
    }
    doctor(conn)
}

fn link_validated_skill(
    conn: &Connection,
    skill_id: &str,
    skill: &ValidatedSkill,
    canonical_path: &Path,
    target: &str,
    scope: &str,
    project_path: Option<&str>,
    alias: &str,
    category_ids: &[String],
    workspace_id: Option<&str>,
) -> Result<InstallationRow> {
    let alias = safe_alias(alias)?;
    let mount = resolve_target_mount(target, scope, project_path)?;
    let result = materialize(&MaterializeRequest {
        skill_id: skill_id.to_string(),
        target: mount.descriptor.clone(),
        target_root: mount.root,
        canonical_path: canonical_path.to_path_buf(),
        alias: alias.clone(),
        skill: skill.clone(),
    })?;
    let installation_id = installation_id_for(skill_id, target, scope, project_path, &alias);

    upsert_installation(
        conn,
        &InstallationInput {
            id: installation_id.clone(),
            skill_id: skill_id.to_string(),
            version: skill.version.clone(),
            target: target.to_string(),
            scope: scope.to_string(),
            project_path: project_path.map(String::from),
            alias: alias.clone(),
            mount_path: result.mount_path.to_string_lossy().to_string(),
            mode: result.mode,
            status: "installed".to_string(),
        },
    )?;

    db::upsert_skill(
        conn,
        &SkillMeta {
            id: installation_id.clone(),
            name: skill.display_name.clone(),
            original_name: skill.canonical_name.clone(),
            description: skill.description.clone(),
            source: skill.source.clone(),
            version: Some(skill.version.clone()),
            install_path: result.mount_path.to_string_lossy().to_string(),
            tool_id: target.to_string(),
            enabled: true,
        },
    )?;

    for category_id in category_ids {
        set_skill_category(conn, &installation_id, category_id)?;
    }
    if let Some(workspace_id) = workspace_id {
        add_skill_to_workspace(conn, workspace_id, &installation_id)?;
    }

    if alias != skill.canonical_name {
        set_target_alias(conn, skill_id, target, &alias)?;
    }
    audit::record(
        conn,
        "link",
        Some(skill_id),
        Some(target),
        Some(&result.mount_path.to_string_lossy()),
        &format!("已映射到 {}，alias={}", target, alias),
    )?;

    let mut rows = list_installations(conn, Some(target), Some(skill_id))?;
    rows.retain(|row| row.id == installation_id);
    rows.pop()
        .ok_or_else(|| anyhow!("安装记录写入后未能读取：{}", installation_id))
}

#[derive(Debug, Clone)]
struct NormalizedTargetRequest {
    target: String,
    alias: String,
}

fn normalize_targets(
    request: &InstallRequest,
    skill: &ValidatedSkill,
) -> Result<Vec<NormalizedTargetRequest>> {
    let targets = if request.targets.is_empty() {
        vec![InstallTargetRequest {
            target: "agents".to_string(),
            alias: None,
        }]
    } else {
        request.targets.clone()
    };

    targets
        .into_iter()
        .map(|target| {
            let alias = target
                .alias
                .as_deref()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or(&skill.canonical_name);
            Ok(NormalizedTargetRequest {
                target: target.target,
                alias: safe_alias(alias)?,
            })
        })
        .collect()
}

fn existing_conflict(path: &Path) -> Option<String> {
    match std::fs::symlink_metadata(path) {
        Ok(metadata) if metadata.file_type().is_symlink() => None,
        Ok(metadata) if metadata.is_dir() => {
            if path.join(".skillmanager-copy.json").exists() {
                None
            } else {
                Some("目标目录已存在且不是 SkillManager 管理目录".to_string())
            }
        }
        Ok(_) => Some("目标路径已存在且不是目录".to_string()),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => None,
        Err(err) => Some(err.to_string()),
    }
}
