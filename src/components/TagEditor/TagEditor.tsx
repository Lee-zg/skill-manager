import { useState, useRef } from 'react'
import { XIcon, PlusIcon } from '@/components/icons'
import { invoke } from '@tauri-apps/api/core'

interface Props {
  skillId: string
  tags: string[]
  onChanged: (tags: string[]) => void
}

export default function TagEditor({ skillId, tags, onChanged }: Props) {
  const [inputVisible, setInputVisible] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = async (tag: string) => {
    const trimmed = tag.trim().toLowerCase()
    if (!trimmed || tags.includes(trimmed)) return
    await invoke('add_tag_cmd', { skillId, tag: trimmed })
    onChanged([...tags, trimmed])
  }

  const removeTag = async (tag: string) => {
    await invoke('remove_tag_cmd', { skillId, tag })
    onChanged(tags.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      addTag(inputVal)
      setInputVal('')
    }
    if (e.key === 'Escape') {
      setInputVisible(false)
      setInputVal('')
    }
    if (e.key === 'Backspace' && inputVal === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
          style={{
            background: 'var(--color-accent-muted)',
            borderColor: 'rgba(99,102,241,0.3)',
            color: 'var(--color-accent-hover)',
          }}
        >
          #{tag}
          <button
            onClick={() => removeTag(tag)}
            className="flex items-center opacity-60 hover:opacity-100 transition-opacity bg-none border-none p-0 cursor-pointer text-[var(--color-accent)]"
          >
            <XIcon size={9} />
          </button>
        </span>
      ))}

      {inputVisible ? (
        <input
          ref={inputRef}
          autoFocus
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputVal.trim()) addTag(inputVal)
            setInputVisible(false)
            setInputVal('')
          }}
          placeholder="添加标签..."
          className="bg-transparent border-none outline-none text-[11px] text-[var(--color-text-primary)] w-20 py-0.5"
        />
      ) : (
        <button
          onClick={() => setInputVisible(true)}
          className="flex items-center gap-1 rounded-full border border-dashed border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-placeholder)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer bg-none"
        >
          <PlusIcon size={9} /> 标签
        </button>
      )}
    </div>
  )
}
