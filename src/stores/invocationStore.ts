import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

export interface ToolInvocationProfile {
  toolId: string
  scope: string
  exportMode: string
  basePath: string
  supportsDirectSlash: boolean
  supportsSkills: boolean
  supportsPromptShim: boolean
  enabled: boolean
}

export interface InvocationPreviewItem {
  invocationId: string
  skillId: string
  targetType: string
  targetId: string
  displayName: string
  commandName: string
  slug: string
  categoryIds: string[]
  workspaceId?: string
  exportMode: string
  destinationPath: string
  promptPath?: string
  invocationHint: string
  conflict?: string
}

export interface ExportPreview {
  targetType: string
  targetId: string
  toolId: string
  scope: string
  exportMode: string
  items: InvocationPreviewItem[]
  warnings: string[]
}

export interface PublishResult {
  published: number
  skipped: number
  errors: string[]
  items: InvocationPreviewItem[]
  routes: RoutePreviewItem[]
}

export interface ConfigMappingResult {
  mapped: number
  conflicts: number
  routes: RoutePreviewItem[]
  warnings: string[]
}

export interface SkillInvocation {
  id: string
  skillId: string
  toolId: string
  displayName: string
  commandName: string
  slug: string
  categoryIds: string[]
  workspaceId?: string
  targetType: string
  targetId: string
  scope: string
  exportMode: string
  exportedPath: string
  promptPath?: string
  status: string
  lastExportedAt?: number
}

export interface RouteExportPreviewItem {
  exportId: string
  routeId: string
  toolId: string
  scope: string
  exportMode: string
  expectedInvocation: string
  actualInvocation: string
  fallbackInvocation?: string
  destinationPath?: string
  promptPath?: string
  status: string
  conflict?: string
}

export interface InvocationRoute {
  id: string
  canonicalPath: string
  displayPath: string
  routeType: string
  workspaceId?: string
  skillId?: string
  alias?: string
  toolId: string
  scope: string
  slug: string
  status: string
  conflict?: string
  createdAt?: number
  updatedAt?: number
  exports: RouteExportPreviewItem[]
}

export interface RoutePreviewItem {
  routeId: string
  canonicalPath: string
  displayPath: string
  routeType: string
  workspaceId?: string
  skillId?: string
  alias?: string
  toolId: string
  scope: string
  slug: string
  status: string
  conflict?: string
  exports: RouteExportPreviewItem[]
}

export interface RoutePreview {
  targetType: string
  targetId: string
  toolId: string
  scope: string
  mode: string
  routes: RoutePreviewItem[]
  warnings: string[]
}

export interface RouteResolution {
  input: string
  normalizedInput: string
  toolId: string
  scope: string
  matched: boolean
  route?: InvocationRoute
  actualInvocations: string[]
  message: string
}

interface InvocationState {
  profiles: ToolInvocationProfile[]
  invocations: SkillInvocation[]
  routes: InvocationRoute[]
  preview?: ExportPreview
  routePreview?: RoutePreview
  loading: boolean
  message: string
  fetchProfiles: () => Promise<void>
  fetchInvocations: (filter?: {
    toolId?: string; workspaceId?: string; categoryId?: string
  }) => Promise<void>
  fetchInvocationRoutes: (filter?: {
    toolId?: string; workspaceId?: string; skillId?: string
  }) => Promise<void>
  previewInvocations: (data: {
    targetType: string; targetId: string; toolId: string; scope: string; exportMode: string
  }) => Promise<ExportPreview>
  removeInvocation: (id: string) => Promise<void>
  previewConfigMappings: (data: {
    targetType: string; targetId: string; toolId: string; scope?: string; mode: string
  }) => Promise<RoutePreview>
  addConfigMappings: (data: {
    targetType: string; targetId: string; toolId: string; scope?: string; mode: string
  }) => Promise<ConfigMappingResult>
  fetchConfigMappings: (filter?: {
    toolId?: string; workspaceId?: string; skillId?: string; status?: string
  }) => Promise<void>
  resolveInvocationRoute: (input: string, toolId: string, scope?: string) => Promise<RouteResolution>
  removeConfigMapping: (routeId: string) => Promise<void>
}

const mapProfile = (profile: any): ToolInvocationProfile => ({
  toolId: profile.tool_id,
  scope: profile.scope,
  exportMode: profile.export_mode,
  basePath: profile.base_path,
  supportsDirectSlash: Boolean(profile.supports_direct_slash),
  supportsSkills: Boolean(profile.supports_skills),
  supportsPromptShim: Boolean(profile.supports_prompt_shim),
  enabled: Boolean(profile.enabled),
})

const mapPreviewItem = (item: any): InvocationPreviewItem => ({
  invocationId: item.invocation_id,
  skillId: item.skill_id,
  targetType: item.target_type,
  targetId: item.target_id,
  displayName: item.display_name,
  commandName: item.command_name,
  slug: item.slug,
  categoryIds: item.category_ids ?? [],
  workspaceId: item.workspace_id,
  exportMode: item.export_mode,
  destinationPath: item.destination_path,
  promptPath: item.prompt_path,
  invocationHint: item.invocation_hint,
  conflict: item.conflict,
})

const mapRouteExport = (item: any): RouteExportPreviewItem => ({
  exportId: item.export_id ?? item.id,
  routeId: item.route_id,
  toolId: item.tool_id,
  scope: item.scope,
  exportMode: item.export_mode,
  expectedInvocation: item.expected_invocation,
  actualInvocation: item.actual_invocation,
  fallbackInvocation: item.fallback_invocation ?? undefined,
  destinationPath: item.destination_path ?? item.exported_path ?? undefined,
  promptPath: item.prompt_path ?? undefined,
  status: item.status,
  conflict: item.conflict ?? undefined,
})

const mapRoutePreviewItem = (item: any): RoutePreviewItem => ({
  routeId: item.route_id,
  canonicalPath: item.canonical_path,
  displayPath: item.display_path,
  routeType: item.route_type,
  workspaceId: item.workspace_id ?? undefined,
  skillId: item.skill_id ?? undefined,
  alias: item.alias ?? undefined,
  toolId: item.tool_id,
  scope: item.scope,
  slug: item.slug,
  status: item.status,
  conflict: item.conflict ?? undefined,
  exports: (item.exports ?? []).map(mapRouteExport),
})

const mapInvocationRoute = (route: any): InvocationRoute => ({
  id: route.id,
  canonicalPath: route.canonical_path,
  displayPath: route.display_path,
  routeType: route.route_type,
  workspaceId: route.workspace_id ?? undefined,
  skillId: route.skill_id ?? undefined,
  alias: route.alias ?? undefined,
  toolId: route.tool_id,
  scope: route.scope,
  slug: route.slug,
  status: route.status,
  conflict: route.conflict ?? undefined,
  createdAt: route.created_at,
  updatedAt: route.updated_at,
  exports: (route.exports ?? []).map(mapRouteExport),
})

const mapPreview = (preview: any): ExportPreview => ({
  targetType: preview.target_type,
  targetId: preview.target_id,
  toolId: preview.tool_id,
  scope: preview.scope,
  exportMode: preview.export_mode,
  items: (preview.items ?? []).map(mapPreviewItem),
  warnings: preview.warnings ?? [],
})

const mapRoutePreview = (preview: any): RoutePreview => ({
  targetType: preview.target_type,
  targetId: preview.target_id,
  toolId: preview.tool_id,
  scope: preview.scope,
  mode: preview.mode,
  routes: (preview.routes ?? []).map(mapRoutePreviewItem),
  warnings: preview.warnings ?? [],
})

const mapInvocation = (invocation: any): SkillInvocation => ({
  id: invocation.id,
  skillId: invocation.skill_id,
  toolId: invocation.tool_id,
  displayName: invocation.display_name,
  commandName: invocation.command_name,
  slug: invocation.slug,
  categoryIds: invocation.category_ids ?? [],
  workspaceId: invocation.workspace_id,
  targetType: invocation.target_type,
  targetId: invocation.target_id,
  scope: invocation.scope,
  exportMode: invocation.export_mode,
  exportedPath: invocation.exported_path,
  promptPath: invocation.prompt_path,
  status: invocation.status,
  lastExportedAt: invocation.last_exported_at,
})

export const useInvocationStore = create<InvocationState>((set, get) => ({
  profiles: [],
  invocations: [],
  routes: [],
  preview: undefined,
  routePreview: undefined,
  loading: false,
  message: '',

  fetchProfiles: async () => {
    const raw = await invoke<any[]>('list_tool_invocation_profiles_cmd')
    set({ profiles: raw.map(mapProfile) })
  },

  fetchInvocations: async (filter = {}) => {
    const raw = await invoke<any[]>('list_invocations_cmd', {
      toolId: filter.toolId ?? null,
      workspaceId: filter.workspaceId ?? null,
      categoryId: filter.categoryId ?? null,
    })
    set({ invocations: raw.map(mapInvocation) })
  },

  fetchInvocationRoutes: async (filter = {}) => {
    const raw = await invoke<any[]>('list_invocation_routes_cmd', {
      toolId: filter.toolId ?? null,
      workspaceId: filter.workspaceId ?? null,
      skillId: filter.skillId ?? null,
    })
    set({ routes: raw.map(mapInvocationRoute) })
  },

  previewInvocations: async (data) => {
    set({ loading: true, message: '' })
    try {
      const raw = await invoke<any>('preview_invocations_cmd', data)
      const preview = mapPreview(raw)
      set({ preview })
      return preview
    } finally {
      set({ loading: false })
    }
  },

  removeInvocation: async (id) => {
    await invoke('remove_invocation_cmd', { id })
    await get().fetchInvocations()
  },

  previewConfigMappings: async (data) => {
    set({ loading: true, message: '' })
    try {
      const raw = await invoke<any>('preview_config_mappings_cmd', {
        targetType: data.targetType,
        targetId: data.targetId,
        toolId: data.toolId,
        scope: data.scope ?? 'user',
        mode: data.mode,
      })
      const routePreview = mapRoutePreview(raw)
      set({ routePreview })
      return routePreview
    } finally {
      set({ loading: false })
    }
  },

  addConfigMappings: async (data) => {
    set({ loading: true, message: '' })
    try {
      const raw = await invoke<any>('add_config_mappings_cmd', {
        targetType: data.targetType,
        targetId: data.targetId,
        toolId: data.toolId,
        scope: data.scope ?? 'user',
        mode: data.mode,
      })
      const routePreview = mapRoutePreview(raw)
      const result: ConfigMappingResult = {
        mapped: routePreview.routes.filter((route) => route.status === 'mapped').length,
        conflicts: routePreview.routes.filter((route) => route.status === 'conflict').length,
        routes: routePreview.routes,
        warnings: routePreview.warnings,
      }
      set({
        routePreview,
        message: `已添加 ${result.mapped} 条映射${result.conflicts ? `，${result.conflicts} 条存在冲突` : ''}`,
      })
      await get().fetchConfigMappings({ toolId: data.toolId })
      return result
    } finally {
      set({ loading: false })
    }
  },

  fetchConfigMappings: async (filter = {}) => {
    const raw = await invoke<any[]>('list_config_mappings_cmd', {
      toolId: filter.toolId ?? null,
      workspaceId: filter.workspaceId ?? null,
      skillId: filter.skillId ?? null,
      status: filter.status ?? null,
    })
    set({ routes: raw.map(mapInvocationRoute) })
  },

  resolveInvocationRoute: async (input, toolId, scope = 'user') => {
    const raw = await invoke<any>('resolve_invocation_route_cmd', { input, toolId, scope })
    return {
      input: raw.input,
      normalizedInput: raw.normalized_input,
      toolId: raw.tool_id,
      scope: raw.scope,
      matched: raw.matched,
      route: raw.route ? mapInvocationRoute(raw.route) : undefined,
      actualInvocations: raw.actual_invocations ?? [],
      message: raw.message,
    }
  },

  removeConfigMapping: async (routeId) => {
    await invoke('remove_config_mapping_cmd', { routeId })
    await get().fetchConfigMappings()
  },
}))
