import { invoke } from '@tauri-apps/api/core'

export interface TargetInfo {
  toolId: string
  name: string
  userDir?: string
  projectDir?: string
  supportsSymlink: boolean
  requiresMaterializedAlias: boolean
  available: boolean
  refreshHint?: string
}

export interface InstallTargetRequest {
  target: string
  alias?: string
}

export interface InstallPreviewTarget {
  target: string
  alias: string
  destinationPath: string
  mode: string
  conflict?: string
}

export interface InstallPreview {
  canonicalName: string
  displayName: string
  version: string
  contentHash: string
  sourcePath: string
  warnings: string[]
  targets: InstallPreviewTarget[]
}

export interface CanonicalInstallResult {
  success: boolean
  message: string
  skillId?: string
  canonicalName?: string
  version?: string
  warnings: string[]
}

export interface DoctorReport {
  checked: number
  issues: {
    installationId: string
    skillId: string
    target: string
    path: string
    issueType: string
    message: string
  }[]
}

export async function listTargets(): Promise<TargetInfo[]> {
  const raw = await invoke<any[]>('list_targets_cmd')
  return raw.map(mapTargetInfo)
}

export async function previewInstall(input: {
  source: string
  targets: InstallTargetRequest[]
  scope?: string
  projectPath?: string
  categoryIds?: string[]
  workspaceId?: string
}): Promise<InstallPreview> {
  const raw = await invoke<any>('preview_install_cmd', { request: toInstallRequest(input) })
  return mapInstallPreview(raw)
}

export async function installCanonicalSkill(input: {
  source: string
  targets: InstallTargetRequest[]
  scope?: string
  projectPath?: string
  categoryIds?: string[]
  workspaceId?: string
}): Promise<CanonicalInstallResult> {
  const raw = await invoke<any>('install_canonical_skill_cmd', { request: toInstallRequest(input) })
  return {
    success: Boolean(raw.success),
    message: raw.message ?? '',
    skillId: raw.skill_id,
    canonicalName: raw.canonical_name,
    version: raw.version,
    warnings: raw.warnings ?? [],
  }
}

export async function runDoctor(): Promise<DoctorReport> {
  const raw = await invoke<any>('doctor_cmd')
  return mapDoctorReport(raw)
}

export async function repairInstallations(): Promise<DoctorReport> {
  const raw = await invoke<any>('repair_cmd')
  return mapDoctorReport(raw)
}

function toInstallRequest(input: {
  source: string
  targets: InstallTargetRequest[]
  scope?: string
  projectPath?: string
  categoryIds?: string[]
  workspaceId?: string
}) {
  return {
    source: input.source,
    targets: input.targets,
    scope: input.scope ?? 'user',
    project_path: input.projectPath ?? null,
    category_ids: input.categoryIds ?? [],
    workspace_id: input.workspaceId ?? null,
    trust: false,
  }
}

function mapTargetInfo(raw: any): TargetInfo {
  return {
    toolId: raw.tool_id,
    name: raw.name,
    userDir: raw.user_dir,
    projectDir: raw.project_dir,
    supportsSymlink: Boolean(raw.supports_symlink),
    requiresMaterializedAlias: Boolean(raw.requires_materialized_alias),
    available: Boolean(raw.available),
    refreshHint: raw.refresh_hint,
  }
}

function mapInstallPreview(raw: any): InstallPreview {
  return {
    canonicalName: raw.canonical_name,
    displayName: raw.display_name,
    version: raw.version,
    contentHash: raw.content_hash,
    sourcePath: raw.source_path,
    warnings: raw.warnings ?? [],
    targets: (raw.targets ?? []).map((target: any) => ({
      target: target.target,
      alias: target.alias,
      destinationPath: target.destination_path,
      mode: target.mode,
      conflict: target.conflict,
    })),
  }
}

function mapDoctorReport(raw: any): DoctorReport {
  return {
    checked: raw.checked ?? 0,
    issues: (raw.issues ?? []).map((issue: any) => ({
      installationId: issue.installation_id,
      skillId: issue.skill_id,
      target: issue.target,
      path: issue.path,
      issueType: issue.issue_type,
      message: issue.message,
    })),
  }
}
