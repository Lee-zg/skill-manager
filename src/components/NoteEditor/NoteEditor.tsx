import { useState, useRef } from 'react'
import { Pencil, Check } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'

interface Props {
  skillId: string
  note?: string
  onChanged: (note: string) => void
}

export default function NoteEditor({ skillId, note, onChanged }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(note ?? '')
  const ref = useRef<HTMLTextAreaElement>(null)

  const save = async () => {
    await invoke('upsert_note_cmd', { skillId, content: value })
    onChanged(value)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div
        onClick={() => { setEditing(true); setTimeout(() => ref.current?.focus(), 50) }}
        className="flex flex-col gap-1 rounded cursor-pointer group"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 10px', minHeight: 60,
          transition: 'border-color var(--duration-fast)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
      >
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 10, color: 'var(--color-text-placeholder)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            备注
          </span>
          <Pencil size={10} style={{ color: 'var(--color-text-placeholder)', opacity: 0 }}
            className="group-hover:opacity-100 transition-opacity" />
        </div>
        <p style={{
          fontSize: 12, color: value ? 'var(--color-text-secondary)' : 'var(--color-text-placeholder)',
          lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap',
        }}>
          {value || '点击添加备注...'}
        </p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setValue(note ?? ''); setEditing(false) }
          if (e.key === 'Enter' && e.metaKey) save()
        }}
        rows={4}
        placeholder="添加备注... (⌘+Enter 保存, Esc 取消)"
        style={{
          width: '100%', resize: 'vertical',
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-accent)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-primary)',
          fontSize: 12, lineHeight: 1.6,
          padding: '8px 10px', outline: 'none',
        }}
      />
      <button
        onClick={save}
        style={{
          position: 'absolute', bottom: 8, right: 8,
          background: 'var(--color-accent)', border: 'none', borderRadius: 'var(--radius-sm)',
          color: '#fff', cursor: 'pointer', padding: '3px 8px',
          fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <Check size={11} /> 保存
      </button>
    </div>
  )
}
