import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SkillCard from '@/components/SkillCard/SkillCard'
import type { Skill } from '@/stores/skillStore'

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: '1',
    name: 'my-skill',
    originalName: 'my-skill',
    description: 'A handy skill',
    source: undefined,
    version: '1.0.0',
    installPath: '/path/to/skill',
    toolId: 'claude-code',
    enabled: true,
    installedAt: undefined,
    lastUsedAt: undefined,
    usageCount: 0,
    tags: ['ai', 'code'],
    categories: ['dev'],
    categoryIds: ['dev'],
    aliases: [],
    note: undefined,
    highlight: undefined,
    updateAvailable: false,
    ...overrides,
  }
}

describe('SkillCard', () => {
  it('renders skill name', () => {
    render(<SkillCard skill={makeSkill()} selected={false} onClick={() => {}} />)
    expect(screen.getByText('my-skill')).toBeInTheDocument()
  })

  it('renders description', () => {
    render(<SkillCard skill={makeSkill()} selected={false} onClick={() => {}} />)
    expect(screen.getByText('A handy skill')).toBeInTheDocument()
  })

  it('shows placeholder when description is missing', () => {
    render(<SkillCard skill={makeSkill({ description: undefined })} selected={false} onClick={() => {}} />)
    expect(screen.getByText('暂无描述')).toBeInTheDocument()
  })

  it('calls onClick when button is clicked', () => {
    const onClick = vi.fn()
    render(<SkillCard skill={makeSkill()} selected={false} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders tool badge', () => {
    render(<SkillCard skill={makeSkill({ toolId: 'agents' })} selected={false} onClick={() => {}} />)
    expect(screen.getByText('agents')).toBeInTheDocument()
  })

  it('renders tags (up to 2)', () => {
    render(
      <SkillCard
        skill={makeSkill({ tags: ['alpha', 'beta', 'gamma'] })}
        selected={false}
        onClick={() => {}}
      />,
    )
    expect(screen.getByText('#alpha')).toBeInTheDocument()
    expect(screen.getByText('#beta')).toBeInTheDocument()
    expect(screen.queryByText('#gamma')).not.toBeInTheDocument()
  })

  it('shows enabled status dot title', () => {
    const { container } = render(
      <SkillCard skill={makeSkill({ enabled: true })} selected={false} onClick={() => {}} />,
    )
    const dot = container.querySelector('[title="已启用"]')
    expect(dot).toBeTruthy()
  })

  it('shows disabled status dot title when skill is disabled', () => {
    const { container } = render(
      <SkillCard skill={makeSkill({ enabled: false })} selected={false} onClick={() => {}} />,
    )
    const dot = container.querySelector('[title="已禁用"]')
    expect(dot).toBeTruthy()
  })
})
