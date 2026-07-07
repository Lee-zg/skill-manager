import { Search, LayoutGrid, List, RefreshCw } from 'lucide-react'
import { useSkillStore } from '@/stores/skillStore'

const TOOL_OPTIONS = [
  { value: null,          label: '全部工具' },
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
    <div
      className="flex items-center gap-2 px-4 py-2.5 shrink-0"
      style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-panel)' }}
    >
      {/* Search */}
      <div className="flex items-center gap-2 flex-1 px-3 rounded-md"
        style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', height: 32 }}
      >
        <Search size={13} style={{ color: 'var(--color-text-placeholder)', flexShrink: 0 }} />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索技能、标签、备注..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 12, color: 'var(--color-text-primary)',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-placeholder)', padding: 0, fontSize: 14 }}
          >
            ×
          </button>
        )}
      </div>

      {/* Tool filter */}
      <select
        value={filterTool ?? ''}
        onChange={(e) => setFilterTool(e.target.value || null)}
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-secondary)',
          fontSize: 12, height: 32, padding: '0 8px', cursor: 'pointer',
        }}
      >
        {TOOL_OPTIONS.map((opt) => (
          <option key={String(opt.value)} value={opt.value ?? ''}>{opt.label}</option>
        ))}
      </select>

      {/* View mode */}
      <div className="flex" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {(['grid', 'list'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              background: viewMode === mode ? 'var(--color-accent-muted)' : 'var(--color-bg-surface)',
              border: 'none', cursor: 'pointer',
              color: viewMode === mode ? 'var(--color-accent)' : 'var(--color-text-placeholder)',
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {mode === 'grid' ? <LayoutGrid size={14} /> : <List size={14} />}
          </button>
        ))}
      </div>

      {/* Scan button */}
      <button
        onClick={onScan}
        disabled={scanning}
        className="flex items-center gap-1.5 px-3 rounded-md"
        style={{
          height: 32, background: 'var(--color-accent)', border: 'none',
          color: '#fff', fontSize: 12, fontWeight: 500, cursor: scanning ? 'not-allowed' : 'pointer',
          opacity: scanning ? 0.7 : 1,
        }}
      >
        <RefreshCw size={12} style={{ animation: scanning ? 'spin 1s linear infinite' : 'none' }} />
        {scanning ? '扫描中…' : '扫描技能'}
      </button>
    </div>
  )
}
