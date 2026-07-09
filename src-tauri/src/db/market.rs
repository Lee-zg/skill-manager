use anyhow::Result;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketSkillInput {
    pub id: String,
    pub repository_id: String,
    pub repository_name: String,
    pub repo_type: String,
    pub name: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub source: Option<String>,
    pub install_source: String,
    pub version: Option<String>,
    pub tags: Vec<String>,
    pub category_names: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketSkillRow {
    pub id: String,
    pub repository_id: String,
    pub repository_name: String,
    pub repo_type: String,
    pub name: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub source: Option<String>,
    pub install_source: String,
    pub version: Option<String>,
    pub tags: Vec<String>,
    pub category_names: Vec<String>,
    pub installed_by_tool: Vec<String>,
    pub highlight: Option<String>,
    pub updated_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketSearchFilter {
    pub query: Option<String>,
    pub repository_ids: Option<Vec<String>>,
    pub repo_types: Option<Vec<String>>,
    pub category: Option<String>,
    pub tool_id: Option<String>,
    pub installed_state: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub fn stable_market_skill_id(repository_id: &str, install_source: &str) -> String {
    let input = format!("{repository_id}:{install_source}");
    let mut hash = 0xcbf29ce484222325u64;
    for byte in input.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("market-{hash:016x}")
}

pub fn upsert_market_skill(conn: &Connection, skill: &MarketSkillInput) -> Result<bool> {
    let existing_updated_at = conn
        .query_row(
            "SELECT updated_at FROM market_skills WHERE id=?1",
            params![skill.id],
            |row| row.get::<_, i64>(0),
        )
        .optional()?;
    let tags_json = serde_json::to_string(&skill.tags)?;
    let categories_json = serde_json::to_string(&skill.category_names)?;

    conn.execute(
        "INSERT INTO market_skills
           (id, repository_id, repository_name, repo_type, name, description, author, source,
            install_source, version, tags, category_names, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,strftime('%s','now'))
         ON CONFLICT(id) DO UPDATE SET
           repository_name=excluded.repository_name,
           repo_type=excluded.repo_type,
           name=excluded.name,
           description=excluded.description,
           author=excluded.author,
           source=excluded.source,
           install_source=excluded.install_source,
           version=excluded.version,
           tags=excluded.tags,
           category_names=excluded.category_names,
           updated_at=strftime('%s','now')",
        params![
            skill.id,
            skill.repository_id,
            skill.repository_name,
            skill.repo_type,
            skill.name,
            skill.description,
            skill.author,
            skill.source,
            skill.install_source,
            skill.version,
            tags_json,
            categories_json,
        ],
    )?;
    rebuild_market_skill_index(conn, &skill.id)?;
    Ok(existing_updated_at.is_none())
}

pub fn remove_market_skills_not_in(
    conn: &Connection,
    repository_id: &str,
    keep_ids: &[String],
) -> Result<usize> {
    let mut stmt = conn.prepare("SELECT id FROM market_skills WHERE repository_id=?1")?;
    let existing = stmt
        .query_map(params![repository_id], |row| row.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    let keep: std::collections::HashSet<&str> = keep_ids.iter().map(String::as_str).collect();
    let mut removed = 0;
    for id in existing {
        if keep.contains(id.as_str()) {
            continue;
        }
        conn.execute("DELETE FROM market_skill_fts WHERE market_skill_id=?1", params![id])?;
        conn.execute("DELETE FROM market_skills WHERE id=?1", params![id])?;
        removed += 1;
    }
    Ok(removed)
}

pub fn record_repository_sync_run(
    conn: &Connection,
    repository_id: &str,
    indexed_skills: usize,
    added: usize,
    updated: usize,
    removed: usize,
    errors: &[String],
) -> Result<()> {
    let errors_json = serde_json::to_string(errors)?;
    conn.execute(
        "INSERT INTO repository_sync_runs
           (repository_id, indexed_skills, added, updated, removed, errors)
         VALUES (?1,?2,?3,?4,?5,?6)",
        params![
            repository_id,
            indexed_skills as i64,
            added as i64,
            updated as i64,
            removed as i64,
            errors_json,
        ],
    )?;
    Ok(())
}

pub fn get_market_skill(conn: &Connection, id: &str) -> Result<Option<MarketSkillRow>> {
    let mut rows = query_market_skills(conn, "WHERE ms.id=?1", params![id])?;
    Ok(rows.pop())
}

pub fn search_market_skills(
    conn: &Connection,
    filter: &MarketSearchFilter,
) -> Result<Vec<MarketSkillRow>> {
    let limit = filter.limit.unwrap_or(80).clamp(1, 200);
    let offset = filter.offset.unwrap_or(0).max(0);
    let query = filter.query.as_deref().unwrap_or("").trim();

    if query.is_empty() {
        let sql = format!(
            "{} ORDER BY ms.updated_at DESC, ms.name COLLATE NOCASE LIMIT {} OFFSET {}",
            build_market_where(filter, false),
            limit,
            offset,
        );
        return query_market_skills_sql(conn, &sql);
    }

    let Some(fts_query) = make_fts_query(query) else {
        return Ok(vec![]);
    };
    let sql = format!(
        "{} AND market_skill_fts MATCH ?1
         ORDER BY rank LIMIT {} OFFSET {}",
        build_market_where(filter, true),
        limit,
        offset,
    );
    query_market_skills_with_fts(conn, &sql, &fts_query)
}

fn build_market_where(filter: &MarketSearchFilter, with_fts: bool) -> String {
    let mut clauses = vec!["1=1".to_string()];

    if let Some(repo_ids) = &filter.repository_ids {
        if !repo_ids.is_empty() {
            let values = quoted_list(repo_ids);
            clauses.push(format!("ms.repository_id IN ({values})"));
        }
    }
    if let Some(repo_types) = &filter.repo_types {
        if !repo_types.is_empty() {
            let values = quoted_list(repo_types);
            clauses.push(format!("ms.repo_type IN ({values})"));
        }
    }
    if let Some(category) = filter.category.as_deref().filter(|value| !value.is_empty()) {
        clauses.push(format!("ms.category_names LIKE '%{}%'", escape_sql_like(category)));
    }
    if let Some(tool_id) = filter.tool_id.as_deref().filter(|value| !value.is_empty()) {
        let installed_clause = format!(
            "(EXISTS (
                SELECT 1
                  FROM installations i
                  JOIN canonical_skills cs ON cs.id = i.skill_id
                 WHERE i.target='{}'
                   AND i.status IN ('installed','disabled')
                   AND (lower(cs.canonical_name)=lower(ms.name)
                        OR lower(COALESCE(cs.display_name,''))=lower(ms.name))
              )
              OR EXISTS (
                SELECT 1 FROM skills s
                 WHERE s.tool_id='{}' AND lower(s.name)=lower(ms.name)
              ))",
            escape_sql_literal(tool_id),
            escape_sql_literal(tool_id),
        );
        match filter.installed_state.as_deref() {
            Some("installed") => clauses.push(installed_clause),
            Some("not-installed") => clauses.push(format!("NOT {installed_clause}")),
            _ => {}
        }
    }

    let join = if with_fts {
        "FROM market_skill_fts mf JOIN market_skills ms ON ms.id = mf.market_skill_id"
    } else {
        "FROM market_skills ms"
    };
    format!(
        "SELECT ms.id, ms.repository_id, ms.repository_name, ms.repo_type, ms.name,
                ms.description, ms.author, ms.source, ms.install_source, ms.version,
                ms.tags, ms.category_names, ms.updated_at,
                (SELECT GROUP_CONCAT(DISTINCT installed.tool_id)
                   FROM (
                     SELECT i.target AS tool_id
                       FROM installations i
                       JOIN canonical_skills cs ON cs.id = i.skill_id
                      WHERE i.status IN ('installed','disabled')
                        AND (lower(cs.canonical_name)=lower(ms.name)
                             OR lower(COALESCE(cs.display_name,''))=lower(ms.name))
                     UNION
                     SELECT s.tool_id AS tool_id
                       FROM skills s
                      WHERE lower(s.name)=lower(ms.name)
                   ) installed) AS installed_tools
                {}
         {join}
         WHERE {}",
        if with_fts {
            ", snippet(market_skill_fts, -1, '<mark>', '</mark>', '…', 12) AS highlight"
        } else {
            ", NULL AS highlight"
        },
        clauses.join(" AND "),
    )
}

fn query_market_skills<P: rusqlite::Params>(
    conn: &Connection,
    sql_tail: &str,
    params: P,
) -> Result<Vec<MarketSkillRow>> {
    let sql = format!(
        "SELECT ms.id, ms.repository_id, ms.repository_name, ms.repo_type, ms.name,
                ms.description, ms.author, ms.source, ms.install_source, ms.version,
                ms.tags, ms.category_names, ms.updated_at,
                (SELECT GROUP_CONCAT(DISTINCT installed.tool_id)
                   FROM (
                     SELECT i.target AS tool_id
                       FROM installations i
                       JOIN canonical_skills cs ON cs.id = i.skill_id
                      WHERE i.status IN ('installed','disabled')
                        AND (lower(cs.canonical_name)=lower(ms.name)
                             OR lower(COALESCE(cs.display_name,''))=lower(ms.name))
                     UNION
                     SELECT s.tool_id AS tool_id
                       FROM skills s
                      WHERE lower(s.name)=lower(ms.name)
                   ) installed) AS installed_tools,
                NULL AS highlight
         FROM market_skills ms {sql_tail}"
    );
    let mut stmt = conn.prepare(&sql)?;
    rows_from_stmt(&mut stmt, params)
}

fn query_market_skills_with_fts(
    conn: &Connection,
    sql: &str,
    fts_query: &str,
) -> Result<Vec<MarketSkillRow>> {
    let mut stmt = conn.prepare(sql)?;
    rows_from_stmt(&mut stmt, params![fts_query])
}

fn query_market_skills_sql(conn: &Connection, sql: &str) -> Result<Vec<MarketSkillRow>> {
    let mut stmt = conn.prepare(sql)?;
    rows_from_stmt(&mut stmt, [])
}

fn rows_from_stmt<P: rusqlite::Params>(
    stmt: &mut rusqlite::Statement<'_>,
    params: P,
) -> Result<Vec<MarketSkillRow>> {
    let rows = stmt
        .query_map(params, |row| {
            let tags_json: Option<String> = row.get(10)?;
            let categories_json: Option<String> = row.get(11)?;
            let installed_tools: Option<String> = row.get(13)?;
            Ok(MarketSkillRow {
                id: row.get(0)?,
                repository_id: row.get(1)?,
                repository_name: row.get(2)?,
                repo_type: row.get(3)?,
                name: row.get(4)?,
                description: row.get(5)?,
                author: row.get(6)?,
                source: row.get(7)?,
                install_source: row.get(8)?,
                version: row.get(9)?,
                tags: parse_json_list(tags_json),
                category_names: parse_json_list(categories_json),
                updated_at: row.get(12)?,
                installed_by_tool: split_csv(installed_tools),
                highlight: row.get(14)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

fn rebuild_market_skill_index(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM market_skill_fts WHERE market_skill_id=?1", params![id])?;
    conn.execute(
        "INSERT INTO market_skill_fts (market_skill_id, name, description, tags, categories, source)
         SELECT id, name, COALESCE(description, ''), COALESCE(tags, ''),
                COALESCE(category_names, ''), COALESCE(source, '')
           FROM market_skills WHERE id=?1",
        params![id],
    )?;
    Ok(())
}

fn parse_json_list(raw: Option<String>) -> Vec<String> {
    raw.and_then(|value| serde_json::from_str::<Vec<String>>(&value).ok())
        .unwrap_or_default()
}

fn split_csv(raw: Option<String>) -> Vec<String> {
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

fn quoted_list(values: &[String]) -> String {
    values
        .iter()
        .map(|value| format!("'{}'", escape_sql_literal(value)))
        .collect::<Vec<_>>()
        .join(",")
}

fn escape_sql_literal(value: &str) -> String {
    value.replace('\'', "''")
}

fn escape_sql_like(value: &str) -> String {
    escape_sql_literal(value)
        .replace('%', "\\%")
        .replace('_', "\\_")
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
