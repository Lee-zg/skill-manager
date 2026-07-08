use anyhow::Result;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Repository {
    pub id: String,
    pub name: String,
    pub url: String,
    pub repo_type: String, // "registry" | "git" | "local"
    pub branch: String,
    pub skills_dir: String,
    pub priority: i64,
    pub enabled: bool,
    pub last_sync: Option<i64>,
}

pub fn list_repositories(conn: &Connection) -> Result<Vec<Repository>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, url, type, branch, skills_dir, priority, enabled, last_sync
         FROM repositories ORDER BY priority ASC, name COLLATE NOCASE",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Repository {
            id:         row.get(0)?,
            name:       row.get(1)?,
            url:        row.get(2)?,
            repo_type:  row.get(3)?,
            branch:     row.get(4)?,
            skills_dir: row.get(5)?,
            priority:   row.get(6)?,
            enabled:    row.get::<_, i64>(7)? != 0,
            last_sync:  row.get(8)?,
        })
    })?.collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn add_repository(conn: &Connection, name: &str, url: &str,
    repo_type: &str, branch: &str, skills_dir: &str, priority: i64) -> Result<Repository> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO repositories (id, name, url, type, branch, skills_dir, priority)
         VALUES (?1,?2,?3,?4,?5,?6,?7)",
        params![id, name, url, repo_type, branch, skills_dir, priority],
    )?;
    Ok(Repository { id, name: name.to_string(), url: url.to_string(),
        repo_type: repo_type.to_string(), branch: branch.to_string(),
        skills_dir: skills_dir.to_string(), priority, enabled: true, last_sync: None })
}

pub fn toggle_repository(conn: &Connection, id: &str, enabled: bool) -> Result<()> {
    conn.execute("UPDATE repositories SET enabled=?1 WHERE id=?2",
        params![enabled as i64, id])?;
    Ok(())
}

pub fn delete_repository(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM repositories WHERE id=?1", params![id])?;
    Ok(())
}

pub fn mark_synced(conn: &Connection, id: &str) -> Result<()> {
    conn.execute(
        "UPDATE repositories SET last_sync=strftime('%s','now') WHERE id=?1",
        params![id],
    )?;
    Ok(())
}
