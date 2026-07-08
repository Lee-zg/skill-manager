import { useEffect, useState } from 'react'
import {
  PlusIcon, ChevronRightIcon, FolderIcon, LayersIcon, Trash2Icon,
} from '@/components/icons'
import { useCategoryStore, type Category } from '@/stores/categoryStore'
import { useSkillStore } from '@/stores/skillStore'
import { cn } from '@/lib/utils'

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
      <NavItem
        icon={<LayersIcon size={13} />}
        label="全部"
        count={categories.find((c) => c.id === 'all')?.skillCount ?? 0}
        active={activeCategory === null}
        onClick={() => handleSelect(null)}
      />

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

      {(() => {
        const unc = categories.find((c) => c.id === 'uncategorized')
        return unc ? (
          <NavItem
            icon={<FolderIcon size={13} />}
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
            className="w-full rounded bg-[var(--color-bg-surface)] border border-[var(--color-accent)] text-[var(--color-text-primary)] text-[12px] px-1.5 py-1 outline-none"
          />
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 w-full px-1 py-1.5 bg-none border-none cursor-pointer text-[var(--color-text-placeholder)] text-[11px] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            <PlusIcon size={11} /> 添加分类
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
      className={cn(
        'flex items-center gap-2 w-full px-3 py-1.5 rounded-sm border-none cursor-pointer text-left text-[12px] transition-colors',
        active
          ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-hover)] font-medium'
          : muted
          ? 'text-[var(--color-text-placeholder)] hover:bg-[var(--color-bg-surface)] bg-transparent'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] bg-transparent',
      )}
    >
      <span className="text-inherit shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] text-[var(--color-text-placeholder)] bg-[var(--color-bg-hover)] px-1 rounded-full">
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
        className={cn(
          'flex items-center gap-1 px-2 rounded-sm',
          active ? 'bg-[var(--color-accent-muted)]' : 'bg-transparent',
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {subCategories.length > 0 ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="bg-none border-none p-0.5 cursor-pointer text-[var(--color-text-placeholder)] transition-transform duration-150"
            style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}
          >
            <ChevronRightIcon size={10} />
          </button>
        ) : (
          <div style={{ width: 14 }} />
        )}

        <button
          onClick={onSelect}
          className="flex items-center gap-1.5 flex-1 py-1.5 bg-none border-none cursor-pointer text-left text-[12px]"
          style={{
            color: active ? 'var(--color-accent-hover)' : 'var(--color-text-secondary)',
            fontWeight: active ? 500 : 400,
          }}
        >
          <span style={{ color: cat.color, fontSize: 13 }}>{cat.icon}</span>
          <span className="flex-1 truncate">{cat.name}</span>
          <span className="text-[10px] text-[var(--color-text-placeholder)]">{cat.skillCount}</span>
        </button>

        {hovered && !cat.isSystem && (
          <button
            onClick={onDelete}
            className="bg-none border-none px-1 py-0.5 cursor-pointer text-[var(--color-danger)] opacity-70 hover:opacity-100"
          >
            <Trash2Icon size={10} />
          </button>
        )}
      </div>

      {expanded &&
        subCategories.map((sub) => (
          <button
            key={sub.id}
            onClick={() => onSelectSub(sub.id)}
            className={cn(
              'flex items-center gap-1.5 w-full pl-8 pr-3 py-1.5 border-none cursor-pointer text-[11px]',
              activeSubId === sub.id
                ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-hover)]'
                : 'bg-transparent text-[var(--color-text-secondary)]',
            )}
          >
            <span style={{ color: sub.color }}>{sub.icon}</span>
            <span className="flex-1 truncate">{sub.name}</span>
          </button>
        ))}
    </div>
  )
}
