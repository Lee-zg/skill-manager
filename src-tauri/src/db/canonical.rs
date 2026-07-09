use anyhow::Result;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct CanonicalSkillInput {
    pub id: String,
    pub canonical_name: String,
    pub display_name: String,
    pub latest_version: String,
}

#[derive(Debug, Clone)]
pub struct SkillVersionInput {
    pub skill_id: String,
    pub version: String,
    pub content_hash: String,
    pub canonical_path: String,
    pub source_type: String,
    pub source_uri: String,
    pub trusted: bool,
    pub staged: bool,
}

#[derive(Debug, Clone)]
pub struct InstallationInput {
    pub id: String,
    pub skill_id: String,
    pub version: String,
    pub target: String,
    pub scope: String,
    pub project_path: Option<String>,
    pub alias: String,
    pub mount_path: String,
    pub mode: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallationRow {
    pub id: String,
    pub skill_id: String,
    pub version: String,
    pub target: String,
    pub scope: String,
    pub project_path: Option<String>,
    pub alias: Option<String>,
    pub mount_path: String,
    pub mode: String,
    pub status: String,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEventRow {
    pub id: String,
    pub event_type: String,
    pub skill_id: Option<String>,
    pub target: Option<String>,
    pub path: Option<String>,
    pub message: String,
    pub metadata_json: String,
    pub created_at: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct AuditEventInput {
    pub id: String,
    pub event_type: String,
    pub skill_id: Option<String>,
    pub target: Option<String>,
    pub path: Option<String>,
    pub message: String,
    pub metadata_json: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct CanonicalVersionRow {
    pub skill_id: String,
    pub canonical_name: String,
    pub display_name: Option<String>,
    pub version: String,
    pub content_hash: String,
    pub canonical_path: String,
}

pub fn upsert_canonical_skill(conn: &Connection, input: &CanonicalSkillInput) -> Result<()> {
    conn.execute(
        "INSERT INTO canonical_skills
           (id, canonical_name, display_name, latest_version, created_at, updated_at)
         VALUES (?1,?2,?3,?4,strftime('%s','now'),strftime('%s','now'))
         ON CONFLICT(id) DO UPDATE SET
           canonical_name=excluded.canonical_name,
           display_name=excluded.display_name,
           latest_version=excluded.latest_version,
           updated_at=strftime('%s','now')",
        params![
            input.id,
            input.canonical_name,
            input.display_name,
            input.latest_version,
        ],
    )?;
    Ok(())
}

pub fn find_canonical_id_by_name(conn: &Connection, canonical_name: &str) -> Result<Option<String>> {
    conn.query_row(
        "SELECT id FROM canonical_skills WHERE canonical_name=?1 LIMIT 1",
        params![canonical_name],
        |row| row.get(0),
    )
    .optional()
    .map_err(Into::into)
}

pub fn upsert_skill_version(conn: &Connection, input: &SkillVersionInput) -> Result<()> {
    conn.execute(
        "INSERT INTO skill_versions
           (skill_id, version, content_hash, canonical_path, source_type, source_uri,
            trusted, staged, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,strftime('%s','now'))
         ON CONFLICT(skill_id, version) DO UPDATE SET
           content_hash=excluded.content_hash,
           canonical_path=excluded.canonical_path,
           source_type=excluded.source_type,
           source_uri=excluded.source_uri,
           trusted=excluded.trusted,
           staged=excluded.staged",
        params![
            input.skill_id,
            input.version,
            input.content_hash,
            input.canonical_path,
            input.source_type,
            input.source_uri,
            input.trusted as i64,
            input.staged as i64,
        ],
    )?;
    Ok(())
}

pub fn upsert_installation(conn: &Connection, input: &InstallationInput) -> Result<()> {
    conn.execute(
        "INSERT INTO installations
           (id, skill_id, version, target, scope, project_path, alias, mount_path,
            mode, status, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,strftime('%s','now'),strftime('%s','now'))
         ON CONFLICT(id) DO UPDATE SET
           version=excluded.version,
           target=excluded.target,
           scope=excluded.scope,
           project_path=excluded.project_path,
           alias=excluded.alias,
           mount_path=excluded.mount_path,
           mode=excluded.mode,
           status=excluded.status,
           updated_at=strftime('%s','now')",
        params![
            input.id,
            input.skill_id,
            input.version,
            input.target,
            input.scope,
            input.project_path,
            input.alias,
            input.mount_path,
            input.mode,
            input.status,
        ],
    )?;
    Ok(())
}

pub fn set_target_alias(conn: &Connection, skill_id: &str, target: &str, alias: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO target_aliases (skill_id, target, alias, created_at, updated_at)
         VALUES (?1,?2,?3,strftime('%s','now'),strftime('%s','now'))
         ON CONFLICT(skill_id, target) DO UPDATE SET
           alias=excluded.alias,
           updated_at=strftime('%s','now')",
        params![skill_id, target, alias],
    )?;
    Ok(())
}

pub fn record_audit_event(conn: &Connection, input: &AuditEventInput) -> Result<()> {
    conn.execute(
        "INSERT INTO audit_events
           (id, event_type, skill_id, target, path, message, metadata_json, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,strftime('%s','now'))",
        params![
            input.id,
            input.event_type,
            input.skill_id,
            input.target,
            input.path,
            input.message,
            input.metadata_json,
        ],
    )?;
    Ok(())
}

pub fn list_audit_events(conn: &Connection, skill_id: Option<&str>) -> Result<Vec<AuditEventRow>> {
    let mut stmt = conn.prepare(
        "SELECT id, event_type, skill_id, target, path, message, metadata_json, created_at
           FROM audit_events
          WHERE (?1 IS NULL OR skill_id = ?1)
          ORDER BY created_at DESC
          LIMIT 200",
    )?;
    let rows = stmt
        .query_map(params![skill_id], |row| {
            Ok(AuditEventRow {
                id: row.get(0)?,
                event_type: row.get(1)?,
                skill_id: row.get(2)?,
                target: row.get(3)?,
                path: row.get(4)?,
                message: row.get(5)?,
                metadata_json: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn list_installations(
    conn: &Connection,
    target: Option<&str>,
    skill_id: Option<&str>,
) -> Result<Vec<InstallationRow>> {
    let mut stmt = conn.prepare(
        "SELECT id, skill_id, version, target, scope, project_path, alias, mount_path,
                mode, status, created_at, updated_at
           FROM installations
          WHERE (?1 IS NULL OR target = ?1)
            AND (?2 IS NULL OR skill_id = ?2)
          ORDER BY target, alias COLLATE NOCASE",
    )?;
    let rows = stmt
        .query_map(params![target, skill_id], installation_from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn get_installation(conn: &Connection, id: &str) -> Result<Option<InstallationRow>> {
    conn.query_row(
        "SELECT id, skill_id, version, target, scope, project_path, alias, mount_path,
                mode, status, created_at, updated_at
           FROM installations
          WHERE id=?1",
        params![id],
        installation_from_row,
    )
    .optional()
    .map_err(Into::into)
}

pub fn mark_installation_status(conn: &Connection, id: &str, status: &str) -> Result<()> {
    conn.execute(
        "UPDATE installations SET status=?1, updated_at=strftime('%s','now') WHERE id=?2",
        params![status, id],
    )?;
    Ok(())
}

pub fn get_latest_version(conn: &Connection, skill_id: &str) -> Result<Option<CanonicalVersionRow>> {
    conn.query_row(
        "SELECT cs.id, cs.canonical_name, cs.display_name, sv.version,
                sv.content_hash, sv.canonical_path
           FROM canonical_skills cs
           JOIN skill_versions sv ON sv.skill_id = cs.id
          WHERE cs.id=?1
          ORDER BY sv.created_at DESC
          LIMIT 1",
        params![skill_id],
        |row| {
            Ok(CanonicalVersionRow {
                skill_id: row.get(0)?,
                canonical_name: row.get(1)?,
                display_name: row.get(2)?,
                version: row.get(3)?,
                content_hash: row.get(4)?,
                canonical_path: row.get(5)?,
            })
        },
    )
    .optional()
    .map_err(Into::into)
}

pub fn installation_id_for(
    skill_id: &str,
    target: &str,
    scope: &str,
    project_path: Option<&str>,
    alias: &str,
) -> String {
    let input = format!(
        "{skill_id}:{target}:{scope}:{}:{alias}",
        project_path.unwrap_or("")
    );
    format!("inst-{:016x}", stable_hash64(&input))
}

pub fn stable_skill_id(canonical_name: &str) -> String {
    format!("skill-{:016x}", stable_hash64(canonical_name))
}

pub fn stable_audit_id(seed: &str) -> String {
    format!("audit-{:016x}", stable_hash64(seed))
}

pub fn stable_hash64(input: &str) -> u64 {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in input.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

fn installation_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<InstallationRow> {
    Ok(InstallationRow {
        id: row.get(0)?,
        skill_id: row.get(1)?,
        version: row.get(2)?,
        target: row.get(3)?,
        scope: row.get(4)?,
        project_path: row.get(5)?,
        alias: row.get(6)?,
        mount_path: row.get(7)?,
        mode: row.get(8)?,
        status: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}
