use anyhow::Result;
use rusqlite::Connection;
use serde_json::json;

use crate::db::canonical::{record_audit_event, stable_audit_id, AuditEventInput};

pub fn record(
    conn: &Connection,
    event_type: &str,
    skill_id: Option<&str>,
    target: Option<&str>,
    path: Option<&str>,
    message: &str,
) -> Result<()> {
    let seed = format!(
        "{}:{}:{}:{}:{}",
        event_type,
        skill_id.unwrap_or_default(),
        target.unwrap_or_default(),
        path.unwrap_or_default(),
        chrono::Utc::now().timestamp_nanos_opt().unwrap_or_default()
    );
    record_audit_event(
        conn,
        &AuditEventInput {
            id: stable_audit_id(&seed),
            event_type: event_type.to_string(),
            skill_id: skill_id.map(String::from),
            target: target.map(String::from),
            path: path.map(String::from),
            message: message.to_string(),
            metadata_json: json!({}).to_string(),
        },
    )
}
