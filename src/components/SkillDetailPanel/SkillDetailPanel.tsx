import { useState } from 'react'
import { X, Power, Trash2, FolderOpen, Clock, BarChart2 } from 'lucide-react'
import { useSkillStore, type Skill } from '@/stores/skillStore'
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
      className="flex flex-col h-full overflow-hidden"
      style={{
        width: 360,
        borderLeft: '1px solid var(--color-border)',
        background: 'var(--color-bg-panel)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          技能详情
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* Identity */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center text-xl font-bold rounded-lg shrink-0"
            style={{ width: 52, height: 52, background: 'var(--color-accent-muted)', color: 'var(--color-accent)', border: '1px solid rgba(99,102,241,0.3)' }}
          >
            {skill.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate" style={{ fontSize: 15, color: 'var(--color-text-primary)' }}>
              {skill.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: skill.enabled ? 'var(--color-success)' : 'var(--color-text-placeholder)' }}
              />
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                {skill.enabled ? '已启用' : '已禁用'} · {skill.toolId}
                {skill.version ? ` · v${skill.version}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {skill.description && (
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {skill.description}
          </p>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2">
          <StatCell icon={<Clock size={12} />} label="安装日期" value={formatDate(skill.installedAt)} />
          <StatCell icon={<Clock size={12} />} label="最近使用" value={formatDate(skill.lastUsedAt)} />
          <StatCell icon={<BarChart2 size={12} />} label="使用次数" value={String(skill.usageCount)} />
          <StatCell icon={<FolderOpen size={12} />} label="工具" value={skill.toolId} />
        </div>

        {/* Categories */}
        <Section label="分类">
          <div className="flex flex-wrap gap-1.5">
            {skill.categories.length > 0
              ? skill.categories.map((c) => <Chip key={c} label={c} />)
              : <span style={{ fontSize: 11, color: 'var(--color-text-placeholder)' }}>暂无分类</span>
            }
          </div>
        </Section>

        {/* Tags — editable */}
        <Section label="标签">
          <TagEditor skillId={skill.id} tags={tags} onChanged={setTags} />
        </Section>

        {/* Notes — editable */}
        <Section label="备注">
          <NoteEditor skillId={skill.id} note={note} onChanged={setNote} />
        </Section>

        {/* Install path */}
        <Section label="安装路径">
          <p
            className="break-all"
            style={{ fontSize: 10, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-mono)' }}
          >
            {skill.installPath}
          </p>
        </Section>
      </div>

      {/* Actions footer */}
      <div
        className="flex items-center gap-2 p-3 shrink-0"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <ActionBtn
          icon={<Power size={13} />}
          label={skill.enabled ? '禁用' : '启用'}
          onClick={handleToggle}
          color={skill.enabled ? 'var(--color-warning)' : 'var(--color-success)'}
        />
        <ActionBtn
          icon={<Trash2 size={13} />}
          label="卸载"
          onClick={handleUninstall}
          color="var(--color-danger)"
        />
      </div>
    </aside>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  label, icon, children,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon && <span style={{ color: 'var(--color-text-placeholder)' }}>{icon}</span>}
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-placeholder)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

function Chip({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px',
      background: accent ? 'var(--color-accent-muted)' : 'var(--color-bg-surface)',
      border: `1px solid ${accent ? 'rgba(99,102,241,0.3)' : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-full)',
      color: accent ? 'var(--color-accent-hover)' : 'var(--color-text-secondary)',
    }}>
      {label}
    </span>
  )
}

function StatCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '8px 10px' }}>
      <div className="flex items-center gap-1 mb-0.5" style={{ color: 'var(--color-text-placeholder)' }}>
        {icon}
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{value}</span>
    </div>
  )
}

function ActionBtn({
  icon, label, onClick, color,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  color: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors"
      style={{
        flex: 1, justifyContent: 'center',
        background: `${color}18`,
        border: `1px solid ${color}44`,
        color, fontSize: 12, fontWeight: 500, cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = `${color}30` }}
      onMouseLeave={(e) => { e.currentTarget.style.background = `${color}18` }}
    >
      {icon} {label}
    </button>
  )
}
