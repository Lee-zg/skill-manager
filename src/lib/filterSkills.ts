import type { Skill } from '@/stores/skillStore'

export interface FilterParams {
  searchQuery:    string
  filterTool:     string | null
  filterCategory: string | null
}

/**
 * Pure function that filters a skill list by tool, category, and search query.
 * Extracted from SkillsPage so the logic can be unit-tested without React.
 */
export function filterSkills(skills: Skill[], params: FilterParams): Skill[] {
  const { searchQuery, filterTool, filterCategory } = params
  const q = searchQuery.trim().toLowerCase()

  return skills.filter((s) => {
    if (filterTool && s.toolId !== filterTool) return false
    if (filterCategory && !s.categories.includes(filterCategory)) return false
    if (!q) return true

    return (
      s.name.toLowerCase().includes(q) ||
      (s.description?.toLowerCase().includes(q) ?? false) ||
      s.tags.some((t) => t.toLowerCase().includes(q)) ||
      (s.note?.toLowerCase().includes(q) ?? false)
    )
  })
}
