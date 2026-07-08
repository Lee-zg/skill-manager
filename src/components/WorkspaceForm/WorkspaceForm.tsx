import { useState } from 'react'
import { X } from 'lucide-react'
import type { Workspace } from '@/stores/workspaceStore'

const COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
  '#ec4899', '#14b8a6', '#8b5cf6', '#06b6d4',
]
const ICONS = ['🔲', '🎯', '⚡', '🚀', '🎨', '📊', '🔧', '🌐', '💡', '🛡️']

interface Props {
  initial?: Workspace
  onSave: (data: { name: string; description?: string; toolId?: string; color: string; icon: string }) => Promise<void>
  onClose: () => void
}

export default function WorkspaceForm({ initial, onSave, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [toolId, setToolId] = useState(initial?.toolId ?? '')
  const [color, setColor] = useState(initial?.color ?? '#6366f1')
  const [icon, setIcon] = useState(initial?.icon ?? '🔲')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('请输入工作区名称'); return }
    setSaving(true)
    try {
      await onSave({ name: name.trim(), description: description.trim() || undefined,
        toolId: toolId.trim() || undefined, color, icon })
      onClose()
    } catch (err: any) {
      setError(err.toString())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="glass-panel flex flex-col"
        style={{ width: 440, borderRadius: 'var(--radius-lg)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {initial ? '编辑工作区' : '创建工作区'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Name */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em' }}>名称 *</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="例如：前端开发"
              style={{ width: '100%', marginTop: 6, background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)', fontSize: 13, padding: '7px 10px', outline: 'none' }} />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em' }}>描述</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="可选说明"
              style={{ width: '100%', marginTop: 6, background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)', fontSize: 13, padding: '7px 10px', outline: 'none' }} />
          </div>

          {/* Tool */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em' }}>关联工具</label>
            <select value={toolId} onChange={(e) => setToolId(e.target.value)}
              style={{ width: '100%', marginTop: 6, background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)', fontSize: 13, padding: '7px 10px' }}>
              <option value="">不限工具</option>
              <option value="claude-code">Claude Code</option>
              <option value="agents">Agents</option>
              <option value="cc-switch">cc-switch</option>
            </select>
          </div>

          {/* Color */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em' }}>颜色</label>
            <div className="flex gap-2 mt-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="rounded-full transition-transform"
                  style={{ width: 22, height: 22, background: c, border: 'none', cursor: 'pointer',
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                    transform: color === c ? 'scale(1.2)' : 'scale(1)' }} />
              ))}
            </div>
          </div>

          {/* Icon */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em' }}>图标</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {ICONS.map((ic) => (
                <button key={ic} type="button" onClick={() => setIcon(ic)}
                  style={{ fontSize: 18, background: icon === ic ? `${color}25` : 'var(--color-bg-surface)',
                    border: `1px solid ${icon === ic ? color + '60' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-md)', padding: '4px 6px', cursor: 'pointer' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ fontSize: 11, color: 'var(--color-danger)' }}>{error}</p>}

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              style={{ flex: 1, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)',
                fontSize: 13, padding: '8px', cursor: 'pointer' }}>
              取消
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, background: saving ? `${color}80` : color, border: 'none',
                borderRadius: 'var(--radius-md)', color: '#fff',
                fontSize: 13, fontWeight: 600, padding: '8px', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? '保存中...' : (initial ? '保存更改' : '创建工作区')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
