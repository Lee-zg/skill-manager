import { NavLink, useLocation } from 'react-router-dom'
import { Layers, LayoutGrid, Compass, Package, Settings } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import CategoryTree from '@/components/CategoryTree/CategoryTree'

const NAV_ITEMS = [
  { to: '/skills',     icon: Layers,      label: '技能库' },
  { to: '/workspaces', icon: LayoutGrid,  label: '工作区' },
  { to: '/discover',   icon: Compass,     label: '发现'   },
  { to: '/repos',      icon: Package,     label: '仓库'   },
]

export default function Sidebar() {
  const location = useLocation()
  const { activeWorkspace } = useWorkspaceStore()
  const isSkillsPage = location.pathname.startsWith('/skills')

  return (
    <aside
      className="flex flex-col shrink-0 h-full overflow-hidden"
      style={{
        width: 180,
        background: 'var(--color-bg-panel)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 p-2 pt-3 shrink-0">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-150 no-underline"
              style={{
                background: active ? 'var(--color-accent-muted)' : 'transparent',
                color: active ? 'var(--color-accent-hover)' : 'var(--color-text-secondary)',
                fontSize: 13,
                fontWeight: active ? 500 : 400,
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--color-bg-surface)'
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent'
              }}
            >
              <Icon size={15} strokeWidth={active ? 2 : 1.5} />
              <span>{label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Category tree — only on Skills page */}
      {isSkillsPage && (
        <>
          <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 8px' }} />
          <div
            className="flex-1 overflow-y-auto"
            style={{ padding: '4px 0' }}
          >
            <p style={{ fontSize: 10, color: 'var(--color-text-placeholder)', padding: '4px 12px 2px',
              textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              分类
            </p>
            <CategoryTree />
          </div>
        </>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--color-border)', margin: '0 8px' }} />

      {/* Settings */}
      <div className="p-2">
        <NavLink
          to="/settings"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-150 no-underline"
          style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-surface)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          <Settings size={15} strokeWidth={1.5} />
          <span>设置</span>
        </NavLink>
      </div>

      {/* Active workspace bubble */}
      {activeWorkspace && (
        <div
          className="m-2 p-2.5 rounded-md"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {activeWorkspace.name}
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-placeholder)', margin: 0 }}>
            {activeWorkspace.skillCount ?? 0} 个技能
          </p>
        </div>
      )}
    </aside>
  )
}
