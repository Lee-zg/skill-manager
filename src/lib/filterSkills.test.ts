import { describe, it, expect } from 'vitest'
import type { Skill } from '@/stores/skillStore'
import { filterSkills } from '@/lib/filterSkills'

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'test-1',
    name: 'test-skill',
    originalName: 'test-skill',
    description: 'A test skill',
    version: '1.0.0',
    installPath: '/some/path',
    toolId: 'claude-code',
    enabled: true,
    installedAt: undefined,
    lastUsedAt: undefined,
    usageCount: 0,
    tags: [],
    categories: [],
    note: undefined,
    ...overrides,
  }
}

const BASE_SKILLS: Skill[] = [
  makeSkill({ id: '1', name: 'linter',     toolId: 'claude-code', tags: ['dev'], categories: ['code'] }),
  makeSkill({ id: '2', name: 'formatter',  toolId: 'claude-code', description: 'auto format code' }),
  makeSkill({ id: '3', name: 'searcher',   toolId: 'agents',      tags: ['search'], categories: ['util'] }),
  makeSkill({ id: '4', name: 'scheduler',  toolId: 'cc-switch',   note: 'runs nightly' }),
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('filterSkills', () => {
  it('returns all skills when no filters set', () => {
    const result = filterSkills(BASE_SKILLS, {
      searchQuery: '', filterTool: null, filterCategory: null,
    })
    expect(result).toHaveLength(4)
  })

  it('filters by toolId', () => {
    const result = filterSkills(BASE_SKILLS, {
      searchQuery: '', filterTool: 'claude-code', filterCategory: null,
    })
    expect(result.map((s) => s.id)).toEqual(['1', '2'])
  })

  it('filters by category', () => {
    const result = filterSkills(BASE_SKILLS, {
      searchQuery: '', filterTool: null, filterCategory: 'code',
    })
    expect(result.map((s) => s.id)).toEqual(['1'])
  })

  it('filters by search query on name', () => {
    const result = filterSkills(BASE_SKILLS, {
      searchQuery: 'form', filterTool: null, filterCategory: null,
    })
    expect(result.map((s) => s.id)).toEqual(['2'])
  })

  it('filters by search query on description', () => {
    const result = filterSkills(BASE_SKILLS, {
      searchQuery: 'auto format', filterTool: null, filterCategory: null,
    })
    expect(result.map((s) => s.id)).toEqual(['2'])
  })

  it('filters by search query on tag', () => {
    const result = filterSkills(BASE_SKILLS, {
      searchQuery: 'search', filterTool: null, filterCategory: null,
    })
    expect(result.map((s) => s.id)).toEqual(['3'])
  })

  it('filters by search query on note', () => {
    const result = filterSkills(BASE_SKILLS, {
      searchQuery: 'nightly', filterTool: null, filterCategory: null,
    })
    expect(result.map((s) => s.id)).toEqual(['4'])
  })

  it('combines tool + search filters', () => {
    const result = filterSkills(BASE_SKILLS, {
      searchQuery: 'er', filterTool: 'agents', filterCategory: null,
    })
    expect(result.map((s) => s.id)).toEqual(['3'])
  })

  it('returns empty list when nothing matches', () => {
    const result = filterSkills(BASE_SKILLS, {
      searchQuery: 'nonexistent-xyz', filterTool: null, filterCategory: null,
    })
    expect(result).toHaveLength(0)
  })

  it('is case-insensitive in search', () => {
    const result = filterSkills(BASE_SKILLS, {
      searchQuery: 'LINTER', filterTool: null, filterCategory: null,
    })
    expect(result.map((s) => s.id)).toEqual(['1'])
  })

  it('trims whitespace from query', () => {
    const result = filterSkills(BASE_SKILLS, {
      searchQuery: '  linter  ', filterTool: null, filterCategory: null,
    })
    expect(result.map((s) => s.id)).toEqual(['1'])
  })
})
