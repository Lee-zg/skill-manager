import { NavLink, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import {
  LayersIcon, LayoutGridIcon, CompassIcon, PackageIcon, SettingsIcon, TerminalIcon,
} from '@/components/icons'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import CategoryTree from '@/components/CategoryTree/CategoryTree'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/skills',     Icon: LayersIcon,      label: '技能库' },
  { to: '/workspaces', Icon: LayoutGridIcon,  label: '工作区' },
  { to: '/discover',   Icon: CompassIcon,     label: '发现'   },
  { to: '/repos',      Icon: PackageIcon,     label: '仓库'   },
  { to: '/invocations', Icon: TerminalIcon,   label: '映射'   },
]

export default function Sidebar() {
  const location = useLocation()
  const { activeWorkspace, fetchWorkspaces } = useWorkspaceStore()
  const isSkillsPage = location.pathname.startsWith('/skills')

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  return (
    <aside
      className="flex flex-col shrink-0 h-full overflow-hidden"
      style={{ width: 220, background: 'var(--color-bg-panel)', borderRight: '1px solid var(--color-border)' }}
    >
      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 p-2 pt-3 shrink-0">
        {NAV_ITEMS.map(({ to, Icon, label }) => {
          const active = location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 no-underline text-[16px]',
                active
                  ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-hover)] font-medium'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]',
              )}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Category tree — only on Skills page */}
      {isSkillsPage && (
        <>
          <Separator className="mx-2 w-auto" />
          <div className="flex-1 overflow-y-auto py-1">
            <p className="px-3 py-1.5 text-[12px] font-semibold uppercase text-[var(--color-text-placeholder)]">
              分类
            </p>
            <CategoryTree />
          </div>
        </>
      )}

      <Separator className="mx-2 w-auto" />

      {/* Settings */}
      <div className="p-2">
        <NavLink
          to="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 no-underline text-[16px]',
            location.pathname.startsWith('/settings')
              ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-hover)] font-medium'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]',
          )}
        >
          <SettingsIcon size={18} />
          <span>设置</span>
        </NavLink>
      </div>

      {/* Active workspace bubble */}
      {activeWorkspace && (
        <NavLink
          to="/workspaces"
          className="m-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-2.5 no-underline transition-all duration-150 hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-hover)]"
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
            <span className="text-[14px] font-medium text-[var(--color-text-primary)]">
              {activeWorkspace.name}
            </span>
          </div>
          <p className="m-0 text-[13px] text-[var(--color-text-placeholder)]">
            {activeWorkspace.skillCount ?? 0} 个技能
          </p>
        </NavLink>
      )}
    </aside>
  )
}
