import { describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async (command: string) => {
    if (command === 'list_targets_cmd') {
      return [{
        tool_id: 'agents',
        name: 'Agents / Codex',
        user_dir: '/Users/test/.agents/skills',
        project_dir: '$PROJECT/.agents/skills',
        supports_symlink: true,
        requires_materialized_alias: false,
        available: true,
        refresh_hint: null,
      }]
    }
    if (command === 'doctor_cmd') {
      return {
        checked: 1,
        issues: [{
          installation_id: 'inst-1',
          skill_id: 'skill-1',
          target: 'agents',
          path: '/missing',
          issue_type: 'missing-mount',
          message: '目标工具映射路径不存在',
        }],
      }
    }
    return {}
  }),
}))

describe('api mapping', () => {
  it('maps target descriptors', async () => {
    const { listTargets } = await import('@/lib/api')
    const targets = await listTargets()
    expect(targets[0]).toMatchObject({
      toolId: 'agents',
      supportsSymlink: true,
      requiresMaterializedAlias: false,
      userDir: '/Users/test/.agents/skills',
    })
  })

  it('maps doctor report issues', async () => {
    const { runDoctor } = await import('@/lib/api')
    const report = await runDoctor()
    expect(report.checked).toBe(1)
    expect(report.issues[0]).toMatchObject({
      installationId: 'inst-1',
      issueType: 'missing-mount',
    })
  })
})
