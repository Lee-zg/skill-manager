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
  variant?: 'grid' | 'list'
  onClick: () => void
}

export default function SkillCard({ skill, selected, variant = 'grid', onClick }: Props) {
  const accentColor = TOOL_COLORS[skill.toolId] ?? '#6366f1'
  const summary = skill.highlight ?? skill.description ?? '暂无描述'

  if (variant === 'list') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex h-16 w-full items-center gap-3 rounded-md border px-3 text-left transition-all duration-150',
          selected
            ? 'bg-[var(--color-bg-surface)]'
            : 'bg-[var(--color-bg-panel)] hover:bg-[var(--color-bg-surface)]',
        )}
        style={{
          borderColor: selected ? accentColor : 'var(--color-border)',
          boxShadow: selected ? `0 0 0 1px ${accentColor}40` : 'var(--shadow-card)',
        }}
      >
        <SkillIcon name={skill.name} accentColor={accentColor} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
              {skill.name}
            </span>
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: skill.enabled ? 'var(--color-success)' : 'var(--color-text-placeholder)' }}
              title={skill.enabled ? '已启用' : '已禁用'}
            />
            {skill.updateAvailable && <Badge variant="warning">可更新</Badge>}
          </div>
          <p className="truncate text-[11px] text-[var(--color-text-secondary)]">
            <HighlightText value={summary} />
          </p>
        </div>
        <div className="hidden min-w-0 items-center gap-1 md:flex">
          {skill.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="accent">#{tag}</Badge>
          ))}
        </div>
        <ToolBadge toolId={skill.toolId} accentColor={accentColor} />
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-md p-3 border transition-all duration-150 cursor-pointer',
        'hover:-translate-y-0.5',
        selected
          ? 'bg-[var(--color-bg-surface)]'
          : 'bg-[var(--color-bg-panel)] hover:bg-[var(--color-bg-surface)] hover:shadow-[var(--shadow-card-hover)]',
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
          <SkillIcon name={skill.name} accentColor={accentColor} />
          <span className="text-[13px] font-medium truncate text-[var(--color-text-primary)]">
            {skill.name}
          </span>
          {skill.updateAvailable && <Badge variant="warning">可更新</Badge>}
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
        <HighlightText value={summary} />
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
        <ToolBadge toolId={skill.toolId} accentColor={accentColor} />
      </div>
    </button>
  )
}

function SkillIcon({ name, accentColor }: { name: string; accentColor: string }) {
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-bold"
      style={{
        background: `${accentColor}22`,
        color: accentColor,
        border: `1px solid ${accentColor}44`,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function ToolBadge({ toolId, accentColor }: { toolId: string; accentColor: string }) {
  return (
    <span
      className="whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        background: `${accentColor}15`,
        borderColor: `${accentColor}30`,
        color: accentColor,
      }}
    >
      {toolId}
    </span>
  )
}

function HighlightText({ value }: { value: string }) {
  const segments = parseHighlightSegments(value)

  return (
    <>
      {segments.map((segment, index) => (
        segment.highlighted
          ? <mark key={`${segment.text}-${index}`} className="rounded bg-[var(--color-accent-muted)] px-0.5 text-[var(--color-accent-hover)]">{segment.text}</mark>
          : <span key={`${segment.text}-${index}`}>{segment.text}</span>
      ))}
    </>
  )
}

function parseHighlightSegments(value: string): Array<{ text: string; highlighted: boolean }> {
  const tokens = value.split(/(<mark>|<\/mark>)/)
  const segments: Array<{ text: string; highlighted: boolean }> = []
  let isHighlighted = false

  for (const token of tokens) {
    if (token === '<mark>') {
      isHighlighted = true
    } else if (token === '</mark>') {
      isHighlighted = false
    } else if (token) {
      segments.push({ text: token, highlighted: isHighlighted })
    }
  }

  return segments
}
