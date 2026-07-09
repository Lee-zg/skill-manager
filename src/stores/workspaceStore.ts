import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { invoke } from '@tauri-apps/api/core'
import { STORAGE_KEYS, migrateLocalStorageKey } from '@/lib/appMeta'

export interface Workspace {
  id: string
  name: string
  description?: string
  toolId?: string
  color: string
  icon: string
  isActive: boolean
  skillCount: number
}

export interface WorkspaceSkill {
  workspaceId: string
  skillId: string
  skillName: string
  toolId: string
  installPath: string
  enabled: boolean
  note?: string
}

export interface ImportResult {
  workspaceId: string
  name: string
  importedSkills: number
  missingSkills: string[]
}

interface WorkspaceState {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  fetchWorkspaces: () => Promise<void>
  createWorkspace: (data: {
    name: string; description?: string; toolId?: string
    color: string; icon: string
  }) => Promise<Workspace>
  updateWorkspace: (id: string, data: {
    name: string; description?: string; toolId?: string; color: string; icon: string
  }) => Promise<void>
  deleteWorkspace: (id: string) => Promise<void>
  activateWorkspace: (id: string) => Promise<void>
  listWorkspaceSkills: (workspaceId: string) => Promise<WorkspaceSkill[]>
  addSkillToWorkspace: (workspaceId: string, skillId: string) => Promise<void>
  removeSkillFromWorkspace: (workspaceId: string, skillId: string) => Promise<void>
  exportYaml: (workspaceId: string) => Promise<string>
  importYaml: (yaml: string) => Promise<ImportResult>
}

const mapWorkspace = (w: any): Workspace => ({
  id: w.id,
  name: w.name,
  description: w.description,
  toolId: w.tool_id,
  color: w.color,
  icon: w.icon,
  isActive: w.is_active,
  skillCount: w.skill_count,
})

if (typeof localStorage !== 'undefined') {
  migrateLocalStorageKey(STORAGE_KEYS.workspace, STORAGE_KEYS.legacyWorkspace)
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspace: null,

      fetchWorkspaces: async () => {
        const raw = await invoke<any[]>('list_workspaces_cmd')
        const workspaces = raw.map(mapWorkspace)
        const active = workspaces.find((w) => w.isActive) ?? null
        set({ workspaces, activeWorkspace: active })
      },

      createWorkspace: async (data) => {
        const raw = await invoke<any>('create_workspace_cmd', {
          name: data.name,
          description: data.description ?? null,
          toolId: data.toolId ?? null,
          color: data.color,
          icon: data.icon,
        })
        const ws = mapWorkspace(raw)
        await get().fetchWorkspaces()
        return ws
      },

      updateWorkspace: async (id, data) => {
        await invoke('update_workspace_cmd', {
          id, name: data.name,
          description: data.description ?? null,
          toolId: data.toolId ?? null,
          color: data.color, icon: data.icon,
        })
        await get().fetchWorkspaces()
      },

      deleteWorkspace: async (id) => {
        await invoke('delete_workspace_cmd', { id })
        await get().fetchWorkspaces()
      },

      activateWorkspace: async (id) => {
        await invoke('activate_workspace_cmd', { id })
        await get().fetchWorkspaces()
      },

      listWorkspaceSkills: async (workspaceId) => {
        const raw = await invoke<any[]>('list_workspace_skills_cmd', { workspaceId })
        return raw.map((s) => ({
          workspaceId: s.workspace_id,
          skillId: s.skill_id,
          skillName: s.skill_name,
          toolId: s.tool_id,
          installPath: s.install_path,
          enabled: s.enabled,
          note: s.note,
        }))
      },

      addSkillToWorkspace: async (workspaceId, skillId) => {
        await invoke('add_skill_to_workspace_cmd', { workspaceId, skillId })
        await get().fetchWorkspaces()
      },

      removeSkillFromWorkspace: async (workspaceId, skillId) => {
        await invoke('remove_skill_from_workspace_cmd', { workspaceId, skillId })
        await get().fetchWorkspaces()
      },

      exportYaml: async (workspaceId) => {
        return invoke<string>('export_workspace_yaml', { workspaceId })
      },

      importYaml: async (yamlStr) => {
        const raw = await invoke<any>('import_workspace_yaml', { yamlStr })
        await get().fetchWorkspaces()
        return {
          workspaceId: raw.workspace_id,
          name: raw.name,
          importedSkills: raw.imported_skills,
          missingSkills: raw.missing_skills,
        }
      },
    }),
    {
      name: STORAGE_KEYS.workspace,
      partialize: (s) => ({ activeWorkspace: s.activeWorkspace }),
      onRehydrateStorage: () => {
        migrateLocalStorageKey(STORAGE_KEYS.workspace, STORAGE_KEYS.legacyWorkspace)
      },
    },
  ),
)
