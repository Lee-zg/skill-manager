import { useEffect, useRef, useState } from 'react'
import { Search, Layers, LayoutGrid, Compass, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSkillStore } from '@/stores/skillStore'

interface Command {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  action: () => void
  group: string
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { skills, setSearchQuery, scanSkills, setSelectedSkill } = useSkillStore()

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const staticCommands: Command[] = [
    {
      id: 'nav-skills', label: '打开技能库', icon: <Layers size={14} />,
      action: () => { navigate('/skills'); onClose() }, group: '导航',
    },
    {
      id: 'nav-workspaces', label: '打开工作区', icon: <LayoutGrid size={14} />,
      action: () => { navigate('/workspaces'); onClose() }, group: '导航',
    },
    {
      id: 'nav-discover', label: '发现新技能', icon: <Compass size={14} />,
      action: () => { navigate('/discover'); onClose() }, group: '导航',
    },
    {
      id: 'scan', label: '扫描本地技能', description: '重新扫描并更新已安装技能',
      icon: <RefreshCw size={14} />,
      action: async () => { onClose(); await scanSkills() }, group: '操作',
    },
  ]

  // Dynamic skill commands from search
  const skillCommands: Command[] = query.length >= 2
    ? skills
        .filter((s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.tags.some((t) => t.includes(query.toLowerCase()))
        )
        .slice(0, 5)
        .map((s) => ({
          id: `skill-${s.id}`,
          label: s.name,
          description: s.toolId,
          icon: <span style={{ fontSize: 13 }}>{s.enabled ? '●' : '○'}</span>,
          action: () => {
            navigate('/skills')
            setSearchQuery(s.name)
            setSelectedSkill(s)
            onClose()
          },
          group: '技能',
        }))
    : []

  const filteredStatic = query
    ? staticCommands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          (c.description?.toLowerCase().includes(query.toLowerCase()) ?? false)
      )
    : staticCommands

  const allCommands = [...skillCommands, ...filteredStatic]
  const grouped = allCommands.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = []
    acc[cmd.group].push(cmd)
    return acc
  }, {})

  const flat = Object.values(grouped).flat()

  useEffect(() => { setSelected(0) }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && flat[selected]) flat[selected].action()
    if (e.key === 'Escape') onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="glass-panel flex flex-col overflow-hidden"
        style={{ width: 600, maxHeight: 460, borderRadius: 'var(--radius-lg)' }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Search size={15} style={{ color: 'var(--color-text-placeholder)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索技能、导航、操作..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 14, color: 'var(--color-text-primary)',
            }}
          />
          <kbd style={{ fontSize: 10, color: 'var(--color-text-placeholder)',
            background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
            borderRadius: 4, padding: '1px 5px' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 py-1">
          {flat.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-placeholder)',
              fontSize: 13, padding: '24px 0' }}>无匹配结果</p>
          ) : (
            Object.entries(grouped).map(([group, cmds]) => {
              const groupStartIdx = flat.indexOf(cmds[0])
              return (
                <div key={group}>
                  <p style={{ fontSize: 10, color: 'var(--color-text-placeholder)', padding: '8px 14px 2px',
                    textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                    {group}
                  </p>
                  {cmds.map((cmd, i) => {
                    const idx = groupStartIdx + i
                    return (
                      <button
                        key={cmd.id}
                        onClick={cmd.action}
                        className="flex items-center gap-3 w-full px-4 py-2.5 transition-colors"
                        style={{
                          background: idx === selected ? 'var(--color-accent-muted)' : 'transparent',
                          border: 'none', cursor: 'pointer', textAlign: 'left',
                          color: idx === selected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                        }}
                        onMouseEnter={() => setSelected(idx)}
                      >
                        <span style={{ color: idx === selected ? 'var(--color-accent)' : 'var(--color-text-placeholder)', flexShrink: 0 }}>
                          {cmd.icon}
                        </span>
                        <span style={{ flex: 1, fontSize: 13 }}>{cmd.label}</span>
                        {cmd.description && (
                          <span style={{ fontSize: 11, color: 'var(--color-text-placeholder)' }}>
                            {cmd.description}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-end gap-3 px-4 py-2"
          style={{ borderTop: '1px solid var(--color-border)' }}>
          {(['↑↓ 导航', '↵ 确认', 'ESC 关闭'] as const).map((hint) => (
            <span key={hint} style={{ fontSize: 10, color: 'var(--color-text-placeholder)' }}>{hint}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
