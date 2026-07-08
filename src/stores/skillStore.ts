import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { mapSkill } from '@/lib/mapSkill'

export interface Skill {
  id: string
  name: string
  originalName: string
  description?: string
  version?: string
  installPath: string
  toolId: string
  enabled: boolean
  installedAt?: number
  lastUsedAt?: number
  usageCount: number
  tags: string[]
  categories: string[]
  note?: string
}

export interface ScanResult {
  total: number
  byTool: { toolId: string; toolName: string; available: boolean; count: number }[]
}

interface SkillState {
  skills: Skill[]
  loading: boolean
  searchQuery: string
  selectedSkill: Skill | null
  viewMode: 'grid' | 'list'
  filterTool: string | null
  filterCategory: string | null
  setSkills: (skills: Skill[]) => void
  setLoading: (v: boolean) => void
  setSearchQuery: (q: string) => void
  setSelectedSkill: (s: Skill | null) => void
  setViewMode: (m: 'grid' | 'list') => void
  setFilterTool: (t: string | null) => void
  setFilterCategory: (c: string | null) => void
  fetchSkills: () => Promise<void>
  scanSkills: () => Promise<ScanResult>
  toggleSkill: (id: string, installPath: string, toolId: string, enabled: boolean) => Promise<void>
  uninstallSkill: (id: string, installPath: string, toolId: string) => Promise<void>
}

export const useSkillStore = create<SkillState>((set, get) => ({
  skills: [],
  loading: false,
  searchQuery: '',
  selectedSkill: null,
  viewMode: 'grid',
  filterTool: null,
  filterCategory: null,

  setSkills: (skills) => set({ skills }),
  setLoading: (v) => set({ loading: v }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedSkill: (s) => set({ selectedSkill: s }),
  setViewMode: (m) => set({ viewMode: m }),
  setFilterTool: (t) => set({ filterTool: t }),
  setFilterCategory: (c) => set({ filterCategory: c }),

  fetchSkills: async () => {
    set({ loading: true })
    try {
      const raw = await invoke<Skill[]>('list_skills')
      // camelCase conversion from snake_case
      const skills = raw.map(mapSkill)
      set({ skills })
    } finally {
      set({ loading: false })
    }
  },

  scanSkills: async () => {
    set({ loading: true })
    try {
      const raw = await invoke<any>('scan_skills')
      // Rust serialises as snake_case; map to the camelCase ScanResult interface
      const result: ScanResult = {
        total: raw.total,
        byTool: (raw.by_tool ?? []).map((t: any) => ({
          toolId:    t.tool_id,
          toolName:  t.tool_name,
          available: t.available,
          count:     t.count,
        })),
      }
      await get().fetchSkills()
      return result
    } finally {
      set({ loading: false })
    }
  },

  toggleSkill: async (id, installPath, toolId, enabled) => {
    await invoke('toggle_skill', { id, installPath, toolId, enabled })
    set((state) => ({
      skills: state.skills.map((s) => (s.id === id ? { ...s, enabled } : s)),
    }))
  },

  uninstallSkill: async (id, installPath, toolId) => {
    await invoke('uninstall_skill', { id, installPath, toolId })
    set((state) => ({
      skills: state.skills.filter((s) => s.id !== id),
      selectedSkill: state.selectedSkill?.id === id ? null : state.selectedSkill,
    }))
  },
}))
