import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Workspace {
  id: string
  name: string
  description?: string
  toolId?: string
  color: string
  icon: string
  isActive: boolean
  skillCount?: number
}

interface WorkspaceState {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  setWorkspaces: (ws: Workspace[]) => void
  setActiveWorkspace: (ws: Workspace | null) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspaces: [],
      activeWorkspace: null,
      setWorkspaces: (workspaces) => set({ workspaces }),
      setActiveWorkspace: (ws) => set({ activeWorkspace: ws }),
    }),
    { name: 'skillhub-workspace' },
  ),
)
