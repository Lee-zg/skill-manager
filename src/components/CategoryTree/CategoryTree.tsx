import { useEffect, useState } from 'react'
import { Plus, ChevronRight, Folder, Layers, Trash2 } from 'lucide-react'
import { useCategoryStore, type Category } from '@/stores/categoryStore'
import { useSkillStore } from '@/stores/skillStore'

export default function CategoryTree() {
  const { categories, activeCategory, setActiveCategory, fetchCategories, createCategory, deleteCategory } =
    useCategoryStore()
  const { setFilterCategory } = useSkillStore()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const handleSelect = (id: string | null) => {
    setActiveCategory(id)
    setFilterCategory(id)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    await createCategory(newName.trim(), '#6366f1', '📁')
    setNewName('')
    setCreating(false)
  }

  const rootCategories = categories.filter((c) => !c.parentId)

  return (
    <div className="py-1">
      {/* All skills */}
      <NavItem
        icon={<Layers size={13} />}
        label="全部"
        count={categories.find((c) => c.id === 'all')?.skillCount ?? 0}
        active={activeCategory === null}
        onClick={() => handleSelect(null)}
      />

      {/* User categories */}
      {rootCategories
        .filter((c) => c.id !== 'all' && c.id !== 'uncategorized')
        .map((cat) => (
          <CategoryRow
            key={cat.id}
            cat={cat}
            active={activeCategory === cat.id}
            onSelect={() => handleSelect(cat.id)}
            onDelete={() => deleteCategory(cat.id)}
            subCategories={categories.filter((c) => c.parentId === cat.id)}
            activeSubId={activeCategory}
            onSelectSub={(id) => handleSelect(id)}
          />
        ))}

      {/* Uncategorized */}
      {(() => {
        const unc = categories.find((c) => c.id === 'uncategorized')
        return unc ? (
          <NavItem
            icon={<Folder size={13} />}
            label="未分类"
            count={unc.skillCount}
            active={activeCategory === 'uncategorized'}
            onClick={() => handleSelect('uncategorized')}
            muted
          />
        ) : null
      })()}

      {/* Add category */}
      <div className="mt-1 px-2">
        {creating ? (
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') setCreating(false)
            }}
            onBlur={() => { if (!newName.trim()) setCreating(false) }}
            placeholder="分类名称..."
            style={{
              width: '100%', background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-accent)', borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-primary)', fontSize: 12, padding: '3px 7px', outline: 'none',
            }}
          />
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 w-full px-1 py-1.5"
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-placeholder)', fontSize: 11 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-placeholder)')}
          >
            <Plus size={11} /> 添加分类
          </button>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function NavItem({
  icon, label, count, active, onClick, muted,
}: {
  icon: React.ReactNode; label: string; count?: number
  active: boolean; onClick: () => void; muted?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-1.5 rounded-sm transition-colors"
      style={{
        background: active ? 'var(--color-accent-muted)' : 'transparent',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        color: active ? 'var(--color-accent-hover)' : muted ? 'var(--color-text-placeholder)' : 'var(--color-text-secondary)',
        fontSize: 12, fontWeight: active ? 500 : 400,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--color-bg-surface)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ color: 'inherit', flexShrink: 0 }}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span style={{ fontSize: 10, color: 'var(--color-text-placeholder)',
          background: 'var(--color-bg-hover)', padding: '0 5px', borderRadius: 'var(--radius-full)' }}>
          {count}
        </span>
      )}
    </button>
  )
}

function CategoryRow({
  cat, active, onSelect, onDelete, subCategories, activeSubId, onSelectSub,
}: {
  cat: Category; active: boolean; onSelect: () => void; onDelete: () => void
  subCategories: Category[]; activeSubId: string | null; onSelectSub: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)

  return (
    <div>
      <div
        className="group flex items-center gap-1 px-2 rounded-sm"
        style={{ background: active ? 'var(--color-accent-muted)' : 'transparent' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {subCategories.length > 0 ? (
          <button onClick={() => setExpanded(!expanded)}
            style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer',
              color: 'var(--color-text-placeholder)', transform: expanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 150ms' }}>
            <ChevronRight size={10} />
          </button>
        ) : <div style={{ width: 14 }} />}

        <button onClick={onSelect} className="flex items-center gap-1.5 flex-1 py-1.5"
          style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            color: active ? 'var(--color-accent-hover)' : 'var(--color-text-secondary)',
            fontSize: 12, fontWeight: active ? 500 : 400 }}>
          <span style={{ color: cat.color, fontSize: 13 }}>{cat.icon}</span>
          <span className="flex-1 truncate">{cat.name}</span>
          <span style={{ fontSize: 10, color: 'var(--color-text-placeholder)' }}>{cat.skillCount}</span>
        </button>

        {hovered && !cat.isSystem && (
          <button onClick={onDelete}
            style={{ background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer',
              color: 'var(--color-danger)', opacity: 0.7 }}>
            <Trash2 size={10} />
          </button>
        )}
      </div>

      {expanded && subCategories.map((sub) => (
        <button key={sub.id}
          onClick={() => onSelectSub(sub.id)}
          className="flex items-center gap-1.5 w-full pl-8 pr-3 py-1.5"
          style={{
            background: activeSubId === sub.id ? 'var(--color-accent-muted)' : 'transparent',
            border: 'none', cursor: 'pointer',
            color: activeSubId === sub.id ? 'var(--color-accent-hover)' : 'var(--color-text-secondary)',
            fontSize: 11,
          }}>
          <span style={{ color: sub.color }}>{sub.icon}</span>
          <span className="flex-1 truncate">{sub.name}</span>
        </button>
      ))}
    </div>
  )
}
