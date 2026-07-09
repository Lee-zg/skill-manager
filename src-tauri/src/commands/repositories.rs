use tauri::State;
use serde::{Deserialize, Serialize};
use std::{collections::HashSet, fs, path::{Path, PathBuf}, process::Command};
use crate::{
    app_meta::CONFIG_DIR_NAME,
    commands::skills::DbState,
    core::install::{install_from_source, InstallRequest, InstallTargetRequest},
    db::repositories::{
        add_repository, delete_repository, list_repositories,
        mark_synced, toggle_repository, Repository,
    },
    db::{
        self,
        categories::set_skill_category,
        market::{
            get_market_skill, record_repository_sync_run, remove_market_skills_not_in,
            search_market_skills, stable_market_skill_id, upsert_market_skill,
            MarketSearchFilter, MarketSkillInput, MarketSkillRow,
        },
        workspaces::add_skill_to_workspace,
    },
    installer::{
        install_skill_via_npx, search_registry, update_skill_via_npx, InstallResult, RemoteSkill,
    },
    utils::skill_parser::parse_skill_md,
};

// ── Repository CRUD ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_repositories_cmd(state: State<'_, DbState>) -> Result<Vec<Repository>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    list_repositories(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_repository_cmd(
    name: String, url: String, repo_type: String,
    branch: String, skills_dir: String, priority: i64,
    state: State<'_, DbState>,
) -> Result<Repository, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    add_repository(&conn, &name, &url, &repo_type, &branch, &skills_dir, priority)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_repository_cmd(
    id: String, enabled: bool, state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    toggle_repository(&conn, &id, enabled).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_repository_cmd(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    delete_repository(&conn, &id).map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncResult {
    pub repository_id: String,
    pub scanned_skills: usize,
    pub added: usize,
    pub updated: usize,
    pub removed: usize,
    pub errors: Vec<String>,
    pub message: String,
}

#[tauri::command]
pub fn sync_repository_cmd(id: String, state: State<'_, DbState>) -> Result<SyncResult, String> {
    let repository = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let repositories = list_repositories(&conn).map_err(|e| e.to_string())?;
        repositories
            .into_iter()
            .find(|repo| repo.id == id)
            .ok_or_else(|| "Repository not found".to_string())?
    };

    let (market_skills, mut sync_errors) = match repository.repo_type.as_str() {
        "registry" => (vec![], vec!["Registry 仓库按搜索即时获取，当前同步只更新时间。".to_string()]),
        "local" => collect_local_repository_skills(&repository)?,
        "git" => {
            let cache_path = sync_git_repository(&repository)?;
            collect_repository_skill_index(&repository, &cache_path.join(&repository.skills_dir))?
        }
        other => return Err(format!("Unsupported repository type: {}", other)),
    };

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut keep_ids = Vec::with_capacity(market_skills.len());
    let mut added = 0;
    for market_skill in &market_skills {
        keep_ids.push(market_skill.id.clone());
        match upsert_market_skill(&conn, market_skill) {
            Ok(is_added) => {
                if is_added { added += 1; }
            }
            Err(err) => sync_errors.push(format!("{} 写入索引失败：{}", market_skill.name, err)),
        }
    }
    let removed = remove_market_skills_not_in(&conn, &repository.id, &keep_ids)
        .map_err(|e| e.to_string())?;
    let updated = market_skills.len().saturating_sub(added);
    record_repository_sync_run(
        &conn,
        &repository.id,
        market_skills.len(),
        added,
        updated,
        removed,
        &sync_errors,
    ).map_err(|e| e.to_string())?;
    mark_synced(&conn, &repository.id).map_err(|e| e.to_string())?;
    Ok(SyncResult {
        repository_id: repository.id,
        scanned_skills: market_skills.len(),
        added,
        updated,
        removed,
        errors: sync_errors,
        message: "同步完成".to_string(),
    })
}

fn repository_cache_dir(repository_id: &str) -> Result<PathBuf, String> {
    let base_dir = dirs_next::cache_dir()
        .ok_or_else(|| "Could not determine cache directory".to_string())?;
    Ok(base_dir.join(CONFIG_DIR_NAME).join("repositories").join(repository_id))
}

fn sync_git_repository(repository: &Repository) -> Result<PathBuf, String> {
    let cache_path = repository_cache_dir(&repository.id)?;
    if cache_path.exists() {
        let fetch_status = Command::new("git")
            .arg("-C")
            .arg(&cache_path)
            .args(["fetch", "--depth", "1", "origin"])
            .arg(&repository.branch)
            .status()
            .map_err(|e| e.to_string())?;
        if !fetch_status.success() {
            return Err("Git fetch failed".to_string());
        }

        let checkout_status = Command::new("git")
            .arg("-C")
            .arg(&cache_path)
            .args(["checkout", "FETCH_HEAD"])
            .status()
            .map_err(|e| e.to_string())?;
        if !checkout_status.success() {
            return Err("Git checkout failed".to_string());
        }
    } else {
        if let Some(parent) = cache_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let clone_status = Command::new("git")
            .args(["clone", "--depth", "1", "--branch"])
            .arg(&repository.branch)
            .arg(&repository.url)
            .arg(&cache_path)
            .status()
            .map_err(|e| e.to_string())?;
        if !clone_status.success() {
            return Err("Git clone failed".to_string());
        }
    }
    Ok(cache_path)
}

fn collect_local_repository_skills(repository: &Repository) -> Result<(Vec<MarketSkillInput>, Vec<String>), String> {
    collect_repository_skill_index(repository, &PathBuf::from(&repository.url).join(&repository.skills_dir))
}

fn collect_repository_skill_index(
    repository: &Repository,
    skills_path: &Path,
) -> Result<(Vec<MarketSkillInput>, Vec<String>), String> {
    if !skills_path.exists() {
        return Ok((vec![], vec![format!("仓库技能目录不存在：{}", skills_path.display())]));
    }
    let entries = fs::read_dir(skills_path).map_err(|e| e.to_string())?;
    let mut skills = vec![];
    let mut errors = vec![];

    for entry in entries.filter_map(Result::ok) {
        let skill_dir = entry.path();
        if !skill_dir.is_dir() {
            continue;
        }
        let skill_md = skill_dir.join("SKILL.md");
        if !skill_md.exists() {
            continue;
        }

        let original_name = skill_dir
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let meta = match parse_skill_md(&skill_md) {
            Ok(meta) => meta,
            Err(err) => {
                errors.push(format!("{} 解析失败：{}", original_name, err));
                Default::default()
            }
        };
        let name = if meta.name.is_empty() { original_name.clone() } else { meta.name };
        let install_source = skill_dir.to_string_lossy().to_string();
        let id = stable_market_skill_id(&repository.id, &install_source);
        skills.push(MarketSkillInput {
            id,
            repository_id: repository.id.clone(),
            repository_name: repository.name.clone(),
            repo_type: repository.repo_type.clone(),
            name,
            description: if meta.description.is_empty() { None } else { Some(meta.description) },
            author: if meta.author.is_empty() { Some(repository.name.clone()) } else { Some(meta.author) },
            source: if meta.source.is_empty() { Some(install_source.clone()) } else { Some(meta.source) },
            install_source,
            version: if meta.version.is_empty() { None } else { Some(meta.version) },
            tags: meta.tags,
            category_names: meta.categories,
        });
    }

    Ok((skills, errors))
}

// ── Discovery ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn search_registry_cmd(query: String) -> Result<Vec<RemoteSkill>, String> {
    search_registry(&query).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_market_skills_cmd(
    filter: MarketSearchFilter,
    state: State<'_, DbState>,
) -> Result<Vec<MarketSkillRow>, String> {
    let should_query_registry = {
        let repo_filter_allows_registry = filter
            .repo_types
            .as_ref()
            .map(|types| types.is_empty() || types.iter().any(|repo_type| repo_type == "registry"))
            .unwrap_or(true);
        let repository_filter_allows_builtin = filter
            .repository_ids
            .as_ref()
            .map(|ids| ids.is_empty() || ids.iter().any(|id| id == "builtin-skills-sh"))
            .unwrap_or(true);
        repo_filter_allows_registry && repository_filter_allows_builtin
    };

    let query = filter.query.clone().unwrap_or_default();
    let mut rows = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        search_market_skills(&conn, &filter).map_err(|e| e.to_string())?
    };

    if should_query_registry && !query.trim().is_empty() {
        let remote = search_registry(&query).await.map_err(|e| e.to_string())?;
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        for skill in remote {
            rows.push(remote_skill_to_market_row(&conn, skill)?);
        }
    }

    let mut seen = HashSet::new();
    rows.retain(|row| seen.insert(row.id.clone()));
    Ok(rows)
}

fn remote_skill_to_market_row(
    conn: &rusqlite::Connection,
    skill: RemoteSkill,
) -> Result<MarketSkillRow, String> {
    let id = format!(
        "registry-skills-sh-{}",
        safe_slug(if skill.id.is_empty() { &skill.name } else { &skill.id })
    );
    let input = MarketSkillInput {
        id: id.clone(),
        repository_id: "builtin-skills-sh".to_string(),
        repository_name: "skills.sh 官方".to_string(),
        repo_type: "registry".to_string(),
        name: skill.name.clone(),
        description: Some(skill.description.clone()),
        author: Some(skill.author.clone()),
        source: Some(skill.source.clone()),
        install_source: skill.source.clone(),
        version: skill.version.clone(),
        tags: skill.tags.clone(),
        category_names: vec![],
    };
    upsert_market_skill(conn, &input).map_err(|e| e.to_string())?;
    let installed_by_tool = installed_tools_for_name(conn, &skill.name)?;
    Ok(MarketSkillRow {
        id,
        repository_id: "builtin-skills-sh".to_string(),
        repository_name: "skills.sh 官方".to_string(),
        repo_type: "registry".to_string(),
        name: skill.name,
        description: Some(skill.description),
        author: Some(skill.author),
        source: Some(skill.source.clone()),
        install_source: skill.source,
        version: skill.version,
        tags: skill.tags,
        category_names: vec![],
        installed_by_tool,
        highlight: None,
        updated_at: None,
    })
}

fn installed_tools_for_name(conn: &rusqlite::Connection, name: &str) -> Result<Vec<String>, String> {
    let mut stmt = conn
        .prepare("SELECT DISTINCT tool_id FROM skills WHERE lower(name)=lower(?1)")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params![name], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

// ── Installation ──────────────────────────────────────────────────────────────

#[tauri::command]
pub fn install_skill_cmd(
    source: String, tool_id: String,
    state: State<'_, DbState>,
) -> Result<InstallResult, String> {
    if PathBuf::from(&source).join("SKILL.md").exists() {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let result = install_from_source(
            &conn,
            &InstallRequest {
                source,
                targets: vec![InstallTargetRequest { target: tool_id, alias: None }],
                scope: Some("user".to_string()),
                project_path: None,
                category_ids: vec![],
                workspace_id: None,
                trust: Some(false),
            },
        )
        .map_err(|e| e.to_string())?;
        return Ok(InstallResult {
            success: result.success,
            message: result.message,
            skill_id: result.installations.first().map(|row| row.id.clone()).or(result.skill_id),
        });
    }

    let mut result = install_skill_via_npx(&source, &tool_id)
        .map_err(|e| e.to_string())?;

    // After install, rescan to pick up the new skill
    if result.success {
        use crate::{
            adapters::{tools::{AgentsAdapter, CcSwitchAdapter, ClaudeCodeAdapter}, ToolAdapter},
            db::upsert_skill,
        };
        let adapters: Vec<Box<dyn ToolAdapter>> = vec![
            Box::new(ClaudeCodeAdapter),
            Box::new(AgentsAdapter),
            Box::new(CcSwitchAdapter),
        ];
        if let Ok(conn) = state.0.lock() {
            for adapter in &adapters {
                if adapter.id() == tool_id {
                    if let Ok(skills) = adapter.scan() {
                        for skill in skills {
                            if let Err(err) = upsert_skill(&conn, &skill) {
                                result.success = false;
                                result.message = format!("安装已执行，但数据库更新失败：{}", err);
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(result)
}

#[tauri::command]
pub fn install_market_skill_cmd(
    market_skill_id: String,
    tool_id: String,
    category_ids: Vec<String>,
    workspace_id: Option<String>,
    alias: Option<String>,
    state: State<'_, DbState>,
) -> Result<InstallResult, String> {
    let market_skill = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        get_market_skill(&conn, &market_skill_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "市场技能不存在或尚未同步".to_string())?
    };

    if market_skill.repo_type == "registry" {
        let result = install_skill_via_npx(&market_skill.install_source, &tool_id)
            .map_err(|e| e.to_string())?;
        if result.success {
            rescan_tool_after_install(&tool_id, &state)?;
            bind_latest_installed_skill(&market_skill.name, &tool_id, &category_ids, workspace_id.as_deref(), &state)?;
        }
        return Ok(result);
    }

    let source_dir = PathBuf::from(&market_skill.install_source);
    if !source_dir.join("SKILL.md").exists() {
        return Err(format!("市场技能目录无效：{}", source_dir.display()));
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let result = install_from_source(
        &conn,
        &InstallRequest {
            source: source_dir.to_string_lossy().to_string(),
            targets: vec![InstallTargetRequest { target: tool_id, alias }],
            scope: Some("user".to_string()),
            project_path: None,
            category_ids,
            workspace_id,
            trust: Some(false),
        },
    )
    .map_err(|e| e.to_string())?;
    let installed_skill_id = result
        .installations
        .first()
        .map(|row| row.id.clone())
        .or(result.skill_id.clone());

    Ok(InstallResult {
        success: result.success,
        message: result.message,
        skill_id: installed_skill_id,
    })
}

fn rescan_tool_after_install(
    tool_id: &str,
    state: &State<'_, DbState>,
) -> Result<Vec<crate::adapters::SkillMeta>, String> {
    use crate::adapters::{
        tools::{AgentsAdapter, CcSwitchAdapter, ClaudeCodeAdapter},
        ToolAdapter,
    };
    let adapter: Box<dyn ToolAdapter> = match tool_id {
        "claude-code" => Box::new(ClaudeCodeAdapter),
        "agents" => Box::new(AgentsAdapter),
        "cc-switch" => Box::new(CcSwitchAdapter),
        _ => return Err(format!("未知工具：{}", tool_id)),
    };
    let skills = adapter.scan().map_err(|e| e.to_string())?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    for skill in &skills {
        db::upsert_skill(&conn, skill).map_err(|e| e.to_string())?;
    }
    Ok(skills)
}

fn bind_latest_installed_skill(
    skill_name: &str,
    tool_id: &str,
    category_ids: &[String],
    workspace_id: Option<&str>,
    state: &State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let skill_id: Option<String> = conn
        .query_row(
            "SELECT id FROM skills WHERE tool_id=?1 AND lower(name)=lower(?2)
             ORDER BY installed_at DESC, updated_at DESC LIMIT 1",
            rusqlite::params![tool_id, skill_name],
            |row| row.get(0),
        )
        .ok();
    let Some(skill_id) = skill_id else {
        return Ok(());
    };
    for category_id in category_ids {
        set_skill_category(&conn, &skill_id, category_id).map_err(|e| e.to_string())?;
    }
    if let Some(workspace_id) = workspace_id {
        add_skill_to_workspace(&conn, workspace_id, &skill_id).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn safe_slug(value: &str) -> String {
    let mut slug = String::new();
    let mut last_dash = false;
    for ch in value.to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch);
            last_dash = false;
        } else if (ch == '-' || ch == '_' || ch.is_whitespace()) && !last_dash && !slug.is_empty() {
            slug.push('-');
            last_dash = true;
        }
    }
    let slug = slug.trim_matches('-').to_string();
    if slug.is_empty() { "skill".to_string() } else { slug }
}

#[tauri::command]
pub fn update_skill_cmd(
    skill_name: String, tool_id: String,
) -> Result<InstallResult, String> {
    update_skill_via_npx(&skill_name, &tool_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn check_updates_cmd(tool_id: String) -> Result<Vec<String>, String> {
    // Run `npx skills check` and parse output for available updates
    let target_dir = match tool_id.as_str() {
        "claude-code" => dirs_next::home_dir().map(|h| h.join(".claude").join("skills")),
        "agents"      => dirs_next::home_dir().map(|h| h.join(".agents").join("skills")),
        "cc-switch"   => dirs_next::home_dir().map(|h| h.join(".cc-switch").join("skills")),
        _             => return Err(format!("Unknown tool: {}", tool_id)),
    };

    let dir = target_dir.ok_or("Could not determine home directory")?;
    if !dir.exists() { return Ok(vec![]); }

    let output = std::process::Command::new("npx")
        .args(["skills", "check"])
        .current_dir(&dir)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    // Parse lines that mention "update available" pattern
    let updates: Vec<String> = stdout.lines()
        .filter(|l| l.contains("update") || l.contains("→") || l.contains("outdated"))
        .map(String::from)
        .collect();

    Ok(updates)
}
