import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  SaveIcon, RefreshCwIcon, DownloadIcon,
  CheckCircleIcon, AlertCircleIcon, Loader2Icon,
} from '@/components/icons'
import { useUpdater } from '@/hooks/useUpdater'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItemEl,
} from '@/components/ui/select'

interface Settings {
  launchAtStartup: boolean
  defaultTool: string
  theme: string
  language: string
}

interface ToolPath {
  toolId: string
  name: string
  path: string
  exists: boolean
}

interface AppStats {
  totalSkills: number
  enabledSkills: number
  totalWorkspaces: number
  totalCategories: number
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    launchAtStartup: false, defaultTool: 'claude-code',
    theme: 'dark', language: 'zh',
  })
  const [toolPaths, setToolPaths] = useState<ToolPath[]>([])
  const [stats, setStats] = useState<AppStats | null>(null)
  const [saved, setSaved] = useState(false)

  const { status: updateStatus, checkUpdate, install } = useUpdater()

  useEffect(() => {
    Promise.all([
      invoke<any>('get_settings'),
      invoke<any[]>('get_tool_paths'),
      invoke<any>('get_app_stats'),
    ]).then(([s, paths, st]) => {
      setSettings({
        launchAtStartup: s.launch_at_startup,
        defaultTool: s.default_tool,
        theme: s.theme,
        language: s.language,
      })
      setToolPaths(paths.map((p: any) => ({
        toolId: p.tool_id, name: p.name,
        path: p.path, exists: p.exists,
      })))
      setStats({
        totalSkills: st.total_skills, enabledSkills: st.enabled_skills,
        totalWorkspaces: st.total_workspaces, totalCategories: st.total_categories,
      })
    }).catch(console.error)
  }, [])

  const handleSave = async () => {
    await invoke('update_settings', {
      launchAtStartup: settings.launchAtStartup,
      defaultTool: settings.defaultTool,
      theme: settings.theme,
      language: settings.language,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Page header */}
      <div className="px-6 py-4 shrink-0 border-b border-[var(--color-border)]">
        <h1 className="text-[18px] font-bold text-[var(--color-text-primary)]">设置</h1>
        <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">应用配置与偏好</p>
      </div>

      <div className="p-6 flex flex-col gap-6 max-w-2xl">

        {/* Stats */}
        {stats && (
          <Section title="使用统计">
            <div className="grid grid-cols-2 gap-3 p-4">
              {[
                { label: '已安装技能', value: stats.totalSkills },
                { label: '已启用技能', value: stats.enabledSkills },
                { label: '工作区数量', value: stats.totalWorkspaces },
                { label: '自定义分类', value: stats.totalCategories },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-3 rounded-md bg-[var(--color-bg-surface)] border border-[var(--color-border)]"
                >
                  <p className="text-[22px] font-bold text-[var(--color-accent)] m-0">{item.value}</p>
                  <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* General */}
        <Section title="通用">
          <SettingRow label="开机自启动" description="系统启动时自动打开 SkillHub">
            <Switch
              checked={settings.launchAtStartup}
              onCheckedChange={(v) => setSettings({ ...settings, launchAtStartup: v })}
            />
          </SettingRow>
          <Separator />
          <SettingRow label="默认工具" description="安装技能时默认使用的工具">
            <SelectRoot
              value={settings.defaultTool}
              onValueChange={(v) => setSettings({ ...settings, defaultTool: v })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItemEl value="claude-code">Claude Code</SelectItemEl>
                <SelectItemEl value="agents">Agents</SelectItemEl>
                <SelectItemEl value="cc-switch">cc-switch</SelectItemEl>
              </SelectContent>
            </SelectRoot>
          </SettingRow>
          <Separator />
          <SettingRow label="界面语言" description="">
            <SelectRoot
              value={settings.language}
              onValueChange={(v) => setSettings({ ...settings, language: v })}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItemEl value="zh">中文</SelectItemEl>
                <SelectItemEl value="en">English</SelectItemEl>
              </SelectContent>
            </SelectRoot>
          </SettingRow>
        </Section>

        {/* Tool paths */}
        <Section title="工具路径">
          {toolPaths.map((tp, i) => (
            <div key={tp.toolId}>
              {i > 0 && <Separator />}
              <div className="flex items-center gap-3 py-3 px-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[var(--color-text-primary)]">{tp.name}</span>
                    <Badge variant={tp.exists ? 'success' : 'danger'}>
                      {tp.exists ? '已检测' : '未找到'}
                    </Badge>
                  </div>
                  <p
                    className="truncate text-[11px] text-[var(--color-text-placeholder)] mt-0.5"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {tp.path}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </Section>

        {/* Auto-update */}
        <Section title="软件更新">
          <div className="px-4 py-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-[var(--color-text-primary)]">当前版本</p>
                <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">SkillHub v0.1.0</p>
              </div>
              <UpdateButton status={updateStatus} onCheck={checkUpdate} onInstall={install} />
            </div>
            <UpdateFeedback status={updateStatus} />
          </div>
        </Section>

        {/* About */}
        <Section title="关于">
          <div className="flex items-center gap-3 p-4">
            <div
              className="flex items-center justify-center rounded-lg text-xl"
              style={{
                width: 40, height: 40,
                background: 'var(--color-accent-muted)',
                border: '1px solid rgba(99,102,241,0.3)',
              }}
            >
              🎯
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">SkillHub</p>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                AI Skills 管理与安装工具 · © 2026
              </p>
            </div>
          </div>
        </Section>

        {/* Save */}
        <Button
          onClick={handleSave}
          variant={saved ? 'success' : 'default'}
          size="lg"
          className="self-start px-5 gap-2 transition-all duration-300"
        >
          {saved ? <CheckCircleIcon size={14} /> : <SaveIcon size={14} />}
          {saved ? '已保存！' : '保存设置'}
        </Button>
      </div>
    </div>
  )
}

// ── Update sub-components ─────────────────────────────────────────────────────

function UpdateButton({
  status, onCheck, onInstall,
}: {
  status: ReturnType<typeof useUpdater>['status']
  onCheck: () => void
  onInstall: () => void
}) {
  if (status.type === 'checking') {
    return (
      <Button variant="secondary" size="sm" disabled>
        <Loader2Icon size={12} className="animate-spin" /> 检查中…
      </Button>
    )
  }
  if (status.type === 'up-to-date') {
    return (
      <Button variant="success" size="sm" disabled>
        <CheckCircleIcon size={12} /> 已是最新
      </Button>
    )
  }
  if (status.type === 'available') {
    return (
      <Button variant="outline" size="sm" onClick={onInstall} className="border-[rgba(99,102,241,0.4)] text-[var(--color-accent)] bg-[var(--color-accent-muted)]">
        <DownloadIcon size={12} /> 安装 {status.update.version}
      </Button>
    )
  }
  if (status.type === 'downloading') {
    return (
      <Button variant="outline" size="sm" disabled className="border-[rgba(99,102,241,0.4)] text-[var(--color-accent)]">
        <Loader2Icon size={12} className="animate-spin" /> {status.progress}%
      </Button>
    )
  }
  if (status.type === 'ready') {
    return (
      <Button variant="success" size="sm" disabled>
        <CheckCircleIcon size={12} /> 即将重启…
      </Button>
    )
  }
  if (status.type === 'error') {
    return (
      <Button variant="danger" size="sm" onClick={onCheck}>
        <AlertCircleIcon size={12} /> 重试
      </Button>
    )
  }
  return (
    <Button variant="secondary" size="sm" onClick={onCheck}>
      <RefreshCwIcon size={12} /> 检查更新
    </Button>
  )
}

function UpdateFeedback({ status }: { status: ReturnType<typeof useUpdater>['status'] }) {
  if (status.type === 'available') {
    return (
      <p className="text-[11px] text-[var(--color-text-secondary)]">
        发现新版本{' '}
        <strong className="text-[var(--color-accent)]">{status.update.version}</strong>
        {status.update.body ? ` — ${status.update.body}` : ''}
      </p>
    )
  }
  if (status.type === 'downloading') {
    return (
      <div className="h-1 rounded-sm overflow-hidden bg-[var(--color-bg-surface)]">
        <div
          className="h-full bg-[var(--color-accent)] transition-[width] duration-200"
          style={{ width: `${status.progress}%` }}
        />
      </div>
    )
  }
  if (status.type === 'error') {
    return (
      <p className="text-[11px] text-[var(--color-danger)]">检查失败：{status.message}</p>
    )
  }
  return null
}

// ── Layout sub-components ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-placeholder)] mb-3">
        {title}
      </h2>
      <div className="bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function SettingRow({ label, description, children }: {
  label: string; description: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{label}</p>
        {description && (
          <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}
