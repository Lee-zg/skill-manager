import { useEffect, useState } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react'
import { useRepoStore } from '@/stores/repoStore'

const REPO_TYPES = [
  { value: 'registry', label: 'Registry (HTTP)' },
  { value: 'git',      label: 'Git 仓库' },
  { value: 'local',    label: '本地路径' },
]

export default function ReposPage() {
  const { repos, fetchRepos, addRepo, toggleRepo, deleteRepo } = useRepoStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', url: '', repoType: 'registry',
    branch: 'main', skillsDir: 'skills/', priority: 10,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchRepos() }, [fetchRepos])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.url.trim()) return
    setSaving(true)
    try { await addRepo(form); setShowForm(false); setForm({ name: '', url: '', repoType: 'registry', branch: 'main', skillsDir: 'skills/', priority: 10 }) }
    finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>仓库管理</h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            配置技能来源仓库
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md"
          style={{ background: 'var(--color-accent)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={13} /> 添加仓库
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
        {/* Add form */}
        {showForm && (
          <form onSubmit={handleAdd} className="p-4 rounded-lg flex flex-col gap-3"
            style={{ background: 'var(--color-bg-panel)', border: '1px solid var(--color-accent)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>添加仓库</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '名称', key: 'name', placeholder: '我的技能库' },
                { label: 'URL', key: 'url', placeholder: 'https://github.com/owner/skills' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{label}</label>
                  <input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder} style={{ width: '100%', marginTop: 4,
                      background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)',
                      fontSize: 12, padding: '6px 9px', outline: 'none' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>类型</label>
                <select value={form.repoType} onChange={(e) => setForm({ ...form, repoType: e.target.value })}
                  style={{ width: '100%', marginTop: 4, background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-secondary)', fontSize: 12, padding: '6px 9px' }}>
                  {REPO_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>优先级</label>
                <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: +e.target.value })}
                  style={{ width: '100%', marginTop: 4, background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)', fontSize: 12, padding: '6px 9px', outline: 'none' }} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                style={{ flex: 1, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)', fontSize: 12, padding: '7px', cursor: 'pointer' }}>
                取消
              </button>
              <button type="submit" disabled={saving}
                style={{ flex: 1, background: 'var(--color-accent)', border: 'none',
                  borderRadius: 'var(--radius-md)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '7px', cursor: 'pointer' }}>
                {saving ? '添加中...' : '添加'}
              </button>
            </div>
          </form>
        )}

        {/* Built-in repos */}
        <p style={{ fontSize: 10, color: 'var(--color-text-placeholder)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          内置仓库
        </p>
        {[
          { name: 'skills.sh 官方', url: 'https://registry.skills.sh', type: 'registry', builtin: true },
          { name: 'NPM', url: 'https://registry.npmjs.org', type: 'npm', builtin: true },
        ].map((r) => (
          <RepoRow key={r.url} name={r.name} url={r.url} type={r.type}
            enabled builtin onToggle={() => {}} onDelete={() => {}} />
        ))}

        {/* User repos */}
        {repos.length > 0 && (
          <>
            <p style={{ fontSize: 10, color: 'var(--color-text-placeholder)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginTop: 8 }}>
              自定义仓库
            </p>
            {repos.map((r) => (
              <RepoRow key={r.id} name={r.name} url={r.url} type={r.repoType}
                enabled={r.enabled}
                onToggle={(v) => toggleRepo(r.id, v)}
                onDelete={async () => { if (confirm(`确认删除仓库 "${r.name}"？`)) await deleteRepo(r.id) }} />
            ))}
          </>
        )}

        {repos.length === 0 && !showForm && (
          <p style={{ color: 'var(--color-text-placeholder)', fontSize: 13, textAlign: 'center', marginTop: 24 }}>
            暂无自定义仓库，点击「添加仓库」配置私有技能库
          </p>
        )}
      </div>
    </div>
  )
}

function RepoRow({ name, url, type, enabled, builtin, onToggle, onDelete }: {
  name: string; url: string; type: string
  enabled: boolean; builtin?: boolean
  onToggle: (v: boolean) => void; onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg"
      style={{ background: 'var(--color-bg-panel)', border: '1px solid var(--color-border)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{name}</span>
          <span style={{ fontSize: 10, padding: '1px 6px', background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)',
            color: 'var(--color-text-placeholder)' }}>{type}</span>
          {builtin && <span style={{ fontSize: 10, color: 'var(--color-accent)' }}>内置</span>}
        </div>
        <p className="truncate" style={{ fontSize: 11, color: 'var(--color-text-placeholder)', marginTop: 2 }}>{url}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!builtin && (
          <>
            <button onClick={() => onToggle(!enabled)} style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: enabled ? 'var(--color-success)' : 'var(--color-text-placeholder)' }}>
              {enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            </button>
            <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-danger)', opacity: 0.7 }}>
              <Trash2 size={14} />
            </button>
          </>
        )}
        <a href={url} target="_blank" rel="noreferrer"
          style={{ color: 'var(--color-text-placeholder)', display: 'flex' }}>
          <ExternalLink size={13} />
        </a>
      </div>
    </div>
  )
}
