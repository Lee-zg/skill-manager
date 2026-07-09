use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};
use walkdir::WalkDir;

use crate::{db::canonical::stable_hash64, utils::skill_parser::parse_skill_md};

const DEFAULT_VERSION: &str = "0.0.0";
const SKILL_FILE_NAME: &str = "SKILL.md";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidatedSkill {
    pub canonical_name: String,
    pub display_name: String,
    pub version: String,
    pub description: Option<String>,
    pub source: Option<String>,
    pub author: Option<String>,
    pub tags: Vec<String>,
    pub categories: Vec<String>,
    pub content_hash: String,
    pub source_path: PathBuf,
    pub warnings: Vec<String>,
}

pub fn inspect_skill_dir(source_path: &Path) -> Result<ValidatedSkill> {
    if !source_path.is_dir() {
        return Err(anyhow!("技能来源不是目录：{}", source_path.display()));
    }
    let skill_md = source_path.join(SKILL_FILE_NAME);
    if !skill_md.exists() {
        return Err(anyhow!("技能目录缺少 SKILL.md：{}", source_path.display()));
    }

    crate::core::policy::ensure_no_symlink_escape(source_path)?;

    let metadata = parse_skill_md(&skill_md)?;
    let fallback_name = source_path
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| "skill".to_string());
    let raw_name = if metadata.name.trim().is_empty() {
        fallback_name
    } else {
        metadata.name.trim().to_string()
    };
    let canonical_name = normalize_skill_name(&raw_name)
        .ok_or_else(|| anyhow!("技能 name 必须是 lowercase-hyphen 风格：{}", raw_name))?;
    let version = if metadata.version.trim().is_empty() {
        DEFAULT_VERSION.to_string()
    } else {
        metadata.version.trim().to_string()
    };

    let mut warnings = vec![];
    if metadata.description.trim().is_empty() {
        warnings.push("SKILL.md frontmatter 缺少 description，已允许安装但建议补齐。".to_string());
    }

    Ok(ValidatedSkill {
        canonical_name: canonical_name.clone(),
        display_name: raw_name,
        version,
        description: empty_to_none(metadata.description),
        source: empty_to_none(metadata.source),
        author: empty_to_none(metadata.author),
        tags: metadata.tags,
        categories: metadata.categories,
        content_hash: hash_skill_dir(source_path)?,
        source_path: source_path.to_path_buf(),
        warnings,
    })
}

pub fn normalize_skill_name(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    let mut normalized = String::new();
    let mut previous_dash = false;
    for ch in trimmed.chars() {
        if ch.is_ascii_lowercase() || ch.is_ascii_digit() {
            normalized.push(ch);
            previous_dash = false;
        } else if (ch == '-' || ch == '_' || ch.is_whitespace()) && !previous_dash {
            normalized.push('-');
            previous_dash = true;
        } else {
            return None;
        }
    }
    let normalized = normalized.trim_matches('-').to_string();
    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}

pub fn safe_alias(value: &str) -> Result<String> {
    normalize_skill_name(value)
        .ok_or_else(|| anyhow!("alias 必须是 lowercase-hyphen 风格：{}", value))
}

fn hash_skill_dir(source_path: &Path) -> Result<String> {
    let mut files = vec![];
    for entry in WalkDir::new(source_path).follow_links(false) {
        let entry = entry?;
        let path = entry.path();
        let metadata = fs::symlink_metadata(path)
            .with_context(|| format!("无法读取文件元数据：{}", path.display()))?;
        if metadata.is_file() {
            files.push(path.to_path_buf());
        }
    }
    files.sort();

    let mut hash = 0xcbf29ce484222325u64;
    for path in files {
        let relative = path
            .strip_prefix(source_path)
            .unwrap_or(path.as_path())
            .to_string_lossy();
        hash = combine_hash(hash, stable_hash64(&relative));
        let content = fs::read(&path)
            .with_context(|| format!("无法读取技能文件：{}", path.display()))?;
        for byte in content {
            hash ^= byte as u64;
            hash = hash.wrapping_mul(0x100000001b3);
        }
    }

    Ok(format!("fnv64:{hash:016x}"))
}

fn combine_hash(mut seed: u64, value: u64) -> u64 {
    for byte in value.to_le_bytes() {
        seed ^= byte as u64;
        seed = seed.wrapping_mul(0x100000001b3);
    }
    seed
}

fn empty_to_none(value: String) -> Option<String> {
    let value = value.trim().to_string();
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

#[cfg(test)]
mod tests {
    use super::{normalize_skill_name, safe_alias};

    #[test]
    fn normalizes_simple_names() {
        assert_eq!(normalize_skill_name("api-auditor").as_deref(), Some("api-auditor"));
        assert_eq!(normalize_skill_name("api_auditor").as_deref(), Some("api-auditor"));
        assert_eq!(normalize_skill_name("api auditor").as_deref(), Some("api-auditor"));
        assert!(normalize_skill_name("API Auditor").is_none());
    }

    #[test]
    fn rejects_invalid_alias() {
        assert!(safe_alias("api-review").is_ok());
        assert!(safe_alias("../api").is_err());
    }
}
