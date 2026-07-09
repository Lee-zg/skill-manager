import { useEffect, useMemo, useState } from 'react'
import { PlusIcon, RefreshCwIcon, TerminalIcon, Trash2Icon } from '@/components/icons'
import { useSkillStore } from '@/stores/skillStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useInvocationStore, type InvocationRoute, type RoutePreviewItem } from '@/stores/invocationStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItemEl,
} from '@/components/ui/select'

type MappingTargetType = 'skill' | 'category' | 'workspace'

const MAPPING_TYPE_LABELS: Record<MappingTargetType, string> = {
  category: '分类映射',
  workspace: '工作区映射',
  skill: '单个技能映射',
}

const ROUTE_TYPE_LABELS: Record<string, string> = {
  skill_alias: '单个技能映射',
  category_all: '分类映射',
  category_skill: '分类映射',
  workspace_skill: '工作区映射',
  workspace_all: '工作区映射',
}

const STATUS_LABELS: Record<string, string> = {
  mapped: '已映射',
  conflict: '有冲突',
  disabled: '已停用',
  ready: '待添加',
}

export default function InvocationsPage() {
  const { skills, fetchSkills } = useSkillStore()
  const { categories, fetchCategories } = useCategoryStore()
  const { workspaces, fetchWorkspaces } = useWorkspaceStore()
  const {
    profiles, routes, routePreview, loading, message,
    fetchProfiles, fetchConfigMappings, previewConfigMappings,
    addConfigMappings, removeConfigMapping,
  } = useInvocationStore()
  const [targetType, setTargetType] = useState<MappingTargetType>('workspace')
  const [targetId, setTargetId] = useState('')
  const [toolId, setToolId] = useState('codex')
  const [scope, setScope] = useState('user')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSkills()
    fetchCategories()
    fetchWorkspaces()
    fetchProfiles()
    fetchConfigMappings({ toolId: 'codex' })
  }, [fetchCategories, fetchConfigMappings, fetchProfiles, fetchSkills, fetchWorkspaces])

  const targetOptions = useMemo(() => {
    if (targetType === 'skill') {
      return skills.map((skill) => ({ id: skill.id, label: skill.name, meta: skill.toolId }))
    }
    if (targetType === 'category') {
      return categories
        .filter((category) => !category.isSystem)
        .map((category) => ({ id: category.id, label: category.name, meta: `${category.skillCount} 个技能` }))
    }
    return workspaces.map((workspace) => ({
      id: workspace.id,
      label: workspace.name,
      meta: `${workspace.skillCount} 个技能`,
    }))
  }, [categories, skills, targetType, workspaces])

  useEffect(() => {
    if (!targetOptions.some((item) => item.id === targetId)) {
      queueMicrotask(() => setTargetId(targetOptions[0]?.id ?? ''))
    }
  }, [targetId, targetOptions])

  const selectedProfile = profiles.find((profile) => profile.toolId === toolId && profile.scope === scope)
    ?? profiles.find((profile) => profile.toolId === toolId)
  const previewMatchesCurrentTarget = routePreview?.targetType === targetType &&
    routePreview.targetId === targetId &&
    routePreview.toolId === toolId &&
    routePreview.scope === scope
  const previewRoutes = previewMatchesCurrentTarget ? routePreview.routes : []

  const handlePreview = async () => {
    if (!targetId) return
    setError('')
    try {
      await previewConfigMappings({ targetType, targetId, toolId, scope, mode: 'auto' })
    } catch (err) {
      setError(String(err))
    }
  }

  const handleAddMapping = async () => {
    if (!targetId) return
    setError('')
    try {
      await addConfigMappings({ targetType, targetId, toolId, scope, mode: 'auto' })
    } catch (err) {
      setError(String(err))
    }
  }

  const handleToolChange = (value: string) => {
    setToolId(value)
    void fetchConfigMappings({ toolId: value })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-7 py-5">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--color-text-primary)]">配置映射</h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            维护分类、工作区和技能到目标工具的应用内映射关系
          </p>
        </div>
        <Button variant="secondary" onClick={() => fetchConfigMappings({ toolId })} size="md">
          <RefreshCwIcon size={16} /> 刷新映射
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[420px_minmax(0,1fr)] overflow-hidden">
        <aside className="overflow-y-auto border-r border-[var(--color-border)] p-6">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-5 transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <TerminalIcon size={18} className="text-[var(--color-accent)]" />
              <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)]">添加映射</h2>
            </div>

            <Field label="映射类型">
              <SelectRoot value={targetType} onValueChange={(value) => setTargetType(value as MappingTargetType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItemEl value="workspace">{MAPPING_TYPE_LABELS.workspace}</SelectItemEl>
                  <SelectItemEl value="category">{MAPPING_TYPE_LABELS.category}</SelectItemEl>
                  <SelectItemEl value="skill">{MAPPING_TYPE_LABELS.skill}</SelectItemEl>
                </SelectContent>
              </SelectRoot>
            </Field>

            <Field label="映射对象">
              <SelectRoot value={targetId || '__empty__'} onValueChange={(value) => setTargetId(value === '__empty__' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {targetOptions.length === 0 && <SelectItemEl value="__empty__">暂无可选对象</SelectItemEl>}
                  {targetOptions.map((item) => (
                    <SelectItemEl key={item.id} value={item.id}>
                      {item.label}
                    </SelectItemEl>
                  ))}
                </SelectContent>
              </SelectRoot>
              {targetOptions.find((item) => item.id === targetId)?.meta && (
                <p className="mt-2 text-[13px] text-[var(--color-text-placeholder)]">
                  {targetOptions.find((item) => item.id === targetId)?.meta}
                </p>
              )}
            </Field>

            <Field label="目标工具">
              <SelectRoot value={toolId} onValueChange={handleToolChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItemEl key={`${profile.toolId}-${profile.scope}`} value={profile.toolId}>
                      {profile.toolId}
                    </SelectItemEl>
                  ))}
                </SelectContent>
              </SelectRoot>
            </Field>

            <Field label="Scope">
              <SelectRoot value={scope} onValueChange={(value) => {
                setScope(value)
                void fetchConfigMappings({ toolId })
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItemEl value="user">user</SelectItemEl>
                  <SelectItemEl value="project">project</SelectItemEl>
                </SelectContent>
              </SelectRoot>
            </Field>

            {selectedProfile && (
              <div className="mb-5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3">
                <p className="break-all text-[13px] text-[var(--color-text-secondary)]">
                  默认路径：{selectedProfile.basePath}
                </p>
                <p className="mt-2 text-[13px] text-[var(--color-text-placeholder)]">
                  映射只保存应用内配置，不修改外部工具文件。
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button className="flex-1" variant="secondary" onClick={handlePreview} disabled={!targetId || loading}>
                预览映射
              </Button>
              <Button className="flex-1" onClick={handleAddMapping} disabled={!targetId || loading}>
                <PlusIcon size={16} /> 添加映射
              </Button>
            </div>

            {(error || message) && (
              <p className={`mt-4 text-[14px] ${error ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
                {error || message}
              </p>
            )}
          </div>
        </aside>

        <main className="min-w-0 overflow-y-auto p-7">
          {routePreview && (
            <section className="mb-7">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)]">映射预览</h2>
                <Badge variant="accent">{previewRoutes.length} 条</Badge>
              </div>
              {routePreview.warnings.map((warning) => (
                <p key={warning} className="mb-3 rounded-md border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-[14px] text-[var(--color-warning)]">
                  {warning}
                </p>
              ))}
              <div className="flex flex-col gap-3">
                {previewRoutes.map((route) => (
                  <MappingPreviewCard key={route.routeId} route={route} />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)]">配置映射列表</h2>
              <Badge>{routes.length} 条</Badge>
            </div>
            {routes.length === 0 ? (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-10 text-center text-[16px] text-[var(--color-text-placeholder)]">
                暂无配置映射
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {routes.map((route) => (
                  <MappingRecord
                    key={route.id}
                    route={route}
                    onRemove={() => removeConfigMapping(route.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

function MappingPreviewCard({ route }: { route: RoutePreviewItem }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-4 transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-sm">
      <MappingSummary
        displayPath={route.displayPath}
        routeType={route.routeType}
        toolId={route.toolId}
        scope={route.scope}
        canonicalPath={route.canonicalPath}
        slug={route.slug}
        status={route.status}
        conflict={route.conflict}
      />
      <MappingPathList exports={route.exports} />
    </div>
  )
}

function MappingRecord({ route, onRemove }: { route: InvocationRoute; onRemove: () => void }) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-4 transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-sm">
      <div className="min-w-0 flex-1">
        <MappingSummary
          displayPath={route.displayPath}
          routeType={route.routeType}
          toolId={route.toolId}
          scope={route.scope}
          canonicalPath={route.canonicalPath}
          slug={route.slug}
          status={route.status}
          conflict={route.conflict}
        />
        <MappingPathList exports={route.exports} />
      </div>
      <Button variant="danger" size="icon" onClick={onRemove} aria-label="取消映射">
        <Trash2Icon size={16} />
      </Button>
    </div>
  )
}

function MappingSummary({
  displayPath,
  routeType,
  toolId,
  scope,
  canonicalPath,
  slug,
  status,
  conflict,
}: {
  displayPath: string
  routeType: string
  toolId: string
  scope: string
  canonicalPath: string
  slug: string
  status: string
  conflict?: string
}) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="accent">{ROUTE_TYPE_LABELS[routeType] ?? routeType}</Badge>
        <Badge>{toolId}</Badge>
        <Badge>{scope}</Badge>
        <Badge variant={status === 'conflict' ? 'danger' : 'success'}>{STATUS_LABELS[status] ?? status}</Badge>
      </div>
      <h3 className="mt-2 break-words text-[16px] font-semibold text-[var(--color-text-primary)]">
        {displayPath}
      </h3>
      <div className="mt-2 grid gap-1.5 text-[13px] text-[var(--color-text-secondary)]">
        <p className="break-all">规范路径：{canonicalPath}</p>
        <p className="break-all">Slug：{slug}</p>
      </div>
      {conflict && (
        <p className="mt-2 text-[13px] text-[var(--color-danger)]">{conflict}</p>
      )}
    </div>
  )
}

function MappingPathList({ exports }: { exports: RoutePreviewItem['exports'] }) {
  if (exports.length === 0) {
    return <p className="mt-3 text-[13px] text-[var(--color-text-placeholder)]">暂无目标路径</p>
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {exports.map((item) => (
        <div key={item.exportId} className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={item.conflict ? 'danger' : 'success'}>{STATUS_LABELS[item.status] ?? item.status}</Badge>
            <span className="break-all text-[13px] text-[var(--color-text-secondary)]">
              目标入口：{item.actualInvocation}
            </span>
          </div>
          {(item.destinationPath || item.promptPath) && (
            <p className="mt-1 break-all text-[13px] text-[var(--color-text-placeholder)]">
              {item.destinationPath ?? item.promptPath}
            </p>
          )}
          {item.conflict && (
            <p className="mt-1 text-[13px] text-[var(--color-danger)]">{item.conflict}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 block text-[13px] font-semibold uppercase text-[var(--color-text-secondary)]">
        {label}
      </span>
      {children}
    </label>
  )
}
