import { useState } from 'react'
import { Search, Download, Star, Package, RefreshCw } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { useSkillStore } from '@/stores/skillStore'

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

interface InstallState {
  [skillId: string]: 'idle' | 'installing' | 'done' | 'error'
}

export default function DiscoverPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RemoteSkill[]>([])
  const [searching, setSearching] = useState(false)
  const [installState, setInstallState] = useState<InstallState>({})
  const [installTool, setInstallTool] = useState('claude-code')
  const [messages, setMessages] = useState<Record<string, string>>({})
  const { fetchSkills } = useSkillStore()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setSearching(true)
    try {
      const raw = await invoke<any[]>('search_registry_cmd', { query })
      const skills: RemoteSkill[] = raw.map((s) => ({
        id: s.id, name: s.name, description: s.description,
        author: s.author, source: s.source,
        stars: s.stars, installCount: s.install_count,
        version: s.version,
        tags: s.tags ?? [],
      }))
      setResults(skills)
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
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 12 }}>
          发现技能
        </h1>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 px-3 rounded-md"
            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', height: 36 }}>
            <Search size={14} style={{ color: 'var(--color-text-placeholder)', flexShrink: 0 }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索技能仓库（如 brandkit、csv-processor...）"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 13, color: 'var(--color-text-primary)' }} />
          </div>
          {/* Tool selector */}
          <select value={installTool} onChange={(e) => setInstallTool(e.target.value)}
            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)',
              fontSize: 12, height: 36, padding: '0 10px' }}>
            <option value="claude-code">Claude Code</option>
            <option value="agents">Agents</option>
            <option value="cc-switch">cc-switch</option>
          </select>
          <button type="submit" disabled={searching}
            className="flex items-center gap-1.5 px-4 rounded-md"
            style={{ height: 36, background: 'var(--color-accent)', border: 'none',
              color: '#fff', fontSize: 12, fontWeight: 600, cursor: searching ? 'not-allowed' : 'pointer',
              opacity: searching ? 0.7 : 1 }}>
            {searching ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={13} />}
            {searching ? '搜索中...' : '搜索'}
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6">
        {results.length === 0 && !searching ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Package size={32} style={{ color: 'var(--color-text-placeholder)' }} />
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
              搜索技能仓库，发现更多工具
            </p>
            <p style={{ color: 'var(--color-text-placeholder)', fontSize: 12 }}>
              数据来自 skills.sh 官方仓库
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {results.map((skill) => {
              const state = installState[skill.id] ?? 'idle'
              const msg = messages[skill.id]
              return (
                <div key={skill.id} className="p-4 rounded-lg"
                  style={{ background: 'var(--color-bg-panel)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {skill.name}
                        </span>
                        {skill.version && (
                          <span style={{ fontSize: 10, color: 'var(--color-text-placeholder)' }}>
                            v{skill.version}
                          </span>
                        )}
                        {skill.tags.slice(0, 3).map((t) => (
                          <span key={t} style={{ fontSize: 10, padding: '1px 6px',
                            background: 'var(--color-accent-muted)', border: '1px solid rgba(99,102,241,0.3)',
                            borderRadius: 'var(--radius-full)', color: 'var(--color-accent-hover)' }}>
                            #{t}
                          </span>
                        ))}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>
                        {skill.description}
                      </p>
                      <div className="flex items-center gap-4">
                        <span style={{ fontSize: 11, color: 'var(--color-text-placeholder)' }}>
                          by {skill.author}
                        </span>
                        <span className="flex items-center gap-1"
                          style={{ fontSize: 11, color: 'var(--color-text-placeholder)' }}>
                          <Star size={10} /> {skill.stars.toLocaleString()}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-placeholder)' }}>
                          ↓ {skill.installCount.toLocaleString()}
                        </span>
                      </div>
                      {msg && (
                        <p style={{ fontSize: 11, color: state === 'error' ? 'var(--color-danger)' : 'var(--color-success)', marginTop: 6 }}>
                          {msg}
                        </p>
                      )}
                    </div>
                    {/* Install button */}
                    <button
                      onClick={() => handleInstall(skill)}
                      disabled={state === 'installing' || state === 'done'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md shrink-0"
                      style={{
                        background: state === 'done' ? 'var(--color-success)' + '20'
                          : state === 'error' ? 'var(--color-danger)' + '20'
                          : 'var(--color-accent-muted)',
                        border: `1px solid ${state === 'done' ? 'var(--color-success)' + '40'
                          : state === 'error' ? 'var(--color-danger)' + '40'
                          : 'rgba(99,102,241,0.3)'}`,
                        color: state === 'done' ? 'var(--color-success)'
                          : state === 'error' ? 'var(--color-danger)'
                          : 'var(--color-accent)',
                        fontSize: 12, fontWeight: 500, cursor: state === 'installing' || state === 'done' ? 'not-allowed' : 'pointer',
                      }}>
                      {state === 'installing' && <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                      {state === 'done' && '✓ 已安装'}
                      {state === 'error' && '安装失败'}
                      {state === 'idle' && <><Download size={12} /> 安装</>}
                    </button>
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
