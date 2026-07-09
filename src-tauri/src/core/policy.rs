use anyhow::{anyhow, Context, Result};
use std::path::{Path, PathBuf};

#[allow(dead_code)]
pub fn canonicalize_existing(path: &Path) -> Result<PathBuf> {
    path.canonicalize()
        .with_context(|| format!("无法解析路径：{}", path.display()))
}

#[allow(dead_code)]
pub fn ensure_path_inside(root: &Path, candidate: &Path) -> Result<()> {
    let root = canonicalize_existing(root)?;
    let candidate = canonicalize_existing(candidate)?;
    if !candidate.starts_with(&root) {
        return Err(anyhow!(
            "路径不在允许目录内：{} 不属于 {}",
            candidate.display(),
            root.display()
        ));
    }
    Ok(())
}

pub fn ensure_no_symlink_escape(root: &Path) -> Result<()> {
    if !root.exists() {
        return Err(anyhow!("技能目录不存在：{}", root.display()));
    }
    let root_real = root
        .canonicalize()
        .with_context(|| format!("无法解析技能目录：{}", root.display()))?;

    for entry in walkdir::WalkDir::new(root).follow_links(false) {
        let entry = entry?;
        let path = entry.path();
        let metadata = std::fs::symlink_metadata(path)
            .with_context(|| format!("无法读取路径元数据：{}", path.display()))?;
        if !metadata.file_type().is_symlink() {
            continue;
        }
        let target_real = path
            .canonicalize()
            .with_context(|| format!("无法解析软链接目标：{}", path.display()))?;
        if !target_real.starts_with(&root_real) {
            return Err(anyhow!(
                "技能目录包含逃逸软链接：{} -> {}",
                path.display(),
                target_real.display()
            ));
        }
    }
    Ok(())
}

pub fn source_warnings(path: &Path) -> Vec<String> {
    let mut warnings = vec![];
    let raw = path.to_string_lossy();
    if raw.contains("/Downloads/") || raw.ends_with("/Downloads") {
        warnings.push("来源位于 Downloads，安装前建议确认来源可信。".to_string());
    }
    if raw.starts_with("/tmp/") || raw.starts_with("/private/tmp/") {
        warnings.push("来源位于临时目录，canonical store 会保存一份受管副本。".to_string());
    }
    warnings
}

#[allow(dead_code)]
pub fn is_managed_path(path: &Path, managed_roots: &[PathBuf]) -> bool {
    let Ok(real_path) = path.canonicalize() else {
        return false;
    };
    managed_roots
        .iter()
        .filter_map(|root| root.canonicalize().ok())
        .any(|root| real_path.starts_with(root))
}
