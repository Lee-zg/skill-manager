use anyhow::{Context, Result};
use serde::Deserialize;
use std::fs;
use std::path::Path;

#[derive(Debug, Default)]
pub struct SkillMetadata {
    pub name: String,
    pub description: String,
    pub source: String,
    pub version: String,
    pub author: String,
    pub tags: Vec<String>,
    pub categories: Vec<String>,
}

#[derive(Debug, Default, Deserialize)]
struct SkillFrontmatter {
    name: Option<String>,
    description: Option<String>,
    source: Option<String>,
    version: Option<String>,
    author: Option<String>,
    tags: Option<StringList>,
    categories: Option<StringList>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum StringList {
    One(String),
    Many(Vec<String>),
}

impl StringList {
    fn into_vec(self) -> Vec<String> {
        match self {
            Self::One(value) => value
                .split(',')
                .map(str::trim)
                .filter(|item| !item.is_empty())
                .map(String::from)
                .collect(),
            Self::Many(values) => values
                .into_iter()
                .map(|value| value.trim().to_string())
                .filter(|item| !item.is_empty())
                .collect(),
        }
    }
}

pub fn parse_skill_md(path: &Path) -> Result<SkillMetadata> {
    let content = fs::read_to_string(path)
        .with_context(|| format!("Failed to read SKILL.md at {:?}", path))?;

    let Some(frontmatter) = extract_frontmatter(&content) else {
        return Ok(SkillMetadata::default());
    };

    // 使用 YAML 解析器处理 frontmatter，避免冒号、引号、多行文本导致解析错误。
    let parsed: SkillFrontmatter = serde_yaml::from_str(frontmatter)
        .with_context(|| format!("Failed to parse YAML frontmatter at {:?}", path))?;

    Ok(SkillMetadata {
        name: parsed.name.unwrap_or_default(),
        description: parsed.description.unwrap_or_default(),
        source: parsed.source.unwrap_or_default(),
        version: parsed.version.unwrap_or_default(),
        author: parsed.author.unwrap_or_default(),
        tags: parsed.tags.map(StringList::into_vec).unwrap_or_default(),
        categories: parsed.categories.map(StringList::into_vec).unwrap_or_default(),
    })
}

fn extract_frontmatter(content: &str) -> Option<&str> {
    let normalized_start = if let Some(trimmed) = content.strip_prefix("---\n") {
        trimmed
    } else {
        content.strip_prefix("---\r\n")?
    };
    let end = normalized_start
        .find("\n---")
        .or_else(|| normalized_start.find("\r\n---"))?;
    Some(&normalized_start[..end])
}
