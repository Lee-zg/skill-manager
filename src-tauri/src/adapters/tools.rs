use anyhow::Result;
use anyhow::{anyhow, Context};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

use super::{SkillMeta, ToolAdapter};
use crate::utils::skill_parser::parse_skill_md;

pub struct ClaudeCodeAdapter;
pub struct AgentsAdapter;
pub struct CcSwitchAdapter;

// ── helpers ────────────────────────────────────────────────────────────────

fn home() -> Option<PathBuf> {
    dirs_next::home_dir()
}

fn stable_skill_id(tool_id: &str, install_path: &Path) -> String {
    let input = format!("{}:{}", tool_id, install_path.to_string_lossy());
    let mut hash = 0xcbf29ce484222325u64;
    for byte in input.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{}-{hash:016x}", tool_id)
}

fn scan_dir(dir: PathBuf, tool_id: &str) -> Result<Vec<SkillMeta>> {
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut skills = vec![];

    for entry in WalkDir::new(&dir).min_depth(1).max_depth(1) {
        let entry = entry?;
        if !entry.file_type().is_dir() {
            continue;
        }
        let skill_dir = entry.path();
        let skill_md = skill_dir.join("SKILL.md");
        if !skill_md.exists() {
            continue;
        }

        let meta = parse_skill_md(&skill_md).unwrap_or_else(|err| {
            eprintln!("SKILL.md 解析失败 {:?}: {}", skill_md, err);
            Default::default()
        });
        let original_name = skill_dir
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let enabled = !skill_dir.join(".disabled").exists();

        skills.push(SkillMeta {
            id: stable_skill_id(tool_id, skill_dir),
            name: if meta.name.is_empty() { original_name.clone() } else { meta.name },
            original_name,
            description: if meta.description.is_empty() { None } else { Some(meta.description) },
            source: if meta.source.is_empty() { None } else { Some(meta.source) },
            version: if meta.version.is_empty() { None } else { Some(meta.version) },
            install_path: skill_dir.to_string_lossy().to_string(),
            tool_id: tool_id.to_string(),
            enabled,
        });
    }
    Ok(skills)
}

fn validate_skill_path(root: &Path, skill_path: &str) -> Result<PathBuf> {
    let root = root
        .canonicalize()
        .with_context(|| format!("无法解析技能根目录 {:?}", root))?;
    let target = PathBuf::from(skill_path)
        .canonicalize()
        .with_context(|| format!("无法解析技能路径 {}", skill_path))?;

    // 所有文件操作都必须限制在对应工具的 skills 根目录下，避免误删任意路径。
    if !target.starts_with(&root) {
        return Err(anyhow!("技能路径不在允许目录内: {}", skill_path));
    }
    Ok(target)
}

fn toggle_skill(root: &Path, skill_path: &str, enable: bool) -> Result<()> {
    let safe_skill_path = validate_skill_path(root, skill_path)?;
    let marker = safe_skill_path.join(".disabled");
    if enable {
        if marker.exists() { fs::remove_file(marker)?; }
    } else {
        fs::write(marker, "")?;
    }
    Ok(())
}

fn uninstall(root: &Path, skill_path: &str) -> Result<()> {
    let safe_skill_path = validate_skill_path(root, skill_path)?;
    fs::remove_dir_all(safe_skill_path)?;
    Ok(())
}

// ── Claude Code ─────────────────────────────────────────────────────────────

impl ToolAdapter for ClaudeCodeAdapter {
    fn id(&self) -> &str { "claude-code" }
    fn name(&self) -> &str { "Claude Code" }
    fn skills_path(&self) -> Option<PathBuf> {
        home().map(|h| h.join(".claude").join("skills"))
    }
    fn scan(&self) -> Result<Vec<SkillMeta>> {
        scan_dir(self.skills_path().unwrap_or_default(), self.id())
    }
    fn enable_skill(&self, p: &str) -> Result<()> { toggle_skill(&self.skills_path().unwrap_or_default(), p, true) }
    fn disable_skill(&self, p: &str) -> Result<()> { toggle_skill(&self.skills_path().unwrap_or_default(), p, false) }
    fn uninstall_skill(&self, p: &str) -> Result<()> { uninstall(&self.skills_path().unwrap_or_default(), p) }
}

// ── Agents ──────────────────────────────────────────────────────────────────

impl ToolAdapter for AgentsAdapter {
    fn id(&self) -> &str { "agents" }
    fn name(&self) -> &str { "Agents" }
    fn skills_path(&self) -> Option<PathBuf> {
        home().map(|h| h.join(".agents").join("skills"))
    }
    fn scan(&self) -> Result<Vec<SkillMeta>> {
        scan_dir(self.skills_path().unwrap_or_default(), self.id())
    }
    fn enable_skill(&self, p: &str) -> Result<()> { toggle_skill(&self.skills_path().unwrap_or_default(), p, true) }
    fn disable_skill(&self, p: &str) -> Result<()> { toggle_skill(&self.skills_path().unwrap_or_default(), p, false) }
    fn uninstall_skill(&self, p: &str) -> Result<()> { uninstall(&self.skills_path().unwrap_or_default(), p) }
}

// ── cc-switch ───────────────────────────────────────────────────────────────

impl ToolAdapter for CcSwitchAdapter {
    fn id(&self) -> &str { "cc-switch" }
    fn name(&self) -> &str { "cc-switch" }
    fn skills_path(&self) -> Option<PathBuf> {
        home().map(|h| h.join(".cc-switch").join("skills"))
    }
    fn scan(&self) -> Result<Vec<SkillMeta>> {
        scan_dir(self.skills_path().unwrap_or_default(), self.id())
    }
    fn enable_skill(&self, p: &str) -> Result<()> { toggle_skill(&self.skills_path().unwrap_or_default(), p, true) }
    fn disable_skill(&self, p: &str) -> Result<()> { toggle_skill(&self.skills_path().unwrap_or_default(), p, false) }
    fn uninstall_skill(&self, p: &str) -> Result<()> { uninstall(&self.skills_path().unwrap_or_default(), p) }
}
