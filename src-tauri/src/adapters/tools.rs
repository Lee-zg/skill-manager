use anyhow::Result;
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;
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

        let meta = parse_skill_md(&skill_md).unwrap_or_default();
        let original_name = skill_dir
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let enabled = !skill_dir.join(".disabled").exists();

        skills.push(SkillMeta {
            id: Uuid::new_v4().to_string(),
            name: if meta.name.is_empty() { original_name.clone() } else { meta.name },
            original_name,
            description: if meta.description.is_empty() { None } else { Some(meta.description) },
            version: None,
            install_path: skill_dir.to_string_lossy().to_string(),
            tool_id: tool_id.to_string(),
            enabled,
        });
    }
    Ok(skills)
}

fn toggle_skill(skill_path: &str, enable: bool) -> Result<()> {
    let marker = PathBuf::from(skill_path).join(".disabled");
    if enable {
        if marker.exists() { fs::remove_file(marker)?; }
    } else {
        fs::write(marker, "")?;
    }
    Ok(())
}

fn uninstall(skill_path: &str) -> Result<()> {
    fs::remove_dir_all(skill_path)?;
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
    fn enable_skill(&self, p: &str) -> Result<()> { toggle_skill(p, true) }
    fn disable_skill(&self, p: &str) -> Result<()> { toggle_skill(p, false) }
    fn uninstall_skill(&self, p: &str) -> Result<()> { uninstall(p) }
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
    fn enable_skill(&self, p: &str) -> Result<()> { toggle_skill(p, true) }
    fn disable_skill(&self, p: &str) -> Result<()> { toggle_skill(p, false) }
    fn uninstall_skill(&self, p: &str) -> Result<()> { uninstall(p) }
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
    fn enable_skill(&self, p: &str) -> Result<()> { toggle_skill(p, true) }
    fn disable_skill(&self, p: &str) -> Result<()> { toggle_skill(p, false) }
    fn uninstall_skill(&self, p: &str) -> Result<()> { uninstall(p) }
}
