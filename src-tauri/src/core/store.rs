use anyhow::{anyhow, Context, Result};
use serde_json::json;
use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{
    app_meta::CONFIG_DIR_NAME,
    core::manifest::ValidatedSkill,
};

const MANIFEST_FILE: &str = ".skillmanager-canonical.json";

pub fn config_root() -> PathBuf {
    dirs_next::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(CONFIG_DIR_NAME)
}

pub fn canonical_store_root() -> PathBuf {
    config_root().join("skills")
}

pub fn materialized_root() -> PathBuf {
    config_root().join("materialized")
}

pub fn canonical_skill_path(skill: &ValidatedSkill) -> PathBuf {
    canonical_store_root()
        .join(&skill.canonical_name)
        .join(&skill.version)
}

pub fn commit_to_store(skill: &ValidatedSkill) -> Result<PathBuf> {
    let target = canonical_skill_path(skill);
    let root = canonical_store_root();
    fs::create_dir_all(&root)?;

    if target.exists() {
        ensure_managed_or_empty(&target)?;
        fs::remove_dir_all(&target)
            .with_context(|| format!("无法替换 canonical 技能目录：{}", target.display()))?;
    }
    fs::create_dir_all(&target)?;
    copy_dir_all(&skill.source_path, &target)?;
    write_canonical_manifest(skill, &target)?;
    Ok(target)
}

pub fn copy_dir_all(source: &Path, target: &Path) -> Result<()> {
    fs::create_dir_all(target)?;
    for entry in fs::read_dir(source).with_context(|| format!("无法读取目录：{}", source.display()))? {
        let entry = entry?;
        let source_path = entry.path();
        let target_path = target.join(entry.file_name());
        let metadata = fs::symlink_metadata(&source_path)
            .with_context(|| format!("无法读取路径元数据：{}", source_path.display()))?;
        if metadata.file_type().is_symlink() {
            return Err(anyhow!("暂不复制包含软链接的技能文件：{}", source_path.display()));
        }
        if metadata.is_dir() {
            copy_dir_all(&source_path, &target_path)?;
        } else if metadata.is_file() {
            fs::copy(&source_path, &target_path).with_context(|| {
                format!(
                    "无法复制技能文件：{} -> {}",
                    source_path.display(),
                    target_path.display()
                )
            })?;
        }
    }
    Ok(())
}

fn write_canonical_manifest(skill: &ValidatedSkill, target: &Path) -> Result<()> {
    let manifest = json!({
        "managed_by": "SkillManager",
        "canonical_name": skill.canonical_name,
        "version": skill.version,
        "content_hash": skill.content_hash,
        "source_path": skill.source_path.to_string_lossy(),
    });
    fs::write(target.join(MANIFEST_FILE), serde_json::to_vec_pretty(&manifest)?)?;
    Ok(())
}

fn ensure_managed_or_empty(path: &Path) -> Result<()> {
    if !path.exists() {
        return Ok(());
    }
    let mut entries = fs::read_dir(path)?;
    if entries.next().is_none() {
        return Ok(());
    }
    if !path.join(MANIFEST_FILE).exists() {
        return Err(anyhow!(
            "canonical 目标目录已存在且不是 SkillManager 管理目录：{}",
            path.display()
        ));
    }
    Ok(())
}
