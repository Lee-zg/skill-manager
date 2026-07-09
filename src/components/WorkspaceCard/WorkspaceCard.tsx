import { useState } from 'react'
import { MoreHorizontalIcon, CheckCircleIcon, PencilIcon, Trash2Icon, DownloadIcon, PlusIcon } from '@/components/icons'
import type { Workspace } from '@/stores/workspaceStore'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Props {
  workspace: Workspace
  onActivate: () => void
  onEdit: () => void
  onDelete: () => void
  onExport: () => void
  onMap: () => void
}

export default function WorkspaceCard({ workspace, onActivate, onEdit, onDelete, onExport, onMap }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className="relative flex flex-col rounded-lg p-5 transition-[transform,border-color,box-shadow,background-color] duration-150 hover:-translate-y-0.5 hover:shadow-sm"
      style={{
        background: workspace.isActive ? `${workspace.color}12` : 'var(--color-bg-panel)',
        border: `1px solid ${workspace.isActive ? workspace.color + '50' : 'var(--color-border)'}`,
        boxShadow: workspace.isActive ? `0 0 0 1px ${workspace.color}30` : 'none',
      }}
    >
      {/* Active badge */}
      {workspace.isActive && (
        <div
          className="absolute right-3 top-3 flex items-center gap-1 text-[12px] font-semibold"
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
          <h3 className="truncate pr-12 text-[17px] font-semibold text-[var(--color-text-primary)]">
            {workspace.name}
          </h3>
          {workspace.description && (
            <p className="mt-1 truncate text-[14px] text-[var(--color-text-secondary)]">
              {workspace.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[14px] text-[var(--color-text-secondary)]">
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
            className="h-10 flex-1 cursor-pointer rounded-md border text-[14px] font-medium transition-[transform,background-color,border-color] duration-150 hover:-translate-y-0.5 active:scale-[0.98]"
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
            className="flex h-10 flex-1 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-center text-[14px] text-[var(--color-text-placeholder)]"
          >
            当前工作区
          </div>
        )}

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] transition-[transform,background-color,color] duration-150 hover:-translate-y-0.5 hover:text-[var(--color-text-primary)] active:scale-[0.98]"
          >
            <MoreHorizontalIcon size={14} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 bottom-9 z-20 py-1 rounded-lg overflow-hidden"
                style={{
                  width: 160,
                  background: 'var(--color-bg-panel)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                }}
              >
                {[
                  { icon: <PencilIcon size={12} />, label: '编辑',       action: onEdit,   danger: false },
                  { icon: <DownloadIcon size={12} />, label: '导出 YAML', action: onExport, danger: false },
                  { icon: <PlusIcon size={12} />, label: '添加映射', action: onMap, danger: false },
                  { icon: <Trash2Icon size={12} />,  label: '删除',       action: onDelete, danger: true  },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { item.action(); setMenuOpen(false) }}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-3 py-2.5 text-left text-[14px]',
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
