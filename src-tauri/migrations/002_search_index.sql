-- SkillManager SQLite Schema v2
-- Migration: 002_search_index

ALTER TABLE skills ADD COLUMN search_initials TEXT DEFAULT '';

DROP TABLE IF EXISTS skills_fts;

CREATE VIRTUAL TABLE IF NOT EXISTS skills_fts USING fts5(
  skill_id UNINDEXED,
  name,
  description,
  tags,
  note,
  aliases,
  initials
);

INSERT INTO skills_fts (skill_id, name, description, tags, note, aliases, initials)
SELECT
  s.id,
  s.name,
  COALESCE(s.description, ''),
  COALESCE((SELECT GROUP_CONCAT(tag, ' ') FROM skill_tags WHERE skill_id = s.id), ''),
  COALESCE((SELECT content FROM skill_notes WHERE skill_id = s.id), ''),
  COALESCE((SELECT GROUP_CONCAT(alias, ' ') FROM skill_aliases WHERE skill_id = s.id), ''),
  COALESCE(s.search_initials, '')
FROM skills s;

CREATE TRIGGER IF NOT EXISTS skills_fts_delete
AFTER DELETE ON skills
BEGIN
  DELETE FROM skills_fts WHERE skill_id = OLD.id;
END;
