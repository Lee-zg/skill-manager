use anyhow::{Context, Result};
use std::fs;
use std::path::Path;

#[derive(Debug, Default)]
pub struct SkillMetadata {
    pub name: String,
    pub description: String,
}

pub fn parse_skill_md(path: &Path) -> Result<SkillMetadata> {
    let content = fs::read_to_string(path)
        .with_context(|| format!("Failed to read SKILL.md at {:?}", path))?;

    let mut meta = SkillMetadata::default();
    let mut in_frontmatter = false;
    let mut frontmatter_lines = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();

        if trimmed == "---" {
            in_frontmatter = !in_frontmatter;
            continue;
        }

        if in_frontmatter {
            frontmatter_lines.push(trimmed);
        }
    }

    // Parse YAML frontmatter
    for line in frontmatter_lines {
        if let Some((key, value)) = line.split_once(':') {
            let key = key.trim();
            let value = value.trim();

            match key {
                "name" => meta.name = value.to_string(),
                "description" => meta.description = value.to_string(),
                _ => {}
            }
        }
    }

    Ok(meta)
}
