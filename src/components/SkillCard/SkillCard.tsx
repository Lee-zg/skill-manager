import type { Skill } from '@/stores/skillStore'

const TOOL_COLORS: Record<string, string> = {
  'claude-code': '#6366f1',
  'agents':      '#22c55e',
  'cc-switch':   '#f59e0b',
}

interface Props {
  skill: Skill
  selected?: boolean
  onClick: () => void
}

export default function SkillCard({ skill, selected, onClick }: Props) {
  const accentColor = TOOL_COLORS[skill.toolId] ?? '#6366f1'

  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? 'var(--color-bg-surface)' : 'var(--color-bg-panel)',
        border: `1px solid ${selected ? accentColor : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '12px',
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all var(--duration-fast) var(--ease-standard)',
        boxShadow: selected
          ? `0 0 0 1px ${accentColor}40, 0 4px 12px rgba(0,0,0,0.3)`
          : '0 2px 8px rgba(0,0,0,0.15)',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.background = 'var(--color-bg-surface)'
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)'
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.background = 'var(--color-bg-panel)'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        {/* Icon placeholder + name */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex items-center justify-center text-xs font-bold rounded shrink-0"
            style={{
              width: 28, height: 28,
              background: `${accentColor}22`,
              color: accentColor,
              border: `1px solid ${accentColor}44`,
            }}
          >
            {skill.name.charAt(0).toUpperCase()}
          </div>
          <span
            className="font-medium truncate"
            style={{ fontSize: 13, color: 'var(--color-text-primary)' }}
          >
            {skill.name}
          </span>
        </div>

        {/* Status dot */}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: skill.enabled ? 'var(--color-success)' : 'var(--color-text-placeholder)' }}
          title={skill.enabled ? '已启用' : '已禁用'}
        />
      </div>

      {/* Description */}
      <p
        className="line-clamp-2 mb-3"
        style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}
      >
        {skill.description ?? '暂无描述'}
      </p>

      {/* Footer: tool badge + tags */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-1 flex-wrap">
          {skill.categories.slice(0, 2).map((cat) => (
            <span key={cat} style={{
              fontSize: 10, padding: '1px 6px',
              background: 'var(--color-bg-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--color-text-secondary)',
            }}>
              {cat}
            </span>
          ))}
          {skill.tags.slice(0, 2).map((tag) => (
            <span key={tag} style={{
              fontSize: 10, padding: '1px 6px',
              background: `${accentColor}15`,
              border: `1px solid ${accentColor}30`,
              borderRadius: 'var(--radius-full)',
              color: accentColor,
            }}>
              #{tag}
            </span>
          ))}
        </div>

        {/* Tool badge */}
        <span style={{
          fontSize: 10, padding: '2px 7px', whiteSpace: 'nowrap',
          background: `${accentColor}15`,
          border: `1px solid ${accentColor}30`,
          borderRadius: 'var(--radius-full)',
          color: accentColor, fontWeight: 500,
        }}>
          {skill.toolId}
        </span>
      </div>
    </button>
  )
}
