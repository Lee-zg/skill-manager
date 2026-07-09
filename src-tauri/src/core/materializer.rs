use anyhow::{anyhow, Context, Result};
use serde_json::json;
use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{
    core::{
        adapter_registry::TargetDescriptor,
        manifest::ValidatedSkill,
        store::{copy_dir_all, materialized_root},
    },
};

const SKILL_FILE_NAME: &str = "SKILL.md";
const MATERIALIZED_MARKER: &str = ".skillmanager-materialized.json";
const COPIED_MARKER: &str = ".skillmanager-copy.json";

#[derive(Debug, Clone)]
pub struct MaterializeRequest {
    pub skill_id: String,
    pub target: TargetDescriptor,
    pub target_root: PathBuf,
    pub canonical_path: PathBuf,
    pub alias: String,
    pub skill: ValidatedSkill,
}

#[derive(Debug, Clone)]
pub struct MaterializeResult {
    pub mount_path: PathBuf,
    pub mode: String,
}

pub fn materialize(request: &MaterializeRequest) -> Result<MaterializeResult> {
    fs::create_dir_all(&request.target_root)?;
    let mount_path = request.target_root.join(&request.alias);
    let requires_wrapper = request.alias != request.skill.canonical_name
        || request.target.requires_materialized_alias;

    let source_path = if requires_wrapper {
        create_materialized_wrapper(request)?
    } else {
        request.canonical_path.clone()
    };

    prepare_mount_path(&mount_path)?;
    if request.target.supports_symlink {
        create_symlink(&source_path, &mount_path)?;
        Ok(MaterializeResult {
            mount_path,
            mode: if requires_wrapper {
                "materialized-symlink".to_string()
            } else {
                "symlink".to_string()
            },
        })
    } else {
        copy_dir_all(&source_path, &mount_path)?;
        write_copy_marker(&mount_path, &request.skill_id, &request.target.tool_id)?;
        Ok(MaterializeResult {
            mount_path,
            mode: if requires_wrapper {
                "materialized-copy".to_string()
            } else {
                "copy".to_string()
            },
        })
    }
}

pub fn unlink_managed_mount(path: &Path) -> Result<()> {
    let metadata = fs::symlink_metadata(path)
        .with_context(|| format!("无法读取安装路径：{}", path.display()))?;
    if metadata.file_type().is_symlink() {
        fs::remove_file(path)
            .with_context(|| format!("无法移除安装软链接：{}", path.display()))?;
        return Ok(());
    }

    if metadata.is_dir() && path.join(COPIED_MARKER).exists() {
        fs::remove_dir_all(path)
            .with_context(|| format!("无法移除受管安装目录：{}", path.display()))?;
        return Ok(());
    }

    Err(anyhow!(
        "拒绝删除非 SkillManager 管理路径：{}",
        path.display()
    ))
}

fn create_materialized_wrapper(request: &MaterializeRequest) -> Result<PathBuf> {
    let wrapper_path = materialized_root()
        .join(request.target.tool_id)
        .join(&request.skill_id)
        .join(&request.alias);
    if wrapper_path.exists() {
        fs::remove_dir_all(&wrapper_path)
            .with_context(|| format!("无法替换 wrapper：{}", wrapper_path.display()))?;
    }
    fs::create_dir_all(&wrapper_path)?;
    write_rewritten_skill_md(request, &wrapper_path)?;

    for entry in fs::read_dir(&request.canonical_path)? {
        let entry = entry?;
        let file_name = entry.file_name();
        if file_name == SKILL_FILE_NAME || file_name == ".skillmanager-canonical.json" {
            continue;
        }
        let source = entry.path();
        let target = wrapper_path.join(file_name);
        create_link_or_copy(&source, &target)?;
    }

    fs::write(
        wrapper_path.join(MATERIALIZED_MARKER),
        serde_json::to_vec_pretty(&json!({
            "managed_by": "SkillManager",
            "skill_id": request.skill_id,
            "canonical_name": request.skill.canonical_name,
            "alias": request.alias,
            "target": request.target.tool_id,
            "canonical_path": request.canonical_path.to_string_lossy(),
        }))?,
    )?;
    Ok(wrapper_path)
}

fn write_rewritten_skill_md(request: &MaterializeRequest, wrapper_path: &Path) -> Result<()> {
    let skill_md_path = request.canonical_path.join(SKILL_FILE_NAME);
    let content = fs::read_to_string(&skill_md_path)
        .with_context(|| format!("无法读取 canonical SKILL.md：{}", skill_md_path.display()))?;
    let body = strip_frontmatter(&content);
    let description = request
        .skill
        .description
        .clone()
        .unwrap_or_else(|| format!("Alias of {}", request.skill.canonical_name));
    let rewritten = format!(
        "---\nname: {}\ndescription: {}\nx-skillmanager:\n  canonical_name: {}\n  canonical_version: {}\n  materialized: true\n---\n\nThis is a SkillManager materialized alias for `{}`.\n\n{}",
        request.alias,
        yaml_single_line(&description),
        request.skill.canonical_name,
        request.skill.version,
        request.skill.canonical_name,
        body.trim_start()
    );
    fs::write(wrapper_path.join(SKILL_FILE_NAME), rewritten)?;
    Ok(())
}

fn prepare_mount_path(path: &Path) -> Result<()> {
    match fs::symlink_metadata(path) {
        Ok(metadata) => {
            if metadata.file_type().is_symlink() {
                fs::remove_file(path)
                    .with_context(|| format!("无法替换旧软链接：{}", path.display()))?;
                return Ok(());
            }
            if metadata.is_dir() && path.join(COPIED_MARKER).exists() {
                fs::remove_dir_all(path)
                    .with_context(|| format!("无法替换受管目录：{}", path.display()))?;
                return Ok(());
            }
            Err(anyhow!("目标路径已存在且非受管路径：{}", path.display()))
        }
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(err) => Err(err).with_context(|| format!("无法检查目标路径：{}", path.display())),
    }
}

fn create_link_or_copy(source: &Path, target: &Path) -> Result<()> {
    match create_symlink(source, target) {
        Ok(()) => Ok(()),
        Err(_) if source.is_dir() => copy_dir_all(source, target),
        Err(_) => {
            fs::copy(source, target).with_context(|| {
                format!(
                    "无法复制 wrapper 资源：{} -> {}",
                    source.display(),
                    target.display()
                )
            })?;
            Ok(())
        }
    }
}

fn write_copy_marker(path: &Path, skill_id: &str, target: &str) -> Result<()> {
    fs::write(
        path.join(COPIED_MARKER),
        serde_json::to_vec_pretty(&json!({
            "managed_by": "SkillManager",
            "skill_id": skill_id,
            "target": target,
        }))?,
    )?;
    Ok(())
}

fn strip_frontmatter(content: &str) -> &str {
    let Some(rest) = content.strip_prefix("---\n").or_else(|| content.strip_prefix("---\r\n")) else {
        return content;
    };
    if let Some(index) = rest.find("\n---") {
        return &rest[index + 4..];
    }
    if let Some(index) = rest.find("\r\n---") {
        return &rest[index + 5..];
    }
    content
}

fn yaml_single_line(value: &str) -> String {
    let escaped = value.replace('\\', "\\\\").replace('"', "\\\"");
    format!("\"{escaped}\"")
}

#[cfg(unix)]
fn create_symlink(source: &Path, target: &Path) -> Result<()> {
    std::os::unix::fs::symlink(source, target).with_context(|| {
        format!(
            "无法创建软链接：{} -> {}",
            target.display(),
            source.display()
        )
    })
}

#[cfg(windows)]
fn create_symlink(source: &Path, target: &Path) -> Result<()> {
    if source.is_dir() {
        std::os::windows::fs::symlink_dir(source, target)
    } else {
        std::os::windows::fs::symlink_file(source, target)
    }
    .with_context(|| {
        format!(
            "无法创建软链接：{} -> {}",
            target.display(),
            source.display()
        )
    })
}
