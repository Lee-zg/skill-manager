import { PencilIcon, CheckIcon } from '@/components/icons'
import { useState, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'

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
        className="group flex flex-col gap-1 rounded-md cursor-pointer transition-colors duration-150 p-2.5 min-h-[60px]"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-placeholder)]">
            备注
          </span>
          <PencilIcon
            size={10}
            className="text-[var(--color-text-placeholder)] opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
        <p
          className="text-[12px] leading-relaxed m-0 whitespace-pre-wrap"
          style={{ color: value ? 'var(--color-text-secondary)' : 'var(--color-text-placeholder)' }}
        >
          {value || '点击添加备注...'}
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
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
        className="w-full resize-y rounded-md text-[12px] leading-relaxed p-2.5 outline-none"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-accent)',
          color: 'var(--color-text-primary)',
          fontFamily: 'inherit',
        }}
      />
      <Button
        onClick={save}
        size="sm"
        className="absolute bottom-2 right-2 gap-1"
      >
        <CheckIcon size={11} />
        保存
      </Button>
    </div>
  )
}
