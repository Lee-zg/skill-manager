-- SkillManager SQLite Schema v4
-- Migration: 004_invocation_routes

CREATE TABLE IF NOT EXISTS invocation_routes (
  id              TEXT PRIMARY KEY,
  canonical_path  TEXT NOT NULL,
  display_path    TEXT NOT NULL,
  route_type      TEXT NOT NULL,
  workspace_id    TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  skill_id        TEXT REFERENCES skills(id) ON DELETE CASCADE,
  alias           TEXT,
  tool_id         TEXT NOT NULL,
  scope           TEXT NOT NULL DEFAULT 'user',
  slug            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'ready',
  conflict        TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(tool_id, scope, canonical_path),
  UNIQUE(tool_id, scope, slug)
);

CREATE TABLE IF NOT EXISTS invocation_exports (
  id                   TEXT PRIMARY KEY,
  route_id             TEXT NOT NULL REFERENCES invocation_routes(id) ON DELETE CASCADE,
  tool_id              TEXT NOT NULL,
  scope                TEXT NOT NULL DEFAULT 'user',
  export_mode          TEXT NOT NULL,
  expected_invocation  TEXT NOT NULL,
  actual_invocation    TEXT NOT NULL,
  fallback_invocation  TEXT,
  exported_path        TEXT,
  prompt_path          TEXT,
  status               TEXT NOT NULL DEFAULT 'preview',
  conflict             TEXT,
  last_exported_at     INTEGER,
  created_at           INTEGER DEFAULT (strftime('%s','now')),
  updated_at           INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(route_id, tool_id, scope, export_mode)
);

CREATE INDEX IF NOT EXISTS idx_invocation_routes_tool ON invocation_routes(tool_id, scope);
CREATE INDEX IF NOT EXISTS idx_invocation_routes_workspace ON invocation_routes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invocation_routes_skill ON invocation_routes(skill_id);
CREATE INDEX IF NOT EXISTS idx_invocation_exports_route ON invocation_exports(route_id);
CREATE INDEX IF NOT EXISTS idx_invocation_exports_tool ON invocation_exports(tool_id, scope);

-- 将 v3 的一维发布记录迁移成“路由 + 导出结果”，避免升级后旧发布记录从 UI 消失。
INSERT OR IGNORE INTO invocation_routes (
  id, canonical_path, display_path, route_type, workspace_id, skill_id, alias,
  tool_id, scope, slug, status, created_at, updated_at
)
SELECT
  'route-legacy-' || id,
  '/' || slug,
  '/' || REPLACE(display_name, '/', '／'),
  CASE
    WHEN target_type = 'workspace' THEN 'workspace_skill'
    WHEN target_type = 'category' THEN 'category_skill'
    ELSE 'skill_alias'
  END,
  workspace_id,
  skill_id,
  command_name,
  tool_id,
  scope,
  slug,
  status,
  created_at,
  updated_at
FROM skill_invocations;

INSERT OR IGNORE INTO invocation_exports (
  id, route_id, tool_id, scope, export_mode, expected_invocation, actual_invocation,
  fallback_invocation, exported_path, prompt_path, status, last_exported_at, created_at, updated_at
)
SELECT
  'export-legacy-' || id,
  'route-legacy-' || id,
  tool_id,
  scope,
  CASE
    WHEN tool_id = 'codex' AND export_mode LIKE '%prompt%' THEN 'codex-prompt-shim'
    WHEN tool_id = 'codex' THEN 'codex-skill'
    ELSE 'tool-skill'
  END,
  '/' || REPLACE(display_name, '/', '／'),
  CASE
    WHEN tool_id = 'codex' AND export_mode LIKE '%prompt%' THEN '/prompts:' || slug
    WHEN tool_id = 'codex' THEN '$' || slug || ' 或 /skills 搜索 ' || display_name
    ELSE '在 ' || tool_id || ' 的技能列表中选择 ' || slug
  END,
  CASE
    WHEN tool_id = 'codex' THEN '/skills 搜索 ' || display_name
    ELSE NULL
  END,
  exported_path,
  prompt_path,
  status,
  last_exported_at,
  created_at,
  updated_at
FROM skill_invocations;
