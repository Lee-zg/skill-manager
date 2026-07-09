use anyhow::Result;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillInvocation {
    pub id: String,
    pub skill_id: String,
    pub tool_id: String,
    pub display_name: String,
    pub command_name: String,
    pub slug: String,
    pub category_ids: Vec<String>,
    pub workspace_id: Option<String>,
    pub target_type: String,
    pub target_id: String,
    pub scope: String,
    pub export_mode: String,
    pub exported_path: String,
    pub prompt_path: Option<String>,
    pub status: String,
    pub last_exported_at: Option<i64>,
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct InvocationRecordInput {
    pub id: String,
    pub skill_id: String,
    pub tool_id: String,
    pub display_name: String,
    pub command_name: String,
    pub slug: String,
    pub category_ids: Vec<String>,
    pub workspace_id: Option<String>,
    pub target_type: String,
    pub target_id: String,
    pub scope: String,
    pub export_mode: String,
    pub exported_path: String,
    pub prompt_path: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvocationExport {
    pub id: String,
    pub route_id: String,
    pub tool_id: String,
    pub scope: String,
    pub export_mode: String,
    pub expected_invocation: String,
    pub actual_invocation: String,
    pub fallback_invocation: Option<String>,
    pub exported_path: Option<String>,
    pub prompt_path: Option<String>,
    pub status: String,
    pub conflict: Option<String>,
    pub last_exported_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvocationRoute {
    pub id: String,
    pub canonical_path: String,
    pub display_path: String,
    pub route_type: String,
    pub workspace_id: Option<String>,
    pub skill_id: Option<String>,
    pub alias: Option<String>,
    pub tool_id: String,
    pub scope: String,
    pub slug: String,
    pub status: String,
    pub conflict: Option<String>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
    pub exports: Vec<InvocationExport>,
}

#[derive(Debug, Clone)]
pub struct InvocationRouteInput {
    pub id: String,
    pub canonical_path: String,
    pub display_path: String,
    pub route_type: String,
    pub workspace_id: Option<String>,
    pub skill_id: Option<String>,
    pub alias: Option<String>,
    pub tool_id: String,
    pub scope: String,
    pub slug: String,
    pub status: String,
    pub conflict: Option<String>,
}

#[derive(Debug, Clone)]
pub struct InvocationExportInput {
    pub id: String,
    pub route_id: String,
    pub tool_id: String,
    pub scope: String,
    pub export_mode: String,
    pub expected_invocation: String,
    pub actual_invocation: String,
    pub fallback_invocation: Option<String>,
    pub exported_path: Option<String>,
    pub prompt_path: Option<String>,
    pub status: String,
    pub conflict: Option<String>,
}

pub fn list_invocations(
    conn: &Connection,
    tool_id: Option<&str>,
    workspace_id: Option<&str>,
    category_id: Option<&str>,
) -> Result<Vec<SkillInvocation>> {
    let mut sql = String::from(
        "SELECT id, skill_id, tool_id, display_name, command_name, slug,
                category_ids, workspace_id, target_type, target_id, scope,
                export_mode, exported_path, prompt_path, status, last_exported_at
           FROM skill_invocations WHERE 1=1",
    );
    if let Some(tool_id) = tool_id {
        sql.push_str(&format!(" AND tool_id='{}'", escape_sql_literal(tool_id)));
    }
    if let Some(workspace_id) = workspace_id {
        sql.push_str(&format!(" AND workspace_id='{}'", escape_sql_literal(workspace_id)));
    }
    if let Some(category_id) = category_id {
        sql.push_str(&format!(" AND category_ids LIKE '%{}%'", escape_sql_literal(category_id)));
    }
    sql.push_str(" ORDER BY tool_id, display_name COLLATE NOCASE");

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt
        .query_map([], invocation_from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn list_invocation_routes(
    conn: &Connection,
    tool_id: Option<&str>,
    workspace_id: Option<&str>,
    skill_id: Option<&str>,
) -> Result<Vec<InvocationRoute>> {
    let mut stmt = conn.prepare(
        "SELECT id, canonical_path, display_path, route_type, workspace_id,
                skill_id, alias, tool_id, scope, slug, status, conflict,
                created_at, updated_at
           FROM invocation_routes
          WHERE (?1 IS NULL OR tool_id = ?1)
            AND (?2 IS NULL OR workspace_id = ?2)
            AND (?3 IS NULL OR skill_id = ?3)
          ORDER BY tool_id, scope, display_path COLLATE NOCASE",
    )?;
    let mut routes = stmt
        .query_map(params![tool_id, workspace_id, skill_id], route_from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    // 路由和导出结果分表存储，读取时补齐导出列表，前端可以直接展示真实入口。
    for route in &mut routes {
        route.exports = list_invocation_exports(conn, &route.id)?;
    }
    Ok(routes)
}

pub fn get_invocation_route(conn: &Connection, id: &str) -> Result<Option<InvocationRoute>> {
    let mut route = conn
        .query_row(
            "SELECT id, canonical_path, display_path, route_type, workspace_id,
                    skill_id, alias, tool_id, scope, slug, status, conflict,
                    created_at, updated_at
               FROM invocation_routes WHERE id=?1",
            params![id],
            route_from_row,
        )
        .optional()?;

    if let Some(route) = &mut route {
        route.exports = list_invocation_exports(conn, &route.id)?;
    }
    Ok(route)
}

pub fn find_invocation_route_by_paths(
    conn: &Connection,
    input_path: &str,
    tool_id: &str,
    scope: &str,
) -> Result<Option<InvocationRoute>> {
    let mut route = conn
        .query_row(
            "SELECT id, canonical_path, display_path, route_type, workspace_id,
                    skill_id, alias, tool_id, scope, slug, status, conflict,
                    created_at, updated_at
               FROM invocation_routes
              WHERE tool_id=?1
                AND scope=?2
                AND (canonical_path=?3 OR display_path=?3 OR alias=?4)
              LIMIT 1",
            params![tool_id, scope, input_path, input_path.trim_start_matches('/')],
            route_from_row,
        )
        .optional()?;

    if let Some(route) = &mut route {
        route.exports = list_invocation_exports(conn, &route.id)?;
    }
    Ok(route)
}

pub fn upsert_invocation_route(conn: &Connection, input: &InvocationRouteInput) -> Result<()> {
    conn.execute(
        "INSERT INTO invocation_routes
           (id, canonical_path, display_path, route_type, workspace_id, skill_id,
            alias, tool_id, scope, slug, status, conflict, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,
                 strftime('%s','now'),strftime('%s','now'))
         ON CONFLICT(id) DO UPDATE SET
           canonical_path=excluded.canonical_path,
           display_path=excluded.display_path,
           route_type=excluded.route_type,
           workspace_id=excluded.workspace_id,
           skill_id=excluded.skill_id,
           alias=excluded.alias,
           tool_id=excluded.tool_id,
           scope=excluded.scope,
           slug=excluded.slug,
           status=excluded.status,
           conflict=excluded.conflict,
           updated_at=strftime('%s','now')",
        params![
            input.id,
            input.canonical_path,
            input.display_path,
            input.route_type,
            input.workspace_id,
            input.skill_id,
            input.alias,
            input.tool_id,
            input.scope,
            input.slug,
            input.status,
            input.conflict,
        ],
    )?;
    Ok(())
}

#[allow(dead_code)]
pub fn update_invocation_route_status(
    conn: &Connection,
    route_id: &str,
    status: &str,
    conflict: Option<&str>,
) -> Result<()> {
    conn.execute(
        "UPDATE invocation_routes
            SET status=?1, conflict=?2, updated_at=strftime('%s','now')
          WHERE id=?3",
        params![status, conflict, route_id],
    )?;
    Ok(())
}

pub fn delete_invocation_route(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM invocation_exports WHERE route_id=?1", params![id])?;
    conn.execute("DELETE FROM invocation_routes WHERE id=?1", params![id])?;
    Ok(())
}

pub fn list_invocation_exports(conn: &Connection, route_id: &str) -> Result<Vec<InvocationExport>> {
    let mut stmt = conn.prepare(
        "SELECT id, route_id, tool_id, scope, export_mode, expected_invocation,
                actual_invocation, fallback_invocation, exported_path, prompt_path,
                status, conflict, last_exported_at
           FROM invocation_exports
          WHERE route_id=?1
          ORDER BY tool_id, export_mode",
    )?;
    let exports = stmt
        .query_map(params![route_id], export_from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(exports)
}

pub fn upsert_invocation_export(conn: &Connection, input: &InvocationExportInput) -> Result<()> {
    conn.execute(
        "INSERT INTO invocation_exports
           (id, route_id, tool_id, scope, export_mode, expected_invocation,
            actual_invocation, fallback_invocation, exported_path, prompt_path,
            status, conflict, last_exported_at, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,
                 CASE WHEN ?11='exported' THEN strftime('%s','now') ELSE NULL END,
                 strftime('%s','now'),strftime('%s','now'))
         ON CONFLICT(route_id, tool_id, scope, export_mode) DO UPDATE SET
           expected_invocation=excluded.expected_invocation,
           actual_invocation=excluded.actual_invocation,
           fallback_invocation=excluded.fallback_invocation,
           exported_path=excluded.exported_path,
           prompt_path=excluded.prompt_path,
           status=excluded.status,
           conflict=excluded.conflict,
           last_exported_at=CASE
             WHEN excluded.status='exported' THEN strftime('%s','now')
             ELSE invocation_exports.last_exported_at
           END,
           updated_at=strftime('%s','now')",
        params![
            input.id,
            input.route_id,
            input.tool_id,
            input.scope,
            input.export_mode,
            input.expected_invocation,
            input.actual_invocation,
            input.fallback_invocation,
            input.exported_path,
            input.prompt_path,
            input.status,
            input.conflict,
        ],
    )?;
    Ok(())
}

pub fn delete_invocation_export(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM invocation_exports WHERE id=?1", params![id])?;
    Ok(())
}

#[allow(dead_code)]
pub fn record_invocation(conn: &Connection, input: &InvocationRecordInput) -> Result<()> {
    let category_ids_json = serde_json::to_string(&input.category_ids)?;
    conn.execute(
        "INSERT INTO skill_invocations
           (id, skill_id, tool_id, display_name, command_name, slug, category_ids,
            workspace_id, target_type, target_id, scope, export_mode, exported_path,
            prompt_path, status, last_exported_at, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,
                 strftime('%s','now'),strftime('%s','now'),strftime('%s','now'))
         ON CONFLICT(id) DO UPDATE SET
           display_name=excluded.display_name,
           command_name=excluded.command_name,
           slug=excluded.slug,
           category_ids=excluded.category_ids,
           workspace_id=excluded.workspace_id,
           target_type=excluded.target_type,
           target_id=excluded.target_id,
           scope=excluded.scope,
           export_mode=excluded.export_mode,
           exported_path=excluded.exported_path,
           prompt_path=excluded.prompt_path,
           status=excluded.status,
           last_exported_at=strftime('%s','now'),
           updated_at=strftime('%s','now')",
        params![
            input.id,
            input.skill_id,
            input.tool_id,
            input.display_name,
            input.command_name,
            input.slug,
            category_ids_json,
            input.workspace_id,
            input.target_type,
            input.target_id,
            input.scope,
            input.export_mode,
            input.exported_path,
            input.prompt_path,
            input.status,
        ],
    )?;
    Ok(())
}

pub fn delete_invocation(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM skill_invocations WHERE id=?1", params![id])?;
    Ok(())
}

pub fn get_invocation(conn: &Connection, id: &str) -> Result<Option<SkillInvocation>> {
    let mut stmt = conn.prepare(
        "SELECT id, skill_id, tool_id, display_name, command_name, slug,
                category_ids, workspace_id, target_type, target_id, scope,
                export_mode, exported_path, prompt_path, status, last_exported_at
           FROM skill_invocations WHERE id=?1",
    )?;
    let mut rows = stmt.query(params![id])?;
    Ok(rows.next()?.map(invocation_from_row).transpose()?)
}

fn route_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<InvocationRoute> {
    Ok(InvocationRoute {
        id: row.get(0)?,
        canonical_path: row.get(1)?,
        display_path: row.get(2)?,
        route_type: row.get(3)?,
        workspace_id: row.get(4)?,
        skill_id: row.get(5)?,
        alias: row.get(6)?,
        tool_id: row.get(7)?,
        scope: row.get(8)?,
        slug: row.get(9)?,
        status: row.get(10)?,
        conflict: row.get(11)?,
        created_at: row.get(12)?,
        updated_at: row.get(13)?,
        exports: vec![],
    })
}

fn export_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<InvocationExport> {
    Ok(InvocationExport {
        id: row.get(0)?,
        route_id: row.get(1)?,
        tool_id: row.get(2)?,
        scope: row.get(3)?,
        export_mode: row.get(4)?,
        expected_invocation: row.get(5)?,
        actual_invocation: row.get(6)?,
        fallback_invocation: row.get(7)?,
        exported_path: row.get(8)?,
        prompt_path: row.get(9)?,
        status: row.get(10)?,
        conflict: row.get(11)?,
        last_exported_at: row.get(12)?,
    })
}

fn invocation_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<SkillInvocation> {
    let raw_category_ids: Option<String> = row.get(6)?;
    Ok(SkillInvocation {
        id: row.get(0)?,
        skill_id: row.get(1)?,
        tool_id: row.get(2)?,
        display_name: row.get(3)?,
        command_name: row.get(4)?,
        slug: row.get(5)?,
        category_ids: raw_category_ids
            .and_then(|value| serde_json::from_str::<Vec<String>>(&value).ok())
            .unwrap_or_default(),
        workspace_id: row.get(7)?,
        target_type: row.get(8)?,
        target_id: row.get(9)?,
        scope: row.get(10)?,
        export_mode: row.get(11)?,
        exported_path: row.get(12)?,
        prompt_path: row.get(13)?,
        status: row.get(14)?,
        last_exported_at: row.get(15)?,
    })
}

fn escape_sql_literal(value: &str) -> String {
    value.replace('\'', "''")
}
