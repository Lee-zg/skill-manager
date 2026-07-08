pub mod categories;
pub mod metadata;
pub mod workspaces;
pub mod repositories;

use anyhow::{Context, Result};
use rusqlite::{params, Connection};
use std::path::PathBuf;

use crate::adapters::SkillMeta;

pub fn db_path() -> PathBuf {
    let config_dir = dirs_next::config_dir()
        .unwrap_or_else(|| PathBuf::from("."));
    config_dir.join("skillhub").join("skillhub.db")
}

pub fn open() -> Result<Connection> {
    let path = db_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(&path)
        .with_context(|| format!("Failed to open DB at {:?}", path))?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    run_migrations(&conn)?;
    Ok(conn)
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

    Ok(())
}

// ── Skills ──────────────────────────────────────────────────────────────────

pub fn upsert_skill(conn: &Connection, s: &SkillMeta) -> Result<()> {
    conn.execute(
        "INSERT INTO skills
           (id, name, original_name, description, version, install_path, tool_id, enabled,
            installed_at, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,
                 strftime('%s','now'), strftime('%s','now'), strftime('%s','now'))
         ON CONFLICT(id) DO UPDATE SET
           name         = excluded.name,
           description  = excluded.description,
           install_path = excluded.install_path,
           enabled      = excluded.enabled,
           updated_at   = strftime('%s','now')",
        params![
            s.id, s.name, s.original_name, s.description,
            s.version, s.install_path, s.tool_id, s.enabled as i64
        ],
    )?;
    Ok(())
}

pub fn list_skills(conn: &Connection) -> Result<Vec<SkillRow>> {
    let mut stmt = conn.prepare(
        "SELECT s.id, s.name, s.original_name, s.description, s.version,
                s.install_path, s.tool_id, s.enabled,
                s.installed_at, s.last_used_at, s.usage_count,
                GROUP_CONCAT(DISTINCT st.tag)      AS tags,
                GROUP_CONCAT(DISTINCT c.name)      AS categories,
                sn.content                         AS note
         FROM skills s
         LEFT JOIN skill_tags st       ON st.skill_id = s.id
         LEFT JOIN skill_categories sc ON sc.skill_id = s.id
         LEFT JOIN categories c        ON c.id = sc.category_id
         LEFT JOIN skill_notes sn      ON sn.skill_id = s.id
         GROUP BY s.id
         ORDER BY s.name COLLATE NOCASE",
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(SkillRow {
            id:            row.get(0)?,
            name:          row.get(1)?,
            original_name: row.get(2)?,
            description:   row.get(3)?,
            version:       row.get(4)?,
            install_path:  row.get(5)?,
            tool_id:       row.get(6)?,
            enabled:       row.get::<_, i64>(7)? != 0,
            installed_at:  row.get(8)?,
            last_used_at:  row.get(9)?,
            usage_count:   row.get(10)?,
            tags:          row.get::<_, Option<String>>(11)?
                              .map(|s| s.split(',').map(String::from).collect())
                              .unwrap_or_default(),
            categories:    row.get::<_, Option<String>>(12)?
                              .map(|s| s.split(',').map(String::from).collect())
                              .unwrap_or_default(),
            note:          row.get(13)?,
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
    let fts_query = format!("{}*", query);
    let mut stmt = conn.prepare(
        "SELECT s.id, s.name, s.original_name, s.description, s.version,
                s.install_path, s.tool_id, s.enabled,
                s.installed_at, s.last_used_at, s.usage_count,
                GROUP_CONCAT(DISTINCT st.tag) AS tags,
                GROUP_CONCAT(DISTINCT c.name) AS categories,
                sn.content AS note
         FROM skills_fts sf
         JOIN skills s         ON s.rowid = sf.rowid
         LEFT JOIN skill_tags st       ON st.skill_id = s.id
         LEFT JOIN skill_categories sc ON sc.skill_id = s.id
         LEFT JOIN categories c        ON c.id = sc.category_id
         LEFT JOIN skill_notes sn      ON sn.skill_id = s.id
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
            version:       row.get(4)?,
            install_path:  row.get(5)?,
            tool_id:       row.get(6)?,
            enabled:       row.get::<_, i64>(7)? != 0,
            installed_at:  row.get(8)?,
            last_used_at:  row.get(9)?,
            usage_count:   row.get(10)?,
            tags:          row.get::<_, Option<String>>(11)?
                              .map(|s| s.split(',').map(String::from).collect())
                              .unwrap_or_default(),
            categories:    row.get::<_, Option<String>>(12)?
                              .map(|s| s.split(',').map(String::from).collect())
                              .unwrap_or_default(),
            note:          row.get(13)?,
        })
    })?
    .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(rows)
}

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct SkillRow {
    pub id:            String,
    pub name:          String,
    pub original_name: String,
    pub description:   Option<String>,
    pub version:       Option<String>,
    pub install_path:  String,
    pub tool_id:       String,
    pub enabled:       bool,
    pub installed_at:  Option<i64>,
    pub last_used_at:  Option<i64>,
    pub usage_count:   i64,
    pub tags:          Vec<String>,
    pub categories:    Vec<String>,
    pub note:          Option<String>,
}
