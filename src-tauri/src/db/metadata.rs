use anyhow::Result;
use rusqlite::{params, Connection};
use crate::db::{make_search_initials, rebuild_skill_search_index};

// ── Tags ─────────────────────────────────────────────────────────────────────

pub fn add_tag(conn: &Connection, skill_id: &str, tag: &str) -> Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO skill_tags (skill_id, tag) VALUES (?1, ?2)",
        params![skill_id, tag],
    )?;
    rebuild_skill_search_index(conn, skill_id)?;
    Ok(())
}

pub fn remove_tag(conn: &Connection, skill_id: &str, tag: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM skill_tags WHERE skill_id=?1 AND tag=?2",
        params![skill_id, tag],
    )?;
    rebuild_skill_search_index(conn, skill_id)?;
    Ok(())
}

pub fn list_all_tags(conn: &Connection) -> Result<Vec<(String, i64)>> {
    let mut stmt = conn.prepare(
        "SELECT tag, COUNT(*) as cnt FROM skill_tags GROUP BY tag ORDER BY cnt DESC, tag",
    )?;
    let rows = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

// ── Notes ─────────────────────────────────────────────────────────────────────

pub fn upsert_note(conn: &Connection, skill_id: &str, content: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO skill_notes (skill_id, content, updated_at)
         VALUES (?1, ?2, strftime('%s','now'))
         ON CONFLICT(skill_id) DO UPDATE SET
           content    = excluded.content,
           updated_at = strftime('%s','now')",
        params![skill_id, content],
    )?;
    rebuild_skill_search_index(conn, skill_id)?;
    Ok(())
}

// ── Aliases ───────────────────────────────────────────────────────────────────

pub fn add_alias(conn: &Connection, skill_id: &str, alias: &str) -> Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO skill_aliases (skill_id, alias) VALUES (?1, ?2)",
        params![skill_id, alias],
    )?;
    rebuild_skill_search_index(conn, skill_id)?;
    Ok(())
}

pub fn remove_alias(conn: &Connection, skill_id: &str, alias: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM skill_aliases WHERE skill_id=?1 AND alias=?2",
        params![skill_id, alias],
    )?;
    rebuild_skill_search_index(conn, skill_id)?;
    Ok(())
}

// ── Rename ────────────────────────────────────────────────────────────────────

pub fn rename_skill(conn: &Connection, id: &str, new_name: &str) -> Result<()> {
    let original_name: String = conn.query_row(
        "SELECT original_name FROM skills WHERE id=?1",
        params![id],
        |row| row.get(0),
    )?;
    let search_initials = make_search_initials(&[new_name, &original_name]);
    conn.execute(
        "UPDATE skills SET name=?1, search_initials=?2, updated_at=strftime('%s','now') WHERE id=?3",
        params![new_name, search_initials, id],
    )?;
    rebuild_skill_search_index(conn, id)?;
    Ok(())
}
