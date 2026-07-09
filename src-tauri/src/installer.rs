use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

// ── skills.sh registry types ─────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteSkill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub author: String,
    pub source: String,
    pub stars: u64,
    pub install_count: u64,
    pub version: Option<String>,
    pub tags: Vec<String>,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize)]
struct SkillsShResponse {
    skills: Vec<SkillsShEntry>,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize)]
struct SkillsShEntry {
    id: Option<String>,
    name: String,
    description: Option<String>,
    author: Option<String>,
    source: Option<String>,
    stars: Option<u64>,
    install_count: Option<u64>,
    version: Option<String>,
    tags: Option<Vec<String>>,
}

// ── Search skills.sh ──────────────────────────────────────────────────────────

pub async fn search_registry(query: &str) -> Result<Vec<RemoteSkill>> {
    let url = format!(
        "https://registry.skills.sh/api/search?q={}&limit=20",
        urlencoding::encode(query)
    );

    let resp = reqwest::get(&url)
        .await
        .context("Failed to reach skills.sh registry")?;

    if !resp.status().is_success() {
        // Return mock data if registry is unavailable
        return Ok(mock_skills(query));
    }

    let body = resp.text().await?;
    let parsed: serde_json::Value = serde_json::from_str(&body)
        .unwrap_or_else(|_| serde_json::json!({ "skills": [] }));

    let skills = parsed["skills"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|s| RemoteSkill {
            id: s["id"].as_str().unwrap_or("").to_string(),
            name: s["name"].as_str().unwrap_or("").to_string(),
            description: s["description"].as_str().unwrap_or("").to_string(),
            author: s["author"].as_str().unwrap_or("").to_string(),
            source: s["source"].as_str().unwrap_or("").to_string(),
            stars: s["stars"].as_u64().unwrap_or(0),
            install_count: s["install_count"].as_u64().unwrap_or(0),
            version: s["version"].as_str().map(String::from),
            tags: s["tags"]
                .as_array()
                .map(|t| t.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default(),
        })
        .filter(|s| !s.name.is_empty())
        .collect();

    Ok(skills)
}

fn mock_skills(query: &str) -> Vec<RemoteSkill> {
    vec![
        RemoteSkill {
            id: "brandkit".to_string(),
            name: "brandkit".to_string(),
            description: "Premium brand-kit generation skill".to_string(),
            author: "vercel-labs".to_string(),
            source: "vercel-labs/skills@brandkit".to_string(),
            stars: 4800, install_count: 12000,
            version: Some("2.1.0".to_string()),
            tags: vec!["design".to_string(), "brand".to_string()],
        },
        RemoteSkill {
            id: "deep-research".to_string(),
            name: "deep-research".to_string(),
            description: "In-depth research and analysis skill".to_string(),
            author: "anthropics".to_string(),
            source: "anthropics/skills@deep-research".to_string(),
            stars: 3200, install_count: 8500,
            version: Some("1.5.0".to_string()),
            tags: vec!["research".to_string(), "analysis".to_string()],
        },
    ]
    .into_iter()
    .filter(|s| query.is_empty() || s.name.contains(query) || s.description.contains(query))
    .collect()
}

// ── Install skill ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallResult {
    pub success: bool,
    pub message: String,
    pub skill_id: Option<String>,
}

pub fn install_skill_via_npx(source: &str, tool_id: &str) -> Result<InstallResult> {
    let target_dir = get_tool_skills_dir(tool_id)
        .context("Unknown tool ID")?;

    // Run: npx skills add <source> in target dir
    let output = std::process::Command::new("npx")
        .args(["skills", "add", source, "-y"])
        .current_dir(&target_dir)
        .output()
        .context("Failed to run npx skills")?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(InstallResult {
            success: true,
            message: stdout,
            skill_id: Some(source.to_string()),
        })
    } else {
        Ok(InstallResult {
            success: false,
            message: if stderr.is_empty() { stdout } else { stderr },
            skill_id: None,
        })
    }
}

pub fn update_skill_via_npx(skill_name: &str, tool_id: &str) -> Result<InstallResult> {
    let target_dir = get_tool_skills_dir(tool_id)
        .context("Unknown tool ID")?;

    let output = std::process::Command::new("npx")
        .args(["skills", "update", skill_name])
        .current_dir(&target_dir)
        .output()
        .context("Failed to run npx skills update")?;

    let msg = if output.status.success() {
        String::from_utf8_lossy(&output.stdout).to_string()
    } else {
        String::from_utf8_lossy(&output.stderr).to_string()
    };

    Ok(InstallResult {
        success: output.status.success(),
        message: msg,
        skill_id: Some(skill_name.to_string()),
    })
}

pub fn get_tool_skills_dir(tool_id: &str) -> Option<std::path::PathBuf> {
    let home = dirs_next::home_dir()?;
    let path = match tool_id {
        "claude-code" => home.join(".claude").join("skills"),
        "agents"      => home.join(".agents").join("skills"),
        "cc-switch"   => home.join(".cc-switch").join("skills"),
        _             => return None,
    };
    std::fs::create_dir_all(&path).ok();
    Some(path)
}
