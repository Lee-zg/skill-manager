import { useEffect, useMemo, useState } from 'react'
import { SearchIcon, DownloadIcon, StarIcon, PackageIcon, RefreshCwIcon } from '@/components/icons'
import { invoke } from '@tauri-apps/api/core'
import { useSkillStore } from '@/stores/skillStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItemEl,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface RemoteSkill {
  id: string
  name: string
  description: string
  author: string
  source: string
  stars: number
  installCount: number
  version?: string
  tags: string[]
}

type InstallState = Record<string, 'idle' | 'installing' | 'done' | 'error'>
const CATEGORY_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'development', label: '开发' },
  { id: 'design', label: '设计' },
  { id: 'data', label: '数据' },
  { id: 'automation', label: '自动化' },
  { id: 'writing', label: '写作' },
]

export default function DiscoverPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RemoteSkill[]>([])
  const [searching, setSearching] = useState(false)
  const [installState, setInstallState] = useState<InstallState>({})
  const [installTool, setInstallTool] = useState('claude-code')
  const [category, setCategory] = useState('all')
  const [messages, setMessages] = useState<Record<string, string>>({})
  const { skills, fetchSkills } = useSkillStore()

  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  const installedNames = useMemo(
    () => new Set(skills.map((skill) => skill.name.toLowerCase())),
    [skills],
  )

  const visibleResults = useMemo(() => {
    if (category === 'all') return results
    return results.filter((skill) => skill.tags.some((tag) => tag.toLowerCase().includes(category)))
  }, [category, results])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setSearching(true)
    try {
      const raw = await invoke<any[]>('search_registry_cmd', { query })
      setResults(raw.map((s) => ({
        id: s.id, name: s.name, description: s.description,
        author: s.author, source: s.source,
        stars: s.stars, installCount: s.install_count,
        version: s.version, tags: s.tags ?? [],
      })))
    } finally {
      setSearching(false)
    }
  }

  const handleInstall = async (skill: RemoteSkill) => {
    setInstallState((s) => ({ ...s, [skill.id]: 'installing' }))
    try {
      const result = await invoke<any>('install_skill_cmd', {
        source: skill.source || skill.name,
        toolId: installTool,
      })
      if (result.success) {
        setInstallState((s) => ({ ...s, [skill.id]: 'done' }))
        await fetchSkills()
      } else {
        setInstallState((s) => ({ ...s, [skill.id]: 'error' }))
        setMessages((m) => ({ ...m, [skill.id]: result.message }))
      }
    } catch (err: any) {
      setInstallState((s) => ({ ...s, [skill.id]: 'error' }))
      setMessages((m) => ({ ...m, [skill.id]: String(err) }))
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 shrink-0 border-b border-[var(--color-border)]">
        <h1 className="text-[18px] font-bold text-[var(--color-text-primary)] mb-3">发现技能</h1>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]">
              <SearchIcon size={14} />
            </span>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索技能仓库（如 brandkit、csv-processor...）"
              className="pl-8 h-9 text-[13px]"
            />
          </div>
          <SelectRoot value={installTool} onValueChange={setInstallTool}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItemEl value="claude-code">Claude Code</SelectItemEl>
              <SelectItemEl value="agents">Agents</SelectItemEl>
              <SelectItemEl value="cc-switch">cc-switch</SelectItemEl>
            </SelectContent>
          </SelectRoot>
          <Button type="submit" disabled={searching} size="lg" className="gap-1.5">
            {searching
              ? <RefreshCwIcon size={13} className="animate-spin" />
              : <SearchIcon size={13} />}
            {searching ? '搜索中...' : '搜索'}
          </Button>
        </form>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => setCategory(item.id)}
              className={cn(
                'rounded-full border px-3 py-1 text-[11px] transition-all',
                category === item.id
                  ? 'border-[rgba(99,102,241,0.4)] bg-[var(--color-accent-muted)] text-[var(--color-accent-hover)]'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-panel)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {results.length === 0 && !searching ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <PackageIcon size={32} className="text-[var(--color-text-placeholder)]" />
            <p className="text-[14px] text-[var(--color-text-secondary)]">搜索技能仓库，发现更多工具</p>
            <p className="text-[12px] text-[var(--color-text-placeholder)]">数据来自 skills.sh 官方仓库</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleResults.length === 0 && (
              <p className="py-8 text-center text-[13px] text-[var(--color-text-placeholder)]">
                当前分类下没有匹配结果
              </p>
            )}
            {visibleResults.map((skill) => {
              const installed = installedNames.has(skill.name.toLowerCase())
              const state = installed ? 'done' : (installState[skill.id] ?? 'idle')
              const msg = messages[skill.id]
              return (
                <div
                  key={skill.id}
                  className="p-4 rounded-lg bg-[var(--color-bg-panel)] border border-[var(--color-border)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                          {skill.name}
                        </span>
                        {skill.version && (
                          <span className="text-[10px] text-[var(--color-text-placeholder)]">
                            v{skill.version}
                          </span>
                        )}
                        {skill.tags.slice(0, 3).map((t) => (
                          <Badge key={t} variant="accent">#{t}</Badge>
                        ))}
                      </div>
                      <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mb-2">
                        {skill.description}
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="text-[11px] text-[var(--color-text-placeholder)]">
                          by {skill.author}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-placeholder)]">
                          <StarIcon size={10} /> {skill.stars.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-placeholder)]">
                          ↓ {skill.installCount.toLocaleString()}
                        </span>
                      </div>
                      {msg && (
                        <p
                          className={cn(
                            'text-[11px] mt-1.5',
                            state === 'error' ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]',
                          )}
                        >
                          {msg}
                        </p>
                      )}
                    </div>

                    {/* Install button */}
                    <Button
                      onClick={() => handleInstall(skill)}
                      disabled={state === 'installing' || state === 'done'}
                      variant={
                        state === 'done' ? 'success'
                          : state === 'error' ? 'danger'
                          : 'outline'
                      }
                      size="md"
                      className="shrink-0"
                    >
                      {state === 'installing' && <RefreshCwIcon size={12} className="animate-spin" />}
                      {state === 'done'       && '✓ 已安装'}
                      {state === 'error'      && '安装失败'}
                      {state === 'idle'       && <><DownloadIcon size={12} /> 安装</>}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
