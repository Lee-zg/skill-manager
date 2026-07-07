-- SkillHub SQLite Schema v1
-- Migration: 001_initial

CREATE TABLE IF NOT EXISTS skills (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  original_name TEXT NOT NULL,
  description   TEXT,
  source        TEXT,
  version       TEXT,
  install_path  TEXT NOT NULL,
  tool_id       TEXT NOT NULL,
  enabled       INTEGER DEFAULT 1,
  installed_at  INTEGER,
  last_used_at  INTEGER,
  usage_count   INTEGER DEFAULT 0,
  created_at    INTEGER DEFAULT (strftime('%s','now')),
  updated_at    INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  parent_id  TEXT REFERENCES categories(id),
  color      TEXT DEFAULT '#6366f1',
  icon       TEXT DEFAULT '📁',
  sort_order INTEGER DEFAULT 0,
  is_system  INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS skill_categories (
  skill_id    TEXT REFERENCES skills(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (skill_id, category_id)
);

CREATE TABLE IF NOT EXISTS skill_tags (
  skill_id TEXT REFERENCES skills(id) ON DELETE CASCADE,
  tag      TEXT NOT NULL,
  PRIMARY KEY (skill_id, tag)
);

CREATE TABLE IF NOT EXISTS skill_notes (
  skill_id   TEXT PRIMARY KEY REFERENCES skills(id) ON DELETE CASCADE,
  content    TEXT,
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS skill_aliases (
  skill_id TEXT REFERENCES skills(id) ON DELETE CASCADE,
  alias    TEXT NOT NULL,
  UNIQUE(alias),
  PRIMARY KEY (skill_id, alias)
);

CREATE TABLE IF NOT EXISTS workspaces (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  tool_id     TEXT,
  color       TEXT DEFAULT '#6366f1',
  icon        TEXT DEFAULT '🔲',
  is_active   INTEGER DEFAULT 0,
  created_at  INTEGER DEFAULT (strftime('%s','now')),
  updated_at  INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS workspace_skills (
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  skill_id     TEXT REFERENCES skills(id) ON DELETE CASCADE,
  enabled      INTEGER DEFAULT 1,
  note         TEXT,
  sort_order   INTEGER DEFAULT 0,
  PRIMARY KEY (workspace_id, skill_id)
);

CREATE TABLE IF NOT EXISTS repositories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,
  type       TEXT NOT NULL,
  branch     TEXT DEFAULT 'main',
  skills_dir TEXT DEFAULT 'skills/',
  auth_type  TEXT,
  auth_key   TEXT,
  priority   INTEGER DEFAULT 10,
  enabled    INTEGER DEFAULT 1,
  last_sync  INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS activity_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  action       TEXT NOT NULL,
  skill_id     TEXT,
  workspace_id TEXT,
  detail       TEXT,
  created_at   INTEGER DEFAULT (strftime('%s','now'))
);

-- FTS5 full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS skills_fts USING fts5(
  name, description, content=skills, content_rowid=rowid
);

-- Default system categories
INSERT OR IGNORE INTO categories (id, name, icon, color, is_system) VALUES
  ('all',           '全部',   '📋', '#6366f1', 1),
  ('uncategorized', '未分类', '📁', '#8a8a94', 1);
