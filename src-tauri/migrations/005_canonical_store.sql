-- SkillManager SQLite Schema v5
-- Migration: canonical store + installation mappings

CREATE TABLE IF NOT EXISTS canonical_skills (
  id             TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL UNIQUE,
  display_name   TEXT,
  latest_version TEXT,
  created_at     INTEGER DEFAULT (strftime('%s','now')),
  updated_at     INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS skill_versions (
  skill_id       TEXT NOT NULL REFERENCES canonical_skills(id) ON DELETE CASCADE,
  version        TEXT NOT NULL,
  content_hash   TEXT NOT NULL,
  canonical_path TEXT NOT NULL,
  source_type    TEXT,
  source_uri     TEXT,
  trusted        INTEGER DEFAULT 0,
  staged         INTEGER DEFAULT 0,
  created_at     INTEGER DEFAULT (strftime('%s','now')),
  PRIMARY KEY (skill_id, version)
);

CREATE TABLE IF NOT EXISTS installations (
  id           TEXT PRIMARY KEY,
  skill_id     TEXT NOT NULL REFERENCES canonical_skills(id) ON DELETE CASCADE,
  version      TEXT NOT NULL,
  target       TEXT NOT NULL,
  scope        TEXT NOT NULL DEFAULT 'user',
  project_path TEXT,
  alias        TEXT,
  mount_path   TEXT NOT NULL,
  mode         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'installed',
  created_at   INTEGER DEFAULT (strftime('%s','now')),
  updated_at   INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(target, scope, project_path, mount_path)
);

CREATE TABLE IF NOT EXISTS target_aliases (
  skill_id   TEXT NOT NULL REFERENCES canonical_skills(id) ON DELETE CASCADE,
  target     TEXT NOT NULL,
  alias      TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now')),
  PRIMARY KEY (skill_id, target)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id            TEXT PRIMARY KEY,
  event_type    TEXT NOT NULL,
  skill_id      TEXT,
  target        TEXT,
  path          TEXT,
  message       TEXT NOT NULL,
  metadata_json TEXT DEFAULT '{}',
  created_at    INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_skill_versions_skill ON skill_versions(skill_id);
CREATE INDEX IF NOT EXISTS idx_installations_skill ON installations(skill_id);
CREATE INDEX IF NOT EXISTS idx_installations_target ON installations(target, scope, status);
CREATE INDEX IF NOT EXISTS idx_audit_events_skill ON audit_events(skill_id, created_at);

-- 将旧的“工具目录扫描结果”迁移成 canonical + installation 记录。
-- 为了避免破坏工作区、分类、标签、备注等旧引用，canonical id 先沿用旧 skill id。
INSERT OR IGNORE INTO canonical_skills (
  id, canonical_name, display_name, latest_version, created_at, updated_at
)
SELECT
  id,
  lower(replace(original_name, ' ', '-')),
  name,
  COALESCE(version, '0.0.0'),
  COALESCE(created_at, strftime('%s','now')),
  COALESCE(updated_at, strftime('%s','now'))
FROM skills;

INSERT OR IGNORE INTO skill_versions (
  skill_id, version, content_hash, canonical_path, source_type, source_uri,
  trusted, staged, created_at
)
SELECT
  id,
  COALESCE(version, '0.0.0'),
  'legacy:' || id,
  install_path,
  'legacy-scan',
  source,
  1,
  0,
  COALESCE(installed_at, created_at, strftime('%s','now'))
FROM skills;

INSERT OR IGNORE INTO installations (
  id, skill_id, version, target, scope, project_path, alias, mount_path,
  mode, status, created_at, updated_at
)
SELECT
  'legacy-' || id,
  id,
  COALESCE(version, '0.0.0'),
  tool_id,
  'user',
  NULL,
  original_name,
  install_path,
  'legacy',
  CASE WHEN enabled = 1 THEN 'installed' ELSE 'disabled' END,
  COALESCE(installed_at, created_at, strftime('%s','now')),
  COALESCE(updated_at, strftime('%s','now'))
FROM skills;

INSERT OR IGNORE INTO target_aliases (skill_id, target, alias, created_at, updated_at)
SELECT
  s.id,
  s.tool_id,
  a.alias,
  strftime('%s','now'),
  strftime('%s','now')
FROM skill_aliases a
JOIN skills s ON s.id = a.skill_id;
