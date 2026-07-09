import type { Skill } from '@/stores/skillStore'

/**
 * Convert a raw snake_case skill row from Tauri into the camelCase Skill shape.
 * Extracted as a pure function so it can be unit-tested independently of the store.
 */
export function mapSkill(s: Record<string, any>): Skill {
  return {
    id:           s.id,
    name:         s.name,
    originalName: s.original_name,
    description:  s.description,
    source:       s.source,
    version:      s.version,
    installPath:  s.install_path,
    toolId:       s.tool_id,
    enabled:      Boolean(s.enabled),
    installedAt:  s.installed_at,
    lastUsedAt:   s.last_used_at,
    usageCount:   s.usage_count ?? 0,
    tags:         s.tags         ?? [],
    categories:   s.categories   ?? [],
    categoryIds:  s.category_ids ?? [],
    aliases:      s.aliases      ?? [],
    note:         s.note,
    highlight:    s.highlight,
    updateAvailable: Boolean(s.update_available),
  }
}
