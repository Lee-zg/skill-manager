import { useEffect, useRef, useState } from 'react'
import { SearchIcon, LayersIcon, LayoutGridIcon, CompassIcon, RefreshCwIcon, TerminalIcon } from '@/components/icons'
import { useNavigate } from 'react-router-dom'
import { useSkillStore } from '@/stores/skillStore'
import { cn } from '@/lib/utils'

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
      queueMicrotask(() => {
        setQuery('')
        setSelected(0)
        inputRef.current?.focus()
      })
    }
  }, [open])

  const staticCommands: Command[] = [
    {
      id: 'nav-skills', label: '打开技能库', icon: <LayersIcon size={14} />,
      action: () => { navigate('/skills'); onClose() }, group: '导航',
    },
    {
      id: 'nav-workspaces', label: '打开工作区', icon: <LayoutGridIcon size={14} />,
      action: () => { navigate('/workspaces'); onClose() }, group: '导航',
    },
    {
      id: 'nav-discover', label: '发现新技能', icon: <CompassIcon size={14} />,
      action: () => { navigate('/discover'); onClose() }, group: '导航',
    },
    {
      id: 'nav-invocations', label: '打开配置映射', icon: <TerminalIcon size={14} />,
      action: () => { navigate('/invocations'); onClose() }, group: '导航',
    },
    {
      id: 'scan', label: '扫描本地技能', description: '重新扫描并更新已安装技能',
      icon: <RefreshCwIcon size={14} />,
      action: async () => { onClose(); await scanSkills() }, group: '操作',
    },
  ]

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
          icon: (
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ background: s.enabled ? 'var(--color-success)' : 'var(--color-text-placeholder)' }}
            />
          ),
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

  useEffect(() => {
    queueMicrotask(() => setSelected(0))
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
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
        className="glass-panel flex flex-col overflow-hidden rounded-[var(--radius-lg)]"
        style={{ width: 600, maxHeight: 460 }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
          <SearchIcon size={15} className="text-[var(--color-text-placeholder)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索技能、导航、操作..."
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)]"
          />
          <kbd className="text-[10px] text-[var(--color-text-placeholder)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 py-1">
          {flat.length === 0 ? (
            <p className="text-center text-[var(--color-text-placeholder)] text-[13px] py-6">
              无匹配结果
            </p>
          ) : (
            Object.entries(grouped).map(([group, cmds]) => {
              const groupStartIdx = flat.indexOf(cmds[0])
              return (
                <div key={group}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-placeholder)] px-3.5 pt-2 pb-0.5">
                    {group}
                  </p>
                  {cmds.map((cmd, i) => {
                    const idx = groupStartIdx + i
                    const active = idx === selected
                    return (
                      <button
                        key={cmd.id}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelected(idx)}
                        className={cn(
                          'flex items-center gap-3 w-full px-4 py-2.5 border-none cursor-pointer text-left transition-colors',
                          active
                            ? 'bg-[var(--color-accent-muted)] text-[var(--color-text-primary)]'
                            : 'bg-transparent text-[var(--color-text-secondary)]',
                        )}
                      >
                        <span className={cn(
                          'shrink-0 flex items-center',
                          active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-placeholder)]',
                        )}>
                          {cmd.icon}
                        </span>
                        <span className="flex-1 text-[13px]">{cmd.label}</span>
                        {cmd.description && (
                          <span className="text-[11px] text-[var(--color-text-placeholder)]">
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

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-2 border-t border-[var(--color-border)]">
          {(['↑↓ 导航', '↵ 确认', 'ESC 关闭'] as const).map((hint) => (
            <span key={hint} className="text-[10px] text-[var(--color-text-placeholder)]">{hint}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
