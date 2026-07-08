import { useState } from 'react'
import { MoreHorizontal, CheckCircle, Pencil, Trash2, Download } from 'lucide-react'
import type { Workspace } from '@/stores/workspaceStore'

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
      className="flex flex-col rounded-lg p-4 transition-all"
      style={{
        background: workspace.isActive ? `${workspace.color}12` : 'var(--color-bg-panel)',
        border: `1px solid ${workspace.isActive ? workspace.color + '50' : 'var(--color-border)'}`,
        boxShadow: workspace.isActive ? `0 0 0 1px ${workspace.color}30` : 'none',
        position: 'relative',
      }}
    >
      {/* Active badge */}
      {workspace.isActive && (
        <div className="absolute top-3 right-3 flex items-center gap-1"
          style={{ fontSize: 10, color: workspace.color, fontWeight: 600 }}>
          <CheckCircle size={11} />
          当前
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex items-center justify-center rounded-lg shrink-0"
          style={{ width: 40, height: 40, fontSize: 20,
            background: `${workspace.color}20`, border: `1px solid ${workspace.color}40` }}>
          {workspace.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate pr-12"
            style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>
            {workspace.name}
          </h3>
          {workspace.description && (
            <p className="truncate mt-0.5"
              style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              {workspace.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-4">
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
          {workspace.skillCount} 个技能
        </span>
        {workspace.toolId && (
          <span style={{
            fontSize: 10, padding: '1px 7px',
            background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-full)', color: 'var(--color-text-placeholder)',
          }}>
            {workspace.toolId}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {!workspace.isActive && (
          <button onClick={onActivate}
            className="flex-1 py-1.5 rounded-md transition-colors"
            style={{ background: `${workspace.color}20`, border: `1px solid ${workspace.color}40`,
              color: workspace.color, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${workspace.color}35` }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `${workspace.color}20` }}
          >
            切换
          </button>
        )}
        {workspace.isActive && (
          <div className="flex-1 py-1.5 rounded-md text-center"
            style={{ fontSize: 12, color: 'var(--color-text-placeholder)',
              background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            当前工作区
          </div>
        )}

        {/* Menu */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', padding: '5px 7px', cursor: 'pointer',
              color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center' }}>
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 bottom-9 z-20 py-1 rounded-lg overflow-hidden"
                style={{ width: 140, background: 'var(--color-bg-panel)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                {[
                  { icon: <Pencil size={12} />, label: '编辑', action: onEdit },
                  { icon: <Download size={12} />, label: '导出 YAML', action: onExport },
                  { icon: <Trash2 size={12} />, label: '删除', action: onDelete, danger: true },
                ].map((item) => (
                  <button key={item.label}
                    onClick={() => { item.action(); setMenuOpen(false) }}
                    className="flex items-center gap-2 w-full px-3 py-2 transition-colors"
                    style={{ background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, color: item.danger ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                      textAlign: 'left' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-surface)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
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
