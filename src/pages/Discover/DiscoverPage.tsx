import { useEffect, useMemo, useState } from 'react'
import { SearchIcon, DownloadIcon, PackageIcon, RefreshCwIcon } from '@/components/icons'
import { useSkillStore } from '@/stores/skillStore'
import { useMarketStore, type MarketSkill } from '@/stores/marketStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useTargetStore } from '@/stores/targetStore'
import { useRepoStore } from '@/stores/repoStore'
import { previewInstall } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItemEl,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type InstallState = Record<string, 'idle' | 'installing' | 'done' | 'error'>

interface InstallDraft {
  toolId: string
  alias: string
  categoryId: string
  workspaceId: string
}

const DEFAULT_REPOSITORY_SOURCE = 'all'
const BUILTIN_SKILLS_SH_SOURCE = 'builtin-skills-sh'
const SEARCH_DEBOUNCE_MS = 250

export default function DiscoverPage() {
  const [query, setQuery] = useState('')
  const [sourceId, setSourceId] = useState(DEFAULT_REPOSITORY_SOURCE)
  const [expandedInstallId, setExpandedInstallId] = useState('')
  const [installState, setInstallState] = useState<InstallState>({})
  const [installDrafts, setInstallDrafts] = useState<Record<string, InstallDraft>>({})
  const [messages, setMessages] = useState<Record<string, string>>({})
  const { skills, fetchSkills } = useSkillStore()
  const { results, loading: searching, error, searchMarket, installMarketSkill } = useMarketStore()
  const { categories, fetchCategories } = useCategoryStore()
  const { workspaces, fetchWorkspaces } = useWorkspaceStore()
  const { targets, fetchTargets } = useTargetStore()
  const { repos, fetchRepos } = useRepoStore()

  useEffect(() => {
    fetchSkills()
    fetchCategories()
    fetchWorkspaces()
    fetchTargets()
    fetchRepos()
  }, [fetchCategories, fetchRepos, fetchSkills, fetchTargets, fetchWorkspaces])

  const defaultToolId = targets[0]?.toolId ?? 'claude-code'
  const sourceOptions = useMemo(() => [
    { id: DEFAULT_REPOSITORY_SOURCE, label: '全部来源', description: '所有已启用仓库' },
    { id: BUILTIN_SKILLS_SH_SOURCE, label: 'skills.sh 官方', description: '官方 registry' },
    ...repos
      .filter((repo) => repo.enabled)
      .map((repo) => ({ id: repo.id, label: repo.name, description: repo.repoType })),
  ], [repos])

  useEffect(() => {
    if (!sourceOptions.some((source) => source.id === sourceId)) {
      setSourceId(DEFAULT_REPOSITORY_SOURCE)
    }
  }, [sourceId, sourceOptions])

  const installedNames = useMemo(
    () => new Set(skills.map((skill) => skill.name.toLowerCase())),
    [skills],
  )

  const currentRepositoryIds = useMemo(
    () => sourceId === DEFAULT_REPOSITORY_SOURCE ? undefined : [sourceId],
    [sourceId],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void searchMarket({ query, repositoryIds: currentRepositoryIds })
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [currentRepositoryIds, query, searchMarket])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    await searchMarket({ query, repositoryIds: currentRepositoryIds })
  }

  const getDraft = (skillId: string): InstallDraft => installDrafts[skillId] ?? {
    toolId: defaultToolId,
    alias: '',
    categoryId: '',
    workspaceId: '',
  }

  const updateDraft = (skillId: string, patch: Partial<InstallDraft>) => {
    setInstallDrafts((state) => ({
      ...state,
      [skillId]: { ...getDraft(skillId), ...patch },
    }))
  }

  const openInstallConfig = (skill: MarketSkill) => {
    setExpandedInstallId((current) => current === skill.id ? '' : skill.id)
    setInstallDrafts((state) => ({
      ...state,
      [skill.id]: state[skill.id] ?? {
        toolId: defaultToolId,
        alias: '',
        categoryId: '',
        workspaceId: '',
      },
    }))
  }

  const handleInstall = async (skill: MarketSkill) => {
    const draft = getDraft(skill.id)
    setInstallState((state) => ({ ...state, [skill.id]: 'installing' }))
    try {
      if (skill.repoType !== 'registry') {
        const preview = await previewInstall({
          source: skill.installSource,
          targets: [{ target: draft.toolId, alias: draft.alias || undefined }],
          categoryIds: draft.categoryId ? [draft.categoryId] : [],
          workspaceId: draft.workspaceId || undefined,
        })
        const conflict = preview.targets.find((target) => target.conflict)
        if (conflict) {
          setInstallState((state) => ({ ...state, [skill.id]: 'error' }))
          setMessages((state) => ({ ...state, [skill.id]: conflict.conflict || '目标路径冲突' }))
          return
        }
        const destination = preview.targets[0]?.destinationPath
        setMessages((state) => ({
          ...state,
          [skill.id]: [
            destination ? `预览：${destination}` : '预览完成',
            ...preview.warnings,
          ].join(' · '),
        }))
      }
      const result = await installMarketSkill(
        skill.id,
        draft.toolId,
        draft.categoryId ? [draft.categoryId] : [],
        draft.workspaceId || undefined,
        draft.alias || undefined,
      )
      if (result.success) {
        setInstallState((state) => ({ ...state, [skill.id]: 'done' }))
        setMessages((state) => ({ ...state, [skill.id]: result.message || '安装完成' }))
        setExpandedInstallId('')
        await fetchSkills()
      } else {
        setInstallState((state) => ({ ...state, [skill.id]: 'error' }))
        setMessages((state) => ({ ...state, [skill.id]: result.message }))
      }
    } catch (err) {
      setInstallState((state) => ({ ...state, [skill.id]: 'error' }))
      setMessages((state) => ({ ...state, [skill.id]: String(err) }))
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[var(--color-border)] px-7 py-5">
        <h1 className="mb-4 text-[22px] font-bold text-[var(--color-text-primary)]">市场搜索</h1>
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]">
              <SearchIcon size={17} />
            </span>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索已同步仓库和 skills.sh"
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={searching} size="lg" className="gap-2">
            {searching
              ? <RefreshCwIcon size={16} className="animate-spin" />
              : <SearchIcon size={16} />}
            {searching ? '搜索中...' : '搜索'}
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {sourceOptions.map((source) => (
            <button
              key={source.id}
              onClick={() => setSourceId(source.id)}
              className={cn(
                'rounded-md border px-3 py-2 text-[14px] transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98]',
                sourceId === source.id
                  ? 'border-[rgba(99,102,241,0.4)] bg-[var(--color-accent-muted)] text-[var(--color-accent-hover)]'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-panel)] text-[var(--color-text-secondary)] hover:-translate-y-0.5 hover:bg-[var(--color-bg-surface)]',
              )}
              title={source.description}
            >
              {source.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-7">
        {error && (
          <p className="mb-4 rounded-md border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-[14px] text-[var(--color-danger)]">
            {error}
          </p>
        )}

        {results.length === 0 && !searching ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <PackageIcon size={36} className="text-[var(--color-text-placeholder)]" />
            <p className="text-[17px] text-[var(--color-text-secondary)]">搜索市场仓库，发现更多技能</p>
            <p className="text-[14px] text-[var(--color-text-placeholder)]">通过来源栏切换 skills.sh 官方或自定义仓库</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {results.map((skill) => {
              const draft = getDraft(skill.id)
              const installed = installedNames.has(skill.name.toLowerCase()) ||
                skill.installedByTool.includes(draft.toolId)
              const state = installed ? 'done' : (installState[skill.id] ?? 'idle')
              const msg = messages[skill.id]
              const expanded = expandedInstallId === skill.id
              return (
                <div
                  key={skill.id}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-5 transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-[17px] font-semibold text-[var(--color-text-primary)]">
                          {skill.name}
                        </span>
                        {skill.version && (
                          <span className="text-[13px] text-[var(--color-text-placeholder)]">
                            v{skill.version}
                          </span>
                        )}
                        <Badge variant="default">{skill.repositoryName}</Badge>
                        {[...skill.categoryNames, ...skill.tags].slice(0, 3).map((item) => (
                          <Badge key={item} variant="accent">#{item}</Badge>
                        ))}
                      </div>
                      <p className="mb-3 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                        {skill.description || '暂无描述'}
                      </p>
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="text-[13px] text-[var(--color-text-placeholder)]">
                          by {skill.author || skill.repositoryName}
                        </span>
                        <span className="text-[13px] text-[var(--color-text-placeholder)]">
                          {skill.repoType}
                        </span>
                        {skill.installedByTool.length > 0 && (
                          <span className="text-[13px] text-[var(--color-success)]">
                            已安装：{skill.installedByTool.join(', ')}
                          </span>
                        )}
                      </div>
                      {msg && (
                        <p
                          className={cn(
                            'mt-2 text-[13px]',
                            state === 'error' ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]',
                          )}
                        >
                          {msg}
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={() => openInstallConfig(skill)}
                      disabled={state === 'installing' || state === 'done'}
                      variant={
                        state === 'done' ? 'success'
                          : state === 'error' ? 'danger'
                          : 'outline'
                      }
                      size="md"
                      className="shrink-0"
                    >
                      {state === 'installing' && <RefreshCwIcon size={15} className="animate-spin" />}
                      {state === 'done' && '已安装'}
                      {state === 'error' && '安装失败'}
                      {state === 'idle' && <><DownloadIcon size={15} /> 安装</>}
                    </Button>
                  </div>

                  {expanded && state !== 'done' && (
                    <InstallConfigPanel
                      draft={draft}
                      skillId={skill.id}
                      targets={targets}
                      categories={categories}
                      workspaces={workspaces}
                      installing={state === 'installing'}
                      onChange={updateDraft}
                      onCancel={() => setExpandedInstallId('')}
                      onInstall={() => handleInstall(skill)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function InstallConfigPanel({
  draft,
  skillId,
  targets,
  categories,
  workspaces,
  installing,
  onChange,
  onCancel,
  onInstall,
}: {
  draft: InstallDraft
  skillId: string
  targets: { toolId: string; name: string }[]
  categories: { id: string; name: string; isSystem?: boolean }[]
  workspaces: { id: string; name: string }[]
  installing: boolean
  onChange: (skillId: string, patch: Partial<InstallDraft>) => void
  onCancel: () => void
  onInstall: () => void
}) {
  const targetOptions = targets.length > 0 ? targets : [
    { toolId: 'claude-code', name: 'Claude Code' },
    { toolId: 'agents', name: 'Agents' },
    { toolId: 'cc-switch', name: 'cc-switch' },
  ]

  return (
    <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="目标工具">
          <SelectRoot value={draft.toolId} onValueChange={(value) => onChange(skillId, { toolId: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {targetOptions.map((target) => (
                <SelectItemEl key={target.toolId} value={target.toolId}>{target.name}</SelectItemEl>
              ))}
            </SelectContent>
          </SelectRoot>
        </Field>
        <Field label="Alias">
          <Input
            value={draft.alias}
            onChange={(event) => onChange(skillId, { alias: event.target.value })}
            placeholder="可选"
          />
        </Field>
        <Field label="分类">
          <SelectRoot value={draft.categoryId || '__none__'} onValueChange={(value) => onChange(skillId, { categoryId: value === '__none__' ? '' : value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItemEl value="__none__">不分类</SelectItemEl>
              {categories.filter((item) => !item.isSystem).map((item) => (
                <SelectItemEl key={item.id} value={item.id}>{item.name}</SelectItemEl>
              ))}
            </SelectContent>
          </SelectRoot>
        </Field>
        <Field label="工作区">
          <SelectRoot value={draft.workspaceId || '__none__'} onValueChange={(value) => onChange(skillId, { workspaceId: value === '__none__' ? '' : value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItemEl value="__none__">不进工作区</SelectItemEl>
              {workspaces.map((workspace) => (
                <SelectItemEl key={workspace.id} value={workspace.id}>{workspace.name}</SelectItemEl>
              ))}
            </SelectContent>
          </SelectRoot>
        </Field>
      </div>

      <div className="mt-4 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel} disabled={installing}>取消</Button>
        <Button onClick={onInstall} disabled={installing}>
          {installing && <RefreshCwIcon size={15} className="animate-spin" />}
          确认安装
        </Button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-semibold uppercase text-[var(--color-text-secondary)]">
        {label}
      </span>
      {children}
    </label>
  )
}
