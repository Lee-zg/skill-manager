import { useEffect, useState } from 'react'
import { PlusIcon, Trash2Icon, ExternalLinkIcon, ToggleLeftIcon, ToggleRightIcon } from '@/components/icons'
import { useRepoStore } from '@/stores/repoStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItemEl,
} from '@/components/ui/select'

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
    try {
      await addRepo(form)
      setShowForm(false)
      setForm({ name: '', url: '', repoType: 'registry', branch: 'main', skillsDir: 'skills/', priority: 10 })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-[18px] font-bold text-[var(--color-text-primary)]">仓库管理</h1>
          <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">配置技能来源仓库</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="md">
          <PlusIcon size={13} /> 添加仓库
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
        {/* Add form */}
        {showForm && (
          <form
            onSubmit={handleAdd}
            className="p-4 rounded-lg flex flex-col gap-3 border border-[var(--color-accent)] bg-[var(--color-bg-panel)]"
          >
            <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)] m-0">添加仓库</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '名称', key: 'name', placeholder: '我的技能库' },
                { label: 'URL', key: 'url', placeholder: 'https://github.com/owner/skills' },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-[var(--color-text-secondary)]">{label}</label>
                  <Input
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="h-8 text-[12px]"
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-[var(--color-text-secondary)]">类型</label>
                <SelectRoot value={form.repoType} onValueChange={(v) => setForm({ ...form, repoType: v })}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPO_TYPES.map((t) => (
                      <SelectItemEl key={t.value} value={t.value}>{t.label}</SelectItemEl>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-[var(--color-text-secondary)]">优先级</label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: +e.target.value })}
                  className="h-8 text-[12px]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="md" className="flex-1" onClick={() => setShowForm(false)}>
                取消
              </Button>
              <Button type="submit" disabled={saving} size="md" className="flex-1">
                {saving ? '添加中...' : '添加'}
              </Button>
            </div>
          </form>
        )}

        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-placeholder)]">
          内置仓库
        </p>
        {[
          { name: 'skills.sh 官方', url: 'https://registry.skills.sh', type: 'registry', builtin: true },
          { name: 'NPM', url: 'https://registry.npmjs.org', type: 'npm', builtin: true },
        ].map((r) => (
          <RepoRow key={r.url} name={r.name} url={r.url} type={r.type}
            enabled builtin onToggle={() => {}} onDelete={() => {}} />
        ))}

        {repos.length > 0 && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-placeholder)] mt-2">
              自定义仓库
            </p>
            {repos.map((r) => (
              <RepoRow
                key={r.id}
                name={r.name} url={r.url} type={r.repoType}
                enabled={r.enabled}
                onToggle={(v) => toggleRepo(r.id, v)}
                onDelete={async () => {
                  if (confirm(`确认删除仓库 "${r.name}"？`)) await deleteRepo(r.id)
                }}
              />
            ))}
          </>
        )}

        {repos.length === 0 && !showForm && (
          <p className="text-[13px] text-[var(--color-text-placeholder)] text-center mt-6">
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
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg-panel)] border border-[var(--color-border)]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[var(--color-text-primary)]">{name}</span>
          <Badge variant="default">{type}</Badge>
          {builtin && <span className="text-[10px] text-[var(--color-accent)]">内置</span>}
        </div>
        <p className="truncate text-[11px] text-[var(--color-text-placeholder)] mt-0.5">{url}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!builtin && (
          <>
            <button
              onClick={() => onToggle(!enabled)}
              className="bg-none border-none cursor-pointer transition-colors"
              style={{ color: enabled ? 'var(--color-success)' : 'var(--color-text-placeholder)' }}
              aria-label={enabled ? '禁用' : '启用'}
            >
              {enabled ? <ToggleRightIcon size={18} /> : <ToggleLeftIcon size={18} />}
            </button>
            <button
              onClick={onDelete}
              className="bg-none border-none cursor-pointer text-[var(--color-danger)] opacity-70 hover:opacity-100 transition-opacity"
              aria-label="删除"
            >
              <Trash2Icon size={14} />
            </button>
          </>
        )}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--color-text-placeholder)] hover:text-[var(--color-text-secondary)] transition-colors flex items-center"
        >
          <ExternalLinkIcon size={13} />
        </a>
      </div>
    </div>
  )
}
