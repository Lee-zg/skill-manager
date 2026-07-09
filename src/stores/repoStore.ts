import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

export interface Repository {
  id: string
  name: string
  url: string
  repoType: string
  branch: string
  skillsDir: string
  priority: number
  enabled: boolean
  lastSync?: number
}

interface RepoState {
  repos: Repository[]
  fetchRepos: () => Promise<void>
  addRepo: (data: {
    name: string; url: string; repoType: string
    branch: string; skillsDir: string; priority: number
  }) => Promise<void>
  syncRepo: (id: string) => Promise<{ scannedSkills: number; message: string }>
  toggleRepo: (id: string, enabled: boolean) => Promise<void>
  deleteRepo: (id: string) => Promise<void>
}

const mapRepo = (r: any): Repository => ({
  id: r.id, name: r.name, url: r.url,
  repoType: r.repo_type, branch: r.branch,
  skillsDir: r.skills_dir, priority: r.priority,
  enabled: r.enabled, lastSync: r.last_sync,
})

export const useRepoStore = create<RepoState>((set, get) => ({
  repos: [],
  fetchRepos: async () => {
    const raw = await invoke<any[]>('list_repositories_cmd')
    set({ repos: raw.map(mapRepo) })
  },
  addRepo: async (data) => {
    await invoke('add_repository_cmd', {
      name: data.name, url: data.url, repoType: data.repoType,
      branch: data.branch, skillsDir: data.skillsDir, priority: data.priority,
    })
    await get().fetchRepos()
  },
  syncRepo: async (id) => {
    const raw = await invoke<any>('sync_repository_cmd', { id })
    await get().fetchRepos()
    return {
      scannedSkills: raw.scanned_skills ?? 0,
      message: raw.message ?? '同步完成',
    }
  },
  toggleRepo: async (id, enabled) => {
    await invoke('toggle_repository_cmd', { id, enabled })
    set((s) => ({ repos: s.repos.map((r) => r.id === id ? { ...r, enabled } : r) }))
  },
  deleteRepo: async (id) => {
    await invoke('delete_repository_cmd', { id })
    set((s) => ({ repos: s.repos.filter((r) => r.id !== id) }))
  },
}))
