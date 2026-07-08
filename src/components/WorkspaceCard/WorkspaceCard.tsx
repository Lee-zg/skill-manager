import { useState } from 'react'
import { MoreHorizontalIcon, CheckCircleIcon, PencilIcon, Trash2Icon, DownloadIcon } from '@/components/icons'
import type { Workspace } from '@/stores/workspaceStore'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Props {
  workspace: Workspace
  onActivate: () => void
  onEdit: () => void
  onDelete: () => void
  onExport: () => void
}

export default function WorkspaceCard({ workspace, onActivate, onEdit, onDelete, onExport }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className="flex flex-col rounded-lg p-4 transition-all relative"
      style={{
        background: workspace.isActive ? `${workspace.color}12` : 'var(--color-bg-panel)',
        border: `1px solid ${workspace.isActive ? workspace.color + '50' : 'var(--color-border)'}`,
        boxShadow: workspace.isActive ? `0 0 0 1px ${workspace.color}30` : 'none',
      }}
    >
      {/* Active badge */}
      {workspace.isActive && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-semibold"
          style={{ color: workspace.color }}
        >
          <CheckCircleIcon size={11} />
          当前
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex items-center justify-center rounded-lg shrink-0 text-xl"
          style={{
            width: 40, height: 40,
            background: `${workspace.color}20`,
            border: `1px solid ${workspace.color}40`,
          }}
        >
          {workspace.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate pr-12 text-[14px] text-[var(--color-text-primary)]">
            {workspace.name}
          </h3>
          {workspace.description && (
            <p className="truncate mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
              {workspace.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[11px] text-[var(--color-text-secondary)]">
          {workspace.skillCount} 个技能
        </span>
        {workspace.toolId && (
          <Badge variant="default">{workspace.toolId}</Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {!workspace.isActive ? (
          <button
            onClick={onActivate}
            className="flex-1 py-1.5 rounded-md text-[12px] font-medium cursor-pointer transition-colors border"
            style={{
              background: `${workspace.color}20`,
              borderColor: `${workspace.color}40`,
              color: workspace.color,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${workspace.color}35` }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `${workspace.color}20` }}
          >
            切换
          </button>
        ) : (
          <div
            className="flex-1 py-1.5 rounded-md text-center text-[12px] text-[var(--color-text-placeholder)] bg-[var(--color-bg-surface)] border border-[var(--color-border)]"
          >
            当前工作区
          </div>
        )}

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center justify-center bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-md p-1.5 cursor-pointer text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <MoreHorizontalIcon size={14} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 bottom-9 z-20 py-1 rounded-lg overflow-hidden"
                style={{
                  width: 140,
                  background: 'var(--color-bg-panel)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                }}
              >
                {[
                  { icon: <PencilIcon size={12} />, label: '编辑',       action: onEdit,   danger: false },
                  { icon: <DownloadIcon size={12} />, label: '导出 YAML', action: onExport, danger: false },
                  { icon: <Trash2Icon size={12} />,  label: '删除',       action: onDelete, danger: true  },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { item.action(); setMenuOpen(false) }}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 bg-none border-none cursor-pointer text-[12px] text-left',
                      'hover:bg-[var(--color-bg-surface)] transition-colors',
                      item.danger ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-secondary)]',
                    )}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
