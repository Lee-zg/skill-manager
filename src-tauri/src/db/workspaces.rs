use anyhow::Result;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub tool_id: Option<String>,
    pub color: String,
    pub icon: String,
    pub is_active: bool,
    pub skill_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceSkill {
    pub workspace_id: String,
    pub skill_id: String,
    pub skill_name: String,
    pub tool_id: String,
    pub install_path: String,
    pub enabled: bool,
    pub note: Option<String>,
}

pub fn list_workspaces(conn: &Connection) -> Result<Vec<Workspace>> {
    let mut stmt = conn.prepare(
        "SELECT w.id, w.name, w.description, w.tool_id, w.color, w.icon, w.is_active,
                COUNT(ws.skill_id) AS skill_count
         FROM workspaces w
         LEFT JOIN workspace_skills ws ON ws.workspace_id = w.id
         GROUP BY w.id
         ORDER BY w.is_active DESC, w.name COLLATE NOCASE",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Workspace {
            id:          row.get(0)?,
            name:        row.get(1)?,
            description: row.get(2)?,
            tool_id:     row.get(3)?,
            color:       row.get(4)?,
            icon:        row.get(5)?,
            is_active:   row.get::<_, i64>(6)? != 0,
            skill_count: row.get(7)?,
        })
    })?.collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn create_workspace(conn: &Connection, name: &str, description: Option<&str>,
    tool_id: Option<&str>, color: &str, icon: &str) -> Result<Workspace> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO workspaces (id, name, description, tool_id, color, icon)
         VALUES (?1,?2,?3,?4,?5,?6)",
        params![id, name, description, tool_id, color, icon],
    )?;
    Ok(Workspace { id, name: name.to_string(), description: description.map(String::from),
        tool_id: tool_id.map(String::from), color: color.to_string(),
        icon: icon.to_string(), is_active: false, skill_count: 0 })
}

pub fn update_workspace(conn: &Connection, id: &str, name: &str,
    description: Option<&str>, color: &str, icon: &str) -> Result<()> {
    conn.execute(
        "UPDATE workspaces SET name=?1, description=?2, color=?3, icon=?4,
         updated_at=strftime('%s','now') WHERE id=?5",
        params![name, description, color, icon, id],
    )?;
    Ok(())
}

pub fn delete_workspace(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM workspaces WHERE id=?1", params![id])?;
    Ok(())
}

pub fn activate_workspace(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("UPDATE workspaces SET is_active=0", [])?;
    conn.execute(
        "UPDATE workspaces SET is_active=1, updated_at=strftime('%s','now') WHERE id=?1",
        params![id],
    )?;
    Ok(())
}

pub fn list_workspace_skills(conn: &Connection, workspace_id: &str) -> Result<Vec<WorkspaceSkill>> {
    let mut stmt = conn.prepare(
        "SELECT ws.workspace_id, ws.skill_id, s.name, s.tool_id, s.install_path,
                ws.enabled, ws.note
         FROM workspace_skills ws
         JOIN skills s ON s.id = ws.skill_id
         WHERE ws.workspace_id = ?1
         ORDER BY ws.sort_order, s.name COLLATE NOCASE",
    )?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        Ok(WorkspaceSkill {
            workspace_id: row.get(0)?,
            skill_id:     row.get(1)?,
            skill_name:   row.get(2)?,
            tool_id:      row.get(3)?,
            install_path: row.get(4)?,
            enabled:      row.get::<_, i64>(5)? != 0,
            note:         row.get(6)?,
        })
    })?.collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn add_skill_to_workspace(conn: &Connection, workspace_id: &str, skill_id: &str) -> Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO workspace_skills (workspace_id, skill_id,
           sort_order) VALUES (?1, ?2,
           (SELECT COALESCE(MAX(sort_order),0)+1 FROM workspace_skills
            WHERE workspace_id=?1))",
        params![workspace_id, skill_id],
    )?;
    Ok(())
}

pub fn remove_skill_from_workspace(conn: &Connection, workspace_id: &str, skill_id: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM workspace_skills WHERE workspace_id=?1 AND skill_id=?2",
        params![workspace_id, skill_id],
    )?;
    Ok(())
}
