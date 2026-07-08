import { useState, useRef } from 'react'
import { X, Plus } from 'lucide-react'
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
          className="flex items-center gap-1"
          style={{
            fontSize: 11, padding: '2px 6px 2px 8px',
            background: 'var(--color-accent-muted)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 'var(--radius-full)',
            color: 'var(--color-accent-hover)',
          }}
        >
          #{tag}
          <button
            onClick={() => removeTag(tag)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--color-accent)', opacity: 0.6, display: 'flex', alignItems: 'center' }}
          >
            <X size={9} />
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
          style={{
            background: 'none', border: 'none', outline: 'none',
            fontSize: 11, color: 'var(--color-text-primary)',
            width: 80, padding: '2px 0',
          }}
        />
      ) : (
        <button
          onClick={() => setInputVisible(true)}
          className="flex items-center gap-1"
          style={{
            background: 'none', border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-full)', cursor: 'pointer',
            padding: '2px 7px', fontSize: 10,
            color: 'var(--color-text-placeholder)',
          }}
        >
          <Plus size={9} /> 标签
        </button>
      )}
    </div>
  )
}
