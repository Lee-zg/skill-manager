use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TargetInfo {
    pub tool_id: String,
    pub name: String,
    pub user_dir: Option<String>,
    pub project_dir: Option<String>,
    pub supports_symlink: bool,
    pub requires_materialized_alias: bool,
    pub available: bool,
    pub refresh_hint: Option<String>,
}

#[derive(Debug, Clone)]
pub struct TargetDescriptor {
    pub tool_id: &'static str,
    pub name: &'static str,
    pub user_segments: &'static [&'static str],
    pub project_segments: Option<&'static [&'static str]>,
    pub supports_symlink: bool,
    pub requires_materialized_alias: bool,
    pub refresh_hint: Option<&'static str>,
}

#[derive(Debug, Clone)]
pub struct TargetMount {
    pub descriptor: TargetDescriptor,
    pub root: PathBuf,
}

pub fn all_targets() -> Vec<TargetDescriptor> {
    vec![
        TargetDescriptor {
            tool_id: "agents",
            name: "Agents / Codex",
            user_segments: &[".agents", "skills"],
            project_segments: Some(&[".agents", "skills"]),
            supports_symlink: true,
            requires_materialized_alias: false,
            refresh_hint: None,
        },
        TargetDescriptor {
            tool_id: "codex",
            name: "Codex",
            user_segments: &[".agents", "skills"],
            project_segments: Some(&[".agents", "skills"]),
            supports_symlink: true,
            requires_materialized_alias: false,
            refresh_hint: Some("重新打开会话或使用 /skills 搜索刷新"),
        },
        TargetDescriptor {
            tool_id: "claude-code",
            name: "Claude Code",
            user_segments: &[".claude", "skills"],
            project_segments: Some(&[".claude", "skills"]),
            supports_symlink: true,
            requires_materialized_alias: true,
            refresh_hint: Some("Claude Code 支持 live reload，必要时重启会话"),
        },
        TargetDescriptor {
            tool_id: "cursor",
            name: "Cursor",
            user_segments: &[".cursor", "skills"],
            project_segments: Some(&[".cursor", "skills"]),
            supports_symlink: true,
            requires_materialized_alias: true,
            refresh_hint: Some("必要时重启 Cursor 或刷新项目索引"),
        },
        TargetDescriptor {
            tool_id: "gemini",
            name: "Gemini CLI",
            user_segments: &[".gemini", "skills"],
            project_segments: Some(&[".gemini", "skills"]),
            supports_symlink: true,
            requires_materialized_alias: true,
            refresh_hint: Some("在 Gemini CLI 中执行 /skills reload"),
        },
        TargetDescriptor {
            tool_id: "qoder",
            name: "Qoder",
            user_segments: &[".qoder", "skills"],
            project_segments: Some(&[".qoder", "skills"]),
            supports_symlink: true,
            requires_materialized_alias: true,
            refresh_hint: Some("必要时重启 Qoder 会话"),
        },
        TargetDescriptor {
            tool_id: "openclaw",
            name: "OpenClaw",
            user_segments: &[".openclaw", "skills"],
            project_segments: Some(&["skills"]),
            supports_symlink: true,
            requires_materialized_alias: false,
            refresh_hint: Some("确认 OpenClaw symlink allowlist 包含 SkillManager store"),
        },
        TargetDescriptor {
            tool_id: "cc-switch",
            name: "cc-switch",
            user_segments: &[".cc-switch", "skills"],
            project_segments: None,
            supports_symlink: true,
            requires_materialized_alias: true,
            refresh_hint: None,
        },
    ]
}

pub fn list_target_info() -> Vec<TargetInfo> {
    all_targets()
        .into_iter()
        .map(|target| {
            let user_dir = home_dir_from_segments(target.user_segments);
            let project_dir = target
                .project_segments
                .map(|segments| format!("$PROJECT/{}", segments.join("/")));
            TargetInfo {
                tool_id: target.tool_id.to_string(),
                name: target.name.to_string(),
                available: user_dir.as_ref().map(|path| path.exists()).unwrap_or(false),
                user_dir: user_dir.map(|path| path.to_string_lossy().to_string()),
                project_dir,
                supports_symlink: target.supports_symlink,
                requires_materialized_alias: target.requires_materialized_alias,
                refresh_hint: target.refresh_hint.map(String::from),
            }
        })
        .collect()
}

pub fn resolve_target_mount(
    tool_id: &str,
    scope: &str,
    project_path: Option<&str>,
) -> Result<TargetMount> {
    let descriptor = all_targets()
        .into_iter()
        .find(|target| target.tool_id == tool_id)
        .ok_or_else(|| anyhow!("未知目标工具：{}", tool_id))?;

    let root = match scope {
        "user" => home_dir_from_segments(descriptor.user_segments)
            .ok_or_else(|| anyhow!("无法确定用户目录"))?,
        "project" => {
            let project_path = project_path
                .filter(|value| !value.trim().is_empty())
                .ok_or_else(|| anyhow!("项目级安装需要 project_path"))?;
            let Some(segments) = descriptor.project_segments else {
                return Err(anyhow!("{} 不支持项目级安装", descriptor.name));
            };
            join_segments(PathBuf::from(project_path), segments)
        }
        other => return Err(anyhow!("未知安装 scope：{}", other)),
    };

    Ok(TargetMount { descriptor, root })
}

fn home_dir_from_segments(segments: &[&str]) -> Option<PathBuf> {
    dirs_next::home_dir().map(|home| join_segments(home, segments))
}

fn join_segments(mut base: PathBuf, segments: &[&str]) -> PathBuf {
    for segment in segments {
        base = base.join(segment);
    }
    base
}
