import { useState } from 'react'
import { XIcon } from '@/components/icons'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  SelectRoot, SelectTrigger, SelectValue,
  SelectContent, SelectItemEl,
} from '@/components/ui/select'
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
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        toolId: toolId || undefined,
        color,
        icon,
      })
      onClose()
    } catch (err: any) {
      setError(err.toString())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div className="glass-panel flex flex-col rounded-[var(--radius-lg)]" style={{ width: 440 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
            {initial ? '编辑工作区' : '创建工作区'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭">
            <XIcon size={16} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
              名称 *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：前端开发"
              className="h-9 text-[13px]"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
              描述
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选说明"
              className="h-9 text-[13px]"
            />
          </div>

          {/* Tool */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
              关联工具
            </label>
            <SelectRoot value={toolId || '__none__'} onValueChange={(v) => setToolId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItemEl value="__none__">不限工具</SelectItemEl>
                <SelectItemEl value="claude-code">Claude Code</SelectItemEl>
                <SelectItemEl value="agents">Agents</SelectItemEl>
                <SelectItemEl value="cc-switch">cc-switch</SelectItemEl>
              </SelectContent>
            </SelectRoot>
          </div>

          {/* Color */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
              颜色
            </label>
            <div className="flex gap-2 mt-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="rounded-full transition-transform border-none cursor-pointer"
                  style={{
                    width: 22, height: 22, background: c,
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                    transform: color === c ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
              图标
            </label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className="rounded-md text-[18px] px-1.5 py-1 cursor-pointer transition-colors"
                  style={{
                    background: icon === ic ? `${color}25` : 'var(--color-bg-surface)',
                    border: `1px solid ${icon === ic ? color + '60' : 'var(--color-border)'}`,
                  }}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-[11px] text-[var(--color-danger)]">{error}</p>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={onClose}>
              取消
            </Button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-md text-[13px] font-semibold text-white py-2 cursor-pointer transition-opacity disabled:opacity-60 disabled:cursor-not-allowed border-none"
              style={{ background: color }}
            >
              {saving ? '保存中...' : (initial ? '保存更改' : '创建工作区')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
