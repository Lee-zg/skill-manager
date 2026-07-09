import { useEffect, useState } from 'react'
import {
  PlusIcon, ChevronRightIcon, FolderIcon, LayersIcon, Trash2Icon, PencilIcon, CheckIcon,
} from '@/components/icons'
import { useCategoryStore, type Category } from '@/stores/categoryStore'
import { useSkillStore } from '@/stores/skillStore'
import { useInvocationStore } from '@/stores/invocationStore'
import { cn } from '@/lib/utils'

export default function CategoryTree() {
  const {
    categories, activeCategory, setActiveCategory, fetchCategories,
    createCategory, updateCategory, deleteCategory,
  } =
    useCategoryStore()
  const { setFilterCategory } = useSkillStore()
  const { addConfigMappings } = useInvocationStore()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newParentId, setNewParentId] = useState('')
  const [mapping, setMapping] = useState(false)
  const [mappingMsg, setMappingMsg] = useState('')

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const handleSelect = (id: string | null) => {
    setActiveCategory(id)
    setFilterCategory(id)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    await createCategory(newName.trim(), '#6366f1', '📁', newParentId || undefined)
    setNewName('')
    setNewParentId('')
    setCreating(false)
  }

  const handleAddCategoryMapping = async () => {
    if (!activeCategory || activeCategory === 'all' || activeCategory === 'uncategorized') return
    setMapping(true)
    setMappingMsg('')
    try {
      const result = await addConfigMappings({
        targetType: 'category',
        targetId: activeCategory,
        toolId: 'codex',
        scope: 'user',
        mode: 'auto',
      })
      setMappingMsg(`已添加 ${result.mapped} 条分类映射`)
    } catch (err) {
      setMappingMsg(`映射失败：${String(err)}`)
    } finally {
      setMapping(false)
    }
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
            onUpdate={(name) => updateCategory(cat.id, name, cat.color, cat.icon)}
            subCategories={categories.filter((c) => c.parentId === cat.id)}
            activeSubId={activeCategory}
            onSelectSub={(id) => handleSelect(id)}
            onUpdateSub={(id, name) => {
              const subCategory = categories.find((item) => item.id === id)
              if (subCategory) return updateCategory(id, name, subCategory.color, subCategory.icon)
              return Promise.resolve()
            }}
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
          <div className="flex flex-col gap-1">
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
            <select
              value={newParentId}
              onChange={(event) => setNewParentId(event.target.value)}
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-1.5 py-1 text-[11px] text-[var(--color-text-secondary)] outline-none"
            >
              <option value="">顶层分类</option>
              {categories
                .filter((category) => !category.isSystem && !category.parentId)
                .map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
            </select>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 w-full px-1 py-1.5 bg-none border-none cursor-pointer text-[var(--color-text-placeholder)] text-[11px] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            <PlusIcon size={11} /> 添加分类
          </button>
        )}
      </div>

      {activeCategory && activeCategory !== 'all' && activeCategory !== 'uncategorized' && (
        <div className="mt-2 px-2">
          <button
            onClick={handleAddCategoryMapping}
            disabled={mapping}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-2 py-1.5 text-[11px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-hover)] disabled:opacity-60"
          >
            <PlusIcon size={11} />
            {mapping ? '添加中...' : '添加分类映射'}
          </button>
          {mappingMsg && (
            <p className="mt-1 text-center text-[10px] text-[var(--color-text-placeholder)]">{mappingMsg}</p>
          )}
        </div>
      )}
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
  cat, active, onSelect, onDelete, onUpdate, subCategories, activeSubId, onSelectSub, onUpdateSub,
}: {
  cat: Category; active: boolean; onSelect: () => void; onDelete: () => void
  onUpdate: (name: string) => Promise<void>
  subCategories: Category[]; activeSubId: string | null; onSelectSub: (id: string) => void
  onUpdateSub: (id: string, name: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(cat.name)

  const commit = async () => {
    const nextName = draft.trim()
    if (nextName && nextName !== cat.name) await onUpdate(nextName)
    setEditing(false)
  }

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

        {editing ? (
          <div className="flex flex-1 items-center gap-1 py-1">
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void commit()
                if (event.key === 'Escape') setEditing(false)
              }}
              className="min-w-0 flex-1 rounded border border-[var(--color-accent)] bg-[var(--color-bg-surface)] px-1 py-0.5 text-[11px] text-[var(--color-text-primary)] outline-none"
            />
            <button onClick={commit} className="border-none bg-transparent p-0 text-[var(--color-accent)]">
              <CheckIcon size={10} />
            </button>
          </div>
        ) : (
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
        )}

        {hovered && !cat.isSystem && (
          <>
            <button
              onClick={() => setEditing(true)}
              className="bg-none border-none px-1 py-0.5 cursor-pointer text-[var(--color-text-placeholder)] opacity-70 hover:opacity-100"
            >
              <PencilIcon size={10} />
            </button>
            <button
              onClick={onDelete}
              className="bg-none border-none px-1 py-0.5 cursor-pointer text-[var(--color-danger)] opacity-70 hover:opacity-100"
            >
              <Trash2Icon size={10} />
            </button>
          </>
        )}
      </div>

      {expanded &&
        subCategories.map((sub) => (
          <SubCategoryRow
            key={sub.id}
            sub={sub}
            active={activeSubId === sub.id}
            onSelect={() => onSelectSub(sub.id)}
            onUpdate={(name) => onUpdateSub(sub.id, name)}
          />
        ))}
    </div>
  )
}

function SubCategoryRow({
  sub, active, onSelect, onUpdate,
}: {
  sub: Category
  active: boolean
  onSelect: () => void
  onUpdate: (name: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(sub.name)

  const commit = async () => {
    const nextName = draft.trim()
    if (nextName && nextName !== sub.name) await onUpdate(nextName)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 pl-8 pr-3 py-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void commit()
            if (event.key === 'Escape') setEditing(false)
          }}
          className="min-w-0 flex-1 rounded border border-[var(--color-accent)] bg-[var(--color-bg-surface)] px-1 py-0.5 text-[11px] text-[var(--color-text-primary)] outline-none"
        />
        <button onClick={commit} className="border-none bg-transparent p-0 text-[var(--color-accent)]">
          <CheckIcon size={10} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={onSelect}
      onDoubleClick={() => setEditing(true)}
      className={cn(
        'flex items-center gap-1.5 w-full pl-8 pr-3 py-1.5 border-none cursor-pointer text-[11px]',
        active
          ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-hover)]'
          : 'bg-transparent text-[var(--color-text-secondary)]',
      )}
    >
      <span style={{ color: sub.color }}>{sub.icon}</span>
      <span className="flex-1 truncate text-left">{sub.name}</span>
    </button>
  )
}
