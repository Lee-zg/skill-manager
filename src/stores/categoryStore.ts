import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

export interface Category {
  id: string
  name: string
  parentId?: string
  color: string
  icon: string
  sortOrder: number
  isSystem: boolean
  skillCount: number
}

interface CategoryState {
  categories: Category[]
  activeCategory: string | null
  fetchCategories: () => Promise<void>
  setActiveCategory: (id: string | null) => void
  createCategory: (name: string, color: string, icon: string, parentId?: string) => Promise<void>
  updateCategory: (id: string, name: string, color: string, icon: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  setSkillCategory: (skillId: string, categoryId: string) => Promise<void>
  removeSkillCategory: (skillId: string, categoryId: string) => Promise<void>
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  activeCategory: null,

  fetchCategories: async () => {
    const raw = await invoke<any[]>('list_categories_cmd')
    const categories: Category[] = raw.map((c) => ({
      id: c.id,
      name: c.name,
      parentId: c.parent_id ?? undefined,
      color: c.color,
      icon: c.icon,
      sortOrder: c.sort_order,
      isSystem: c.is_system,
      skillCount: c.skill_count,
    }))
    set({ categories })
  },

  setActiveCategory: (id) => set({ activeCategory: id }),

  createCategory: async (name, color, icon, parentId) => {
    await invoke('create_category_cmd', { name, color, icon, parentId: parentId ?? null })
    await get().fetchCategories()
  },

  updateCategory: async (id, name, color, icon) => {
    await invoke('update_category_cmd', { id, name, color, icon })
    await get().fetchCategories()
  },

  deleteCategory: async (id) => {
    await invoke('delete_category_cmd', { id })
    await get().fetchCategories()
  },

  setSkillCategory: async (skillId, categoryId) => {
    await invoke('set_skill_category_cmd', { skillId, categoryId })
    await get().fetchCategories()
  },

  removeSkillCategory: async (skillId, categoryId) => {
    await invoke('remove_skill_category_cmd', { skillId, categoryId })
    await get().fetchCategories()
  },
}))
