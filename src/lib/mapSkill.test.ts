import { describe, it, expect } from 'vitest'
import { mapSkill } from '@/lib/mapSkill'

describe('mapSkill', () => {
  it('converts snake_case keys to camelCase', () => {
    const raw = {
      id:           'abc-123',
      name:         'my-skill',
      original_name: 'MY-SKILL',
      description:  'does stuff',
      source:       'repo/source',
      version:      '2.1.0',
      install_path: '/home/user/.claude/skills/my-skill',
      tool_id:      'claude-code',
      enabled:      1,
      installed_at: 1700000000,
      last_used_at: 1700001000,
      usage_count:  42,
      tags:         ['tag1', 'tag2'],
      categories:   ['code'],
      category_ids: ['cat-code'],
      aliases:      ['ms'],
      note:         'some note',
      highlight:    '<mark>my</mark>-skill',
      update_available: true,
    }

    const skill = mapSkill(raw)

    expect(skill.id).toBe('abc-123')
    expect(skill.originalName).toBe('MY-SKILL')
    expect(skill.installPath).toBe('/home/user/.claude/skills/my-skill')
    expect(skill.toolId).toBe('claude-code')
    expect(skill.enabled).toBe(true)
    expect(skill.installedAt).toBe(1700000000)
    expect(skill.lastUsedAt).toBe(1700001000)
    expect(skill.usageCount).toBe(42)
    expect(skill.tags).toEqual(['tag1', 'tag2'])
    expect(skill.categories).toEqual(['code'])
    expect(skill.categoryIds).toEqual(['cat-code'])
    expect(skill.aliases).toEqual(['ms'])
    expect(skill.source).toBe('repo/source')
    expect(skill.highlight).toBe('<mark>my</mark>-skill')
    expect(skill.updateAvailable).toBe(true)
    expect(skill.note).toBe('some note')
  })

  it('defaults missing arrays to empty arrays', () => {
    const raw = { id: 'x', name: 'x', original_name: 'x', install_path: '/', tool_id: 'agents', enabled: 0 }
    const skill = mapSkill(raw)
    expect(skill.tags).toEqual([])
    expect(skill.categories).toEqual([])
    expect(skill.categoryIds).toEqual([])
    expect(skill.aliases).toEqual([])
  })

  it('defaults missing usage_count to 0', () => {
    const raw = { id: 'x', name: 'x', original_name: 'x', install_path: '/', tool_id: 'agents', enabled: 1 }
    const skill = mapSkill(raw)
    expect(skill.usageCount).toBe(0)
  })

  it('coerces enabled integer to boolean', () => {
    const raw = { id: 'x', name: 'x', original_name: 'x', install_path: '/', tool_id: 'agents', enabled: 0 }
    expect(mapSkill(raw).enabled).toBe(false)
    expect(mapSkill({ ...raw, enabled: 1 }).enabled).toBe(true)
  })
})
