import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

export interface MarketSkill {
  id: string
  repositoryId: string
  repositoryName: string
  repoType: string
  name: string
  description?: string
  author?: string
  source?: string
  installSource: string
  version?: string
  tags: string[]
  categoryNames: string[]
  installedByTool: string[]
  highlight?: string
  updatedAt?: number
}

export interface MarketSearchFilter {
  query?: string
  repositoryIds?: string[]
  repoTypes?: string[]
  category?: string
  toolId?: string
  installedState?: string
  limit?: number
  offset?: number
}

interface MarketState {
  results: MarketSkill[]
  loading: boolean
  error: string
  searchMarket: (filter: MarketSearchFilter) => Promise<void>
  installMarketSkill: (
    marketSkillId: string,
    toolId: string,
    categoryIds?: string[],
    workspaceId?: string,
    alias?: string,
  ) => Promise<{ success: boolean; message: string; skillId?: string }>
}

const mapMarketSkill = (skill: any): MarketSkill => ({
  id: skill.id,
  repositoryId: skill.repository_id,
  repositoryName: skill.repository_name,
  repoType: skill.repo_type,
  name: skill.name,
  description: skill.description,
  author: skill.author,
  source: skill.source,
  installSource: skill.install_source,
  version: skill.version,
  tags: skill.tags ?? [],
  categoryNames: skill.category_names ?? [],
  installedByTool: skill.installed_by_tool ?? [],
  highlight: skill.highlight,
  updatedAt: skill.updated_at,
})

const toBackendFilter = (filter: MarketSearchFilter) => ({
  query: filter.query ?? '',
  repository_ids: filter.repositoryIds ?? null,
  repo_types: filter.repoTypes ?? null,
  category: filter.category ?? null,
  tool_id: filter.toolId ?? null,
  installed_state: filter.installedState ?? null,
  limit: filter.limit ?? 80,
  offset: filter.offset ?? 0,
})

export const useMarketStore = create<MarketState>((set) => ({
  results: [],
  loading: false,
  error: '',

  searchMarket: async (filter) => {
    set({ loading: true, error: '' })
    try {
      const raw = await invoke<any[]>('search_market_skills_cmd', {
        filter: toBackendFilter(filter),
      })
      set({ results: raw.map(mapMarketSkill) })
    } catch (err) {
      set({ error: String(err), results: [] })
    } finally {
      set({ loading: false })
    }
  },

  installMarketSkill: async (marketSkillId, toolId, categoryIds = [], workspaceId, alias) => {
    const raw = await invoke<any>('install_market_skill_cmd', {
      marketSkillId,
      toolId,
      categoryIds,
      workspaceId: workspaceId ?? null,
      alias: alias || null,
    })
    return {
      success: Boolean(raw.success),
      message: raw.message ?? '',
      skillId: raw.skill_id,
    }
  },
}))
