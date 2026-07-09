export const APP_NAME = 'SkillManager'
export const APP_VERSION = '0.1.0'

export const STORAGE_KEYS = {
  onboarding: 'skillmanager-onboarded',
  legacyOnboarding: 'skillhub-onboarded',
  workspace: 'skillmanager-workspace',
  legacyWorkspace: 'skillhub-workspace',
} as const

/**
 * 迁移旧品牌命名下的 localStorage key，避免改名后用户需要重新初始化。
 */
export function migrateLocalStorageKey(currentKey: string, legacyKey: string) {
  if (localStorage.getItem(currentKey) !== null) return

  const legacyValue = localStorage.getItem(legacyKey)
  if (legacyValue !== null) {
    localStorage.setItem(currentKey, legacyValue)
  }
}
