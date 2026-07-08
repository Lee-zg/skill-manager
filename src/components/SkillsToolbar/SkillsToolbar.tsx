import { SearchIcon, LayoutGridIcon, ListIcon, RefreshCwIcon } from '@/components/icons'
import { useSkillStore } from '@/stores/skillStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  SelectRoot, SelectTrigger, SelectValue,
  SelectContent, SelectItemEl,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const TOOL_OPTIONS = [
  { value: '__all__',    label: '全部工具' },
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'agents',      label: 'Agents' },
  { value: 'cc-switch',   label: 'cc-switch' },
]

interface Props {
  onScan: () => void
  scanning: boolean
}

export default function SkillsToolbar({ onScan, scanning }: Props) {
  const {
    searchQuery, setSearchQuery,
    viewMode, setViewMode,
    filterTool, setFilterTool,
  } = useSkillStore()

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg-panel)]">
      {/* Search */}
      <div className="relative flex-1">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]">
          <SearchIcon size={13} />
        </span>
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索技能、标签、备注..."
          className="pl-7 pr-7"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)] hover:text-[var(--color-text-secondary)] transition-colors bg-none border-none cursor-pointer p-0"
          >
            <span className="text-sm leading-none">×</span>
          </button>
        )}
      </div>

      {/* Tool filter */}
      <SelectRoot
        value={filterTool ?? '__all__'}
        onValueChange={(v) => setFilterTool(v === '__all__' ? null : v)}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TOOL_OPTIONS.map((opt) => (
            <SelectItemEl key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItemEl>
          ))}
        </SelectContent>
      </SelectRoot>

      {/* View mode toggle */}
      <div className="flex rounded-md border border-[var(--color-border)] overflow-hidden">
        {(['grid', 'list'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            aria-label={mode === 'grid' ? 'Grid view' : 'List view'}
            className={cn(
              'flex items-center justify-center w-8 h-8 transition-colors border-none cursor-pointer',
              viewMode === mode
                ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                : 'bg-[var(--color-bg-surface)] text-[var(--color-text-placeholder)] hover:text-[var(--color-text-secondary)]',
            )}
          >
            {mode === 'grid' ? <LayoutGridIcon size={14} /> : <ListIcon size={14} />}
          </button>
        ))}
      </div>

      {/* Scan */}
      <Button onClick={onScan} disabled={scanning} size="md" className="gap-1.5">
        <RefreshCwIcon
          size={12}
          className={scanning ? 'animate-spin' : ''}
        />
        {scanning ? '扫描中…' : '扫描技能'}
      </Button>
    </div>
  )
}
