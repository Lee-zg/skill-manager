-- SkillManager SQLite Schema v3
-- Migration: 003_market_invocations

CREATE TABLE IF NOT EXISTS market_skills (
  id              TEXT PRIMARY KEY,
  repository_id   TEXT NOT NULL,
  repository_name TEXT NOT NULL,
  repo_type       TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  author          TEXT,
  source          TEXT,
  install_source  TEXT NOT NULL,
  version         TEXT,
  tags            TEXT DEFAULT '[]',
  category_names  TEXT DEFAULT '[]',
  updated_at      INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(repository_id, install_source)
);

CREATE VIRTUAL TABLE IF NOT EXISTS market_skill_fts USING fts5(
  market_skill_id UNINDEXED,
  name,
  description,
  tags,
  categories,
  source
);

CREATE TABLE IF NOT EXISTS repository_sync_runs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  repository_id   TEXT NOT NULL,
  indexed_skills  INTEGER DEFAULT 0,
  added           INTEGER DEFAULT 0,
  updated         INTEGER DEFAULT 0,
  removed         INTEGER DEFAULT 0,
  errors          TEXT DEFAULT '[]',
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS skill_invocations (
  id               TEXT PRIMARY KEY,
  skill_id          TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  tool_id           TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  command_name      TEXT NOT NULL,
  slug              TEXT NOT NULL,
  category_ids      TEXT DEFAULT '[]',
  workspace_id      TEXT,
  target_type       TEXT NOT NULL,
  target_id         TEXT NOT NULL,
  scope             TEXT NOT NULL DEFAULT 'user',
  export_mode       TEXT NOT NULL,
  exported_path     TEXT NOT NULL,
  prompt_path       TEXT,
  status            TEXT NOT NULL DEFAULT 'exported',
  last_exported_at  INTEGER,
  created_at        INTEGER DEFAULT (strftime('%s','now')),
  updated_at        INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_market_skills_repository ON market_skills(repository_id);
CREATE INDEX IF NOT EXISTS idx_skill_invocations_tool ON skill_invocations(tool_id, scope);
CREATE INDEX IF NOT EXISTS idx_skill_invocations_skill ON skill_invocations(skill_id);
