import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  XIcon, PowerIcon, Trash2Icon, FolderOpenIcon, ClockIcon, BarChart2Icon,
  PencilIcon, CheckIcon, PlusIcon, RefreshCwIcon,
} from '@/components/icons'
import { useSkillStore, type Skill } from '@/stores/skillStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import TagEditor from '@/components/TagEditor/TagEditor'
import NoteEditor from '@/components/NoteEditor/NoteEditor'

interface Props {
  skill: Skill
  onClose: () => void
}

export default function SkillDetailPanel({ skill, onClose }: Props) {
  const { toggleSkill, uninstallSkill, fetchSkills, setSelectedSkill } = useSkillStore()
  const {
    categories, fetchCategories, setSkillCategory, removeSkillCategory,
  } = useCategoryStore()
  const [displayName, setDisplayName] = useState(skill.name)
  const [nameDraft, setNameDraft] = useState(skill.name)
  const [renaming, setRenaming] = useState(false)
  const [tags, setTags] = useState(skill.tags)
  const [note, setNote] = useState(skill.note ?? '')
  const [aliases, setAliases] = useState(skill.aliases)
  const [categoryIds, setCategoryIds] = useState(skill.categoryIds)
  const [confirmUninstall, setConfirmUninstall] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    queueMicrotask(() => {
      setDisplayName(skill.name)
      setNameDraft(skill.name)
      setTags(skill.tags)
      setNote(skill.note ?? '')
      setAliases(skill.aliases)
      setCategoryIds(skill.categoryIds)
    })
  }, [skill])

  const handleToggle = async () => {
    const nextEnabled = !skill.enabled
    await toggleSkill(skill.id, skill.installPath, skill.toolId, nextEnabled)
    setSelectedSkill({ ...skill, enabled: nextEnabled })
  }

  const handleUninstall = async () => {
    await uninstallSkill(skill.id, skill.installPath, skill.toolId)
    onClose()
  }

  const handleRename = async () => {
    const nextName = nameDraft.trim()
    if (!nextName || nextName === displayName) {
      setNameDraft(displayName)
      setRenaming(false)
      return
    }

    await invoke('rename_skill_cmd', { id: skill.id, newName: nextName })
    const renamedSkill = { ...skill, name: nextName }
    setDisplayName(nextName)
    setSelectedSkill(renamedSkill)
    await fetchSkills()
    setRenaming(false)
  }

  const handleAddAlias = async (alias: string) => {
    const normalizedAlias = alias.trim().toLowerCase()
    if (!normalizedAlias || aliases.includes(normalizedAlias)) return
    await invoke('add_alias_cmd', { skillId: skill.id, alias: normalizedAlias })
    setAliases([...aliases, normalizedAlias])
    await fetchSkills()
  }

  const handleRemoveAlias = async (alias: string) => {
    await invoke('remove_alias_cmd', { skillId: skill.id, alias })
    setAliases(aliases.filter((item) => item !== alias))
    await fetchSkills()
  }

  const handleAddCategory = async (categoryId: string) => {
    if (!categoryId || categoryIds.includes(categoryId)) return
    await setSkillCategory(skill.id, categoryId)
    setCategoryIds([...categoryIds, categoryId])
    await fetchSkills()
  }

  const handleRemoveCategory = async (categoryId: string) => {
    await removeSkillCategory(skill.id, categoryId)
    setCategoryIds(categoryIds.filter((id) => id !== categoryId))
    await fetchSkills()
  }

  const handleUpdate = async () => {
    setUpdating(true)
    setFeedback('')
    try {
      const result = await invoke<any>('update_skill_cmd', {
        skillName: displayName,
        toolId: skill.toolId,
      })
      setFeedback(result.success ? '更新完成，已重新扫描技能。' : (result.message || '更新失败'))
      await fetchSkills()
    } catch (err) {
      setFeedback(`更新失败：${String(err)}`)
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (ts?: number) =>
    ts ? new Date(ts * 1000).toLocaleDateString('zh-CN') : '—'

  return (
    <aside
      className="flex flex-col h-full overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-bg-panel)]"
      style={{ width: 360 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-[var(--color-border)]">
        <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">技能详情</span>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭">
          <XIcon size={16} />
        </Button>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="p-4 flex flex-col gap-4">
          {/* Identity */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center text-xl font-bold rounded-lg shrink-0 w-13 h-13"
              style={{
                width: 52, height: 52,
                background: 'var(--color-accent-muted)',
                color: 'var(--color-accent)',
                border: '1px solid rgba(99,102,241,0.3)',
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              {renaming ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void handleRename()
                      if (event.key === 'Escape') {
                        setNameDraft(displayName)
                        setRenaming(false)
                      }
                    }}
                    className="min-w-0 flex-1 rounded-md border border-[var(--color-accent)] bg-[var(--color-bg-surface)] px-2 py-1 text-[13px] text-[var(--color-text-primary)] outline-none"
                  />
                  <Button size="icon" variant="ghost" onClick={handleRename} aria-label="保存名称">
                    <CheckIcon size={13} />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <p className="font-semibold truncate text-[15px] text-[var(--color-text-primary)]">
                    {displayName}
                  </p>
                  <Button size="icon" variant="ghost" onClick={() => setRenaming(true)} aria-label="重命名">
                    <PencilIcon size={12} />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: skill.enabled ? 'var(--color-success)' : 'var(--color-text-placeholder)' }}
                />
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                  {skill.enabled ? '已启用' : '已禁用'} · {skill.toolId}
                  {skill.version ? ` · v${skill.version}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {skill.description && (
            <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
              {skill.description}
            </p>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2">
            <StatCell icon={<ClockIcon size={12} />}     label="安装日期" value={formatDate(skill.installedAt)} />
            <StatCell icon={<ClockIcon size={12} />}     label="最近使用" value={formatDate(skill.lastUsedAt)} />
            <StatCell icon={<BarChart2Icon size={12} />} label="使用次数" value={String(skill.usageCount)} />
            <StatCell icon={<FolderOpenIcon size={12} />} label="工具" value={skill.toolId} />
          </div>

          {/* Categories */}
          <Section label="分类">
            <div className="flex flex-wrap gap-1.5">
              {categoryIds.length > 0
                ? categoryIds.map((categoryId) => {
                    const category = categories.find((item) => item.id === categoryId)
                    return (
                      <Chip
                        key={categoryId}
                        label={category?.name ?? categoryId}
                        onRemove={() => handleRemoveCategory(categoryId)}
                      />
                    )
                  })
                : <span className="text-[11px] text-[var(--color-text-placeholder)]">暂无分类</span>
              }
              <select
                value=""
                onChange={(event) => {
                  void handleAddCategory(event.target.value)
                  event.currentTarget.value = ''
                }}
                className="h-6 rounded-full border border-dashed border-[var(--color-border)] bg-transparent px-2 text-[10px] text-[var(--color-text-placeholder)] outline-none hover:text-[var(--color-text-secondary)]"
              >
                <option value="">添加分类</option>
                {categories
                  .filter((category) => !category.isSystem && !categoryIds.includes(category.id))
                  .map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
              </select>
            </div>
          </Section>

          {/* Tags */}
          <Section label="标签">
            <TagEditor skillId={skill.id} tags={tags} onChanged={setTags} />
          </Section>

          <Section label="别名">
            <AliasEditor aliases={aliases} onAdd={handleAddAlias} onRemove={handleRemoveAlias} />
          </Section>

          {/* Notes */}
          <Section label="备注">
            <NoteEditor skillId={skill.id} note={note} onChanged={setNote} />
          </Section>

          {/* Install path */}
          <Section label="安装路径">
            <p
              className="break-all text-[10px] text-[var(--color-text-placeholder)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {skill.installPath}
            </p>
          </Section>
          {feedback && (
            <p className="text-[11px] text-[var(--color-text-secondary)]">{feedback}</p>
          )}
        </div>
      </ScrollArea>

      {/* Actions footer */}
      <Separator />
      <div className="flex items-center gap-2 p-3 shrink-0">
        <Button
          variant="outline"
          size="md"
          className="flex-1 justify-center"
          onClick={handleUpdate}
          disabled={updating}
        >
          <RefreshCwIcon size={13} className={updating ? 'animate-spin' : ''} />
          {updating ? '更新中' : '更新'}
        </Button>
        <Button
          variant={skill.enabled ? 'danger' : 'success'}
          size="md"
          className="flex-1 justify-center"
          onClick={handleToggle}
        >
          <PowerIcon size={13} />
          {skill.enabled ? '禁用' : '启用'}
        </Button>
        <Button
          variant="danger"
          size="md"
          className="flex-1 justify-center"
          onClick={() => setConfirmUninstall(true)}
        >
          <Trash2Icon size={13} />
          卸载
        </Button>
      </div>

      <ConfirmDialog
        open={confirmUninstall}
        title="卸载技能"
        description={`确认卸载 "${displayName}"？此操作会删除本地技能目录，无法撤销。`}
        confirmText="卸载"
        danger
        onConfirm={handleUninstall}
        onOpenChange={setConfirmUninstall}
      />
    </aside>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-placeholder)] mb-2">
        {label}
      </p>
      {children}
    </div>
  )
}

function Chip({ label, accent, onRemove }: { label: string; accent?: boolean; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={accent
        ? { background: 'var(--color-accent-muted)', borderColor: 'rgba(99,102,241,0.3)', color: 'var(--color-accent-hover)' }
        : { background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }
      }
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="border-none bg-transparent p-0 text-[var(--color-text-placeholder)] hover:text-[var(--color-danger)]"
          aria-label={`移除 ${label}`}
        >
          <XIcon size={9} />
        </button>
      )}
    </span>
  )
}

function StatCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-md p-2.5">
      <div className="flex items-center gap-1 mb-0.5 text-[var(--color-text-placeholder)]">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.06em]">{label}</span>
      </div>
      <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">{value}</span>
    </div>
  )
}

function AliasEditor({
  aliases,
  onAdd,
  onRemove,
}: {
  aliases: string[]
  onAdd: (alias: string) => Promise<void>
  onRemove: (alias: string) => Promise<void>
}) {
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)

  const commit = async () => {
    await onAdd(draft)
    setDraft('')
    setEditing(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {aliases.map((alias) => (
        <Chip key={alias} label={alias} accent onRemove={() => onRemove(alias)} />
      ))}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => { void commit() }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void commit()
            if (event.key === 'Escape') {
              setDraft('')
              setEditing(false)
            }
          }}
          placeholder="别名..."
          className="w-20 rounded-full border border-[var(--color-accent)] bg-transparent px-2 py-0.5 text-[11px] text-[var(--color-text-primary)] outline-none"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--color-border)] bg-transparent px-2 py-0.5 text-[10px] text-[var(--color-text-placeholder)] hover:text-[var(--color-text-secondary)]"
        >
          <PlusIcon size={9} /> 别名
        </button>
      )}
    </div>
  )
}
