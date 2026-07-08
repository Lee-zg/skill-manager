import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Save, RefreshCw } from 'lucide-react'

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
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>设置</h1>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
          应用配置与偏好
        </p>
      </div>

      <div className="p-6 flex flex-col gap-6 max-w-2xl">
        {/* Stats */}
        {stats && (
          <Section title="使用统计">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '已安装技能', value: stats.totalSkills },
                { label: '已启用技能', value: stats.enabledSkills },
                { label: '工作区数量', value: stats.totalWorkspaces },
                { label: '自定义分类', value: stats.totalCategories },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-md"
                  style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-accent)', margin: 0 }}>
                    {item.value}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* General */}
        <Section title="通用">
          <SettingRow label="开机自启动" description="系统启动时自动打开 SkillHub">
            <Toggle
              checked={settings.launchAtStartup}
              onChange={(v) => setSettings({ ...settings, launchAtStartup: v })}
            />
          </SettingRow>
          <SettingRow label="默认工具" description="安装技能时默认使用的工具">
            <select value={settings.defaultTool}
              onChange={(e) => setSettings({ ...settings, defaultTool: e.target.value })}
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)',
                fontSize: 12, padding: '5px 8px' }}>
              <option value="claude-code">Claude Code</option>
              <option value="agents">Agents</option>
              <option value="cc-switch">cc-switch</option>
            </select>
          </SettingRow>
          <SettingRow label="界面语言" description="">
            <select value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)',
                fontSize: 12, padding: '5px 8px' }}>
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </SettingRow>
        </Section>

        {/* Tool paths */}
        <Section title="工具路径">
          {toolPaths.map((tp) => (
            <div key={tp.toolId} className="flex items-center gap-3 py-2"
              style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>
                    {tp.name}
                  </span>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 'var(--radius-full)',
                    background: tp.exists ? 'var(--color-success)' + '20' : 'var(--color-danger)' + '20',
                    color: tp.exists ? 'var(--color-success)' : 'var(--color-danger)',
                    border: `1px solid ${tp.exists ? 'var(--color-success)' + '40' : 'var(--color-danger)' + '40'}`,
                  }}>
                    {tp.exists ? '已检测' : '未找到'}
                  </span>
                </div>
                <p className="truncate" style={{ fontSize: 11, color: 'var(--color-text-placeholder)',
                  fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {tp.path}
                </p>
              </div>
            </div>
          ))}
        </Section>

        {/* About */}
        <Section title="关于">
          <div className="flex items-center gap-3 p-3 rounded-md"
            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-center rounded-lg"
              style={{ width: 40, height: 40, background: 'var(--color-accent-muted)',
                border: '1px solid rgba(99,102,241,0.3)', fontSize: 20 }}>
              🎯
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                SkillHub v0.1.0
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                AI Skills 管理与安装工具
              </p>
            </div>
          </div>
        </Section>

        {/* Save button */}
        <button onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-md self-start"
          style={{ background: saved ? 'var(--color-success)' : 'var(--color-accent)',
            border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'background 300ms' }}>
          {saved ? <RefreshCw size={14} /> : <Save size={14} />}
          {saved ? '已保存！' : '保存设置'}
        </button>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-placeholder)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        {title}
      </h2>
      <div className="flex flex-col gap-1"
        style={{ background: 'var(--color-bg-panel)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden', padding: '4px 0' }}>
        {children}
      </div>
    </div>
  )
}

function SettingRow({ label, description, children }: {
  label: string; description: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div>
        <p style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{label}</p>
        {description && (
          <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 'var(--radius-full)', border: 'none',
        cursor: 'pointer', position: 'relative',
        background: checked ? 'var(--color-accent)' : 'var(--color-bg-hover)',
        transition: 'background 200ms',
      }}>
      <span style={{
        position: 'absolute', top: 3,
        left: checked ? 20 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff',
        transition: 'left 200ms var(--ease-standard)',
      }} />
    </button>
  )
}
