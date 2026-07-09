pub mod categories;
pub mod metadata;
pub mod workspaces;
pub mod repositories;
pub mod market;
pub mod invocations;
pub mod canonical;

use anyhow::{Context, Result};
use rusqlite::{params, Connection};
use std::path::{Path, PathBuf};

use crate::{
    adapters::SkillMeta,
    app_meta::{
        CONFIG_DIR_NAME, DB_FILE_NAME, LEGACY_CONFIG_DIR_NAME, LEGACY_DB_FILE_NAME,
    },
};

pub fn db_path() -> PathBuf {
    let config_dir = dirs_next::config_dir()
        .unwrap_or_else(|| PathBuf::from("."));
    config_dir.join(CONFIG_DIR_NAME).join(DB_FILE_NAME)
}

pub fn open() -> Result<Connection> {
    let path = db_path();
    migrate_legacy_db_if_needed(&path)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(&path)
        .with_context(|| format!("Failed to open DB at {:?}", path))?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    run_migrations(&conn)?;
    Ok(conn)
}

fn legacy_db_path() -> Option<PathBuf> {
    dirs_next::config_dir()
        .map(|config_dir| config_dir.join(LEGACY_CONFIG_DIR_NAME).join(LEGACY_DB_FILE_NAME))
}

fn sidecar_path(path: &Path, suffix: &str) -> PathBuf {
    PathBuf::from(format!("{}{}", path.to_string_lossy(), suffix))
}

fn copy_if_exists(source: &Path, target: &Path) -> Result<()> {
    if !source.exists() || target.exists() {
        return Ok(());
    }
    std::fs::copy(source, target)
        .with_context(|| format!("Failed to migrate DB file from {:?} to {:?}", source, target))?;
    Ok(())
}

fn migrate_legacy_db_if_needed(target_path: &Path) -> Result<()> {
    if target_path.exists() {
        return Ok(());
    }

    let Some(legacy_path) = legacy_db_path() else {
        return Ok(());
    };
    if !legacy_path.exists() {
        return Ok(());
    }

    if let Some(parent) = target_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    // 仅复制旧品牌数据，不删除旧文件，避免品牌迁移造成用户数据损失。
    copy_if_exists(&legacy_path, target_path)?;
    copy_if_exists(&sidecar_path(&legacy_path, "-wal"), &sidecar_path(target_path, "-wal"))?;
    copy_if_exists(&sidecar_path(&legacy_path, "-shm"), &sidecar_path(target_path, "-shm"))?;
    Ok(())
}

fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY);
    ")?;

    let version: i64 = conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM _migrations",
        [],
        |row| row.get(0),
    )?;

    if version < 1 {
        let sql = include_str!("../../migrations/001_initial.sql");
        conn.execute_batch(sql)?;
        conn.execute("INSERT INTO _migrations VALUES (1)", [])?;
    }

    if version < 2 {
        let sql = include_str!("../../migrations/002_search_index.sql");
        conn.execute_batch(sql)?;
        conn.execute("INSERT INTO _migrations VALUES (2)", [])?;
    }

    if version < 3 {
        let sql = include_str!("../../migrations/003_market_invocations.sql");
        conn.execute_batch(sql)?;
        conn.execute("INSERT INTO _migrations VALUES (3)", [])?;
    }

    if version < 4 {
        let sql = include_str!("../../migrations/004_invocation_routes.sql");
        conn.execute_batch(sql)?;
        conn.execute("INSERT INTO _migrations VALUES (4)", [])?;
    }

    if version < 5 {
        let sql = include_str!("../../migrations/005_canonical_store.sql");
        conn.execute_batch(sql)?;
        conn.execute("INSERT INTO _migrations VALUES (5)", [])?;
    }

    Ok(())
}

// ── Skills ──────────────────────────────────────────────────────────────────

pub fn upsert_skill(conn: &Connection, s: &SkillMeta) -> Result<()> {
    let search_initials = make_search_initials(&[&s.name, &s.original_name]);
    conn.execute(
        "INSERT INTO skills
           (id, name, original_name, description, source, version, install_path, tool_id, enabled,
            search_initials,
            installed_at, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,
                 strftime('%s','now'), strftime('%s','now'), strftime('%s','now'))
         ON CONFLICT(id) DO UPDATE SET
           name         = excluded.name,
           description  = excluded.description,
           source       = excluded.source,
           version      = excluded.version,
           install_path = excluded.install_path,
           enabled      = excluded.enabled,
           search_initials = excluded.search_initials,
           updated_at   = strftime('%s','now')",
        params![
            s.id, s.name, s.original_name, s.description,
            s.source, s.version, s.install_path, s.tool_id, s.enabled as i64,
            search_initials
        ],
    )?;
    rebuild_skill_search_index(conn, &s.id)?;
    Ok(())
}

pub fn list_skills(conn: &Connection) -> Result<Vec<SkillRow>> {
    let mut stmt = conn.prepare(
        "SELECT s.id, s.name, s.original_name, s.description, s.source, s.version,
                s.install_path, s.tool_id, s.enabled,
                s.installed_at, s.last_used_at, s.usage_count,
                GROUP_CONCAT(DISTINCT st.tag)      AS tags,
                GROUP_CONCAT(DISTINCT c.name)      AS categories,
                GROUP_CONCAT(DISTINCT c.id)        AS category_ids,
                sn.content                         AS note,
                GROUP_CONCAT(DISTINCT sa.alias)    AS aliases
         FROM skills s
         LEFT JOIN skill_tags st       ON st.skill_id = s.id
         LEFT JOIN skill_categories sc ON sc.skill_id = s.id
         LEFT JOIN categories c        ON c.id = sc.category_id
         LEFT JOIN skill_notes sn      ON sn.skill_id = s.id
         LEFT JOIN skill_aliases sa    ON sa.skill_id = s.id
         GROUP BY s.id
         ORDER BY s.name COLLATE NOCASE",
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(SkillRow {
            id:            row.get(0)?,
            name:          row.get(1)?,
            original_name: row.get(2)?,
            description:   row.get(3)?,
            source:        row.get(4)?,
            version:       row.get(5)?,
            install_path:  row.get(6)?,
            tool_id:       row.get(7)?,
            enabled:       row.get::<_, i64>(8)? != 0,
            installed_at:  row.get(9)?,
            last_used_at:  row.get(10)?,
            usage_count:   row.get(11)?,
            tags:          split_list(row.get(12)?),
            categories:    split_list(row.get(13)?),
            category_ids:  split_list(row.get(14)?),
            note:          row.get(15)?,
            aliases:       split_list(row.get(16)?),
            highlight:     None,
            update_available: false,
        })
    })?
    .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(rows)
}

pub fn toggle_skill(conn: &Connection, id: &str, enabled: bool) -> Result<()> {
    conn.execute(
        "UPDATE skills SET enabled = ?1, updated_at = strftime('%s','now') WHERE id = ?2",
        params![enabled as i64, id],
    )?;
    Ok(())
}

pub fn delete_skill(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM skills WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn search_skills(conn: &Connection, query: &str) -> Result<Vec<SkillRow>> {
    let Some(fts_query) = make_fts_query(query) else {
        return list_skills(conn);
    };
    let mut stmt = conn.prepare(
        "SELECT s.id, s.name, s.original_name, s.description, s.source, s.version,
                s.install_path, s.tool_id, s.enabled,
                s.installed_at, s.last_used_at, s.usage_count,
                GROUP_CONCAT(DISTINCT st.tag) AS tags,
                GROUP_CONCAT(DISTINCT c.name) AS categories,
                GROUP_CONCAT(DISTINCT c.id) AS category_ids,
                sn.content AS note,
                GROUP_CONCAT(DISTINCT sa.alias) AS aliases,
                snippet(skills_fts, -1, '<mark>', '</mark>', '…', 12) AS highlight
         FROM skills_fts sf
         JOIN skills s         ON s.id = sf.skill_id
         LEFT JOIN skill_tags st       ON st.skill_id = s.id
         LEFT JOIN skill_categories sc ON sc.skill_id = s.id
         LEFT JOIN categories c        ON c.id = sc.category_id
         LEFT JOIN skill_notes sn      ON sn.skill_id = s.id
         LEFT JOIN skill_aliases sa    ON sa.skill_id = s.id
         WHERE skills_fts MATCH ?1
         GROUP BY s.id
         ORDER BY rank",
    )?;

    let rows = stmt.query_map(params![fts_query], |row| {
        Ok(SkillRow {
            id:            row.get(0)?,
            name:          row.get(1)?,
            original_name: row.get(2)?,
            description:   row.get(3)?,
            source:        row.get(4)?,
            version:       row.get(5)?,
            install_path:  row.get(6)?,
            tool_id:       row.get(7)?,
            enabled:       row.get::<_, i64>(8)? != 0,
            installed_at:  row.get(9)?,
            last_used_at:  row.get(10)?,
            usage_count:   row.get(11)?,
            tags:          split_list(row.get(12)?),
            categories:    split_list(row.get(13)?),
            category_ids:  split_list(row.get(14)?),
            note:          row.get(15)?,
            aliases:       split_list(row.get(16)?),
            highlight:     row.get(17)?,
            update_available: false,
        })
    })?
    .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(rows)
}

pub fn find_skill_id_by_install_path(conn: &Connection, tool_id: &str, install_path: &str) -> Result<Option<String>> {
    let mut stmt = conn.prepare("SELECT id FROM skills WHERE tool_id=?1 AND install_path=?2 LIMIT 1")?;
    let mut rows = stmt.query(params![tool_id, install_path])?;
    Ok(rows.next()?.map(|row| row.get(0)).transpose()?)
}

pub fn rebuild_skill_search_index(conn: &Connection, skill_id: &str) -> Result<()> {
    conn.execute("DELETE FROM skills_fts WHERE skill_id=?1", params![skill_id])?;
    conn.execute(
        "INSERT INTO skills_fts (skill_id, name, description, tags, note, aliases, initials)
         SELECT
           s.id,
           s.name,
           COALESCE(s.description, ''),
           COALESCE((SELECT GROUP_CONCAT(tag, ' ') FROM skill_tags WHERE skill_id = s.id), ''),
           COALESCE((SELECT content FROM skill_notes WHERE skill_id = s.id), ''),
           COALESCE((SELECT GROUP_CONCAT(alias, ' ') FROM skill_aliases WHERE skill_id = s.id), ''),
           COALESCE(s.search_initials, '')
         FROM skills s
         WHERE s.id=?1",
        params![skill_id],
    )?;
    Ok(())
}

fn split_list(raw: Option<String>) -> Vec<String> {
    raw.map(|value| {
        value
            .split(',')
            .map(str::trim)
            .filter(|item| !item.is_empty())
            .map(String::from)
            .collect()
    })
    .unwrap_or_default()
}

fn make_fts_query(query: &str) -> Option<String> {
    let tokens: Vec<String> = query
        .split_whitespace()
        .map(|token| {
            token
                .chars()
                .filter(|ch| ch.is_alphanumeric() || *ch == '_' || *ch == '-')
                .collect::<String>()
                .to_lowercase()
        })
        .filter(|token| !token.is_empty())
        .map(|token| format!("{}*", token))
        .collect();

    if tokens.is_empty() { None } else { Some(tokens.join(" ")) }
}

pub(crate) fn make_search_initials(parts: &[&str]) -> String {
    parts
        .iter()
        .flat_map(|part| {
            part.split(|ch: char| ch.is_whitespace() || ch == '-' || ch == '_' || ch == '/')
                .filter_map(|word| word.chars().next())
                .map(|ch| ch.to_ascii_lowercase())
        })
        .collect()
}

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct SkillRow {
    pub id:            String,
    pub name:          String,
    pub original_name: String,
    pub description:   Option<String>,
    pub source:        Option<String>,
    pub version:       Option<String>,
    pub install_path:  String,
    pub tool_id:       String,
    pub enabled:       bool,
    pub installed_at:  Option<i64>,
    pub last_used_at:  Option<i64>,
    pub usage_count:   i64,
    pub tags:          Vec<String>,
    pub categories:    Vec<String>,
    pub category_ids:  Vec<String>,
    pub note:          Option<String>,
    pub aliases:       Vec<String>,
    pub highlight:     Option<String>,
    pub update_available: bool,
}
