use anyhow::Result;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub color: String,
    pub icon: String,
    pub sort_order: i64,
    pub is_system: bool,
    pub skill_count: i64,
}

pub fn list_categories(conn: &Connection) -> Result<Vec<Category>> {
    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.parent_id, c.color, c.icon, c.sort_order, c.is_system,
                COUNT(sc.skill_id) AS skill_count
         FROM categories c
         LEFT JOIN skill_categories sc ON sc.category_id = c.id
         GROUP BY c.id
         ORDER BY c.sort_order, c.name COLLATE NOCASE",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Category {
            id:         row.get(0)?,
            name:       row.get(1)?,
            parent_id:  row.get(2)?,
            color:      row.get(3)?,
            icon:       row.get(4)?,
            sort_order: row.get(5)?,
            is_system:  row.get::<_, i64>(6)? != 0,
            skill_count: row.get(7)?,
        })
    })?.collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn create_category(conn: &Connection, name: &str, color: &str, icon: &str, parent_id: Option<&str>) -> Result<Category> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO categories (id, name, color, icon, parent_id, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5,
           (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories))",
        params![id, name, color, icon, parent_id],
    )?;
    Ok(Category { id, name: name.to_string(), parent_id: parent_id.map(String::from),
        color: color.to_string(), icon: icon.to_string(), sort_order: 0, is_system: false, skill_count: 0 })
}

pub fn update_category(conn: &Connection, id: &str, name: &str, color: &str, icon: &str) -> Result<()> {
    conn.execute(
        "UPDATE categories SET name=?1, color=?2, icon=?3 WHERE id=?4 AND is_system=0",
        params![name, color, icon, id],
    )?;
    Ok(())
}

pub fn delete_category(conn: &Connection, id: &str) -> Result<()> {
    // Move skills to uncategorized before deleting
    conn.execute("DELETE FROM skill_categories WHERE category_id=?1", params![id])?;
    conn.execute("DELETE FROM categories WHERE id=?1 AND is_system=0", params![id])?;
    Ok(())
}

pub fn set_skill_category(conn: &Connection, skill_id: &str, category_id: &str) -> Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO skill_categories (skill_id, category_id) VALUES (?1, ?2)",
        params![skill_id, category_id],
    )?;
    Ok(())
}

pub fn remove_skill_category(conn: &Connection, skill_id: &str, category_id: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM skill_categories WHERE skill_id=?1 AND category_id=?2",
        params![skill_id, category_id],
    )?;
    Ok(())
}
