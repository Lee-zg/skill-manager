import type { Skill } from '@/stores/skillStore'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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
      className={cn(
        'w-full text-left rounded-md p-3 border transition-all duration-150 cursor-pointer',
        'hover:-translate-y-px',
        selected
          ? 'bg-[var(--color-bg-surface)]'
          : 'bg-[var(--color-bg-panel)] hover:bg-[var(--color-bg-surface)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)]',
      )}
      style={{
        borderColor: selected ? accentColor : 'var(--color-border)',
        boxShadow: selected
          ? `0 0 0 1px ${accentColor}40, 0 4px 12px rgba(0,0,0,0.3)`
          : '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Icon */}
          <div
            className="flex items-center justify-center text-xs font-bold rounded shrink-0 w-7 h-7"
            style={{
              background: `${accentColor}22`,
              color: accentColor,
              border: `1px solid ${accentColor}44`,
            }}
          >
            {skill.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-[13px] font-medium truncate text-[var(--color-text-primary)]">
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
      <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)] line-clamp-2 mb-3">
        {skill.description ?? '暂无描述'}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {skill.categories.slice(0, 2).map((cat) => (
            <Badge key={cat} variant="default">{cat}</Badge>
          ))}
          {skill.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: `${accentColor}15`,
                borderColor: `${accentColor}30`,
                color: accentColor,
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium whitespace-nowrap"
          style={{
            background: `${accentColor}15`,
            borderColor: `${accentColor}30`,
            color: accentColor,
          }}
        >
          {skill.toolId}
        </span>
      </div>
    </button>
  )
}
