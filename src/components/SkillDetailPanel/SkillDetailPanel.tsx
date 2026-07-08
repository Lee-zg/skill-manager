import { useState } from 'react'
import { XIcon, PowerIcon, Trash2Icon, FolderOpenIcon, ClockIcon, BarChart2Icon } from '@/components/icons'
import { useSkillStore, type Skill } from '@/stores/skillStore'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import TagEditor from '@/components/TagEditor/TagEditor'
import NoteEditor from '@/components/NoteEditor/NoteEditor'

interface Props {
  skill: Skill
  onClose: () => void
}

export default function SkillDetailPanel({ skill, onClose }: Props) {
  const { toggleSkill, uninstallSkill } = useSkillStore()
  const [tags, setTags] = useState(skill.tags)
  const [note, setNote] = useState(skill.note ?? '')

  const handleToggle = async () => {
    await toggleSkill(skill.id, skill.installPath, skill.toolId, !skill.enabled)
  }

  const handleUninstall = async () => {
    if (!confirm(`确认卸载 "${skill.name}"？此操作不可恢复。`)) return
    await uninstallSkill(skill.id, skill.installPath, skill.toolId)
    onClose()
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
              {skill.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate text-[15px] text-[var(--color-text-primary)]">
                {skill.name}
              </p>
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
              {skill.categories.length > 0
                ? skill.categories.map((c) => <Chip key={c} label={c} />)
                : <span className="text-[11px] text-[var(--color-text-placeholder)]">暂无分类</span>
              }
            </div>
          </Section>

          {/* Tags */}
          <Section label="标签">
            <TagEditor skillId={skill.id} tags={tags} onChanged={setTags} />
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
        </div>
      </ScrollArea>

      {/* Actions footer */}
      <Separator />
      <div className="flex items-center gap-2 p-3 shrink-0">
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
          onClick={handleUninstall}
        >
          <Trash2Icon size={13} />
          卸载
        </Button>
      </div>
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

function Chip({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span
      className="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={accent
        ? { background: 'var(--color-accent-muted)', borderColor: 'rgba(99,102,241,0.3)', color: 'var(--color-accent-hover)' }
        : { background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }
      }
    >
      {label}
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
