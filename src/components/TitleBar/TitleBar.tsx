import { getCurrentWindow } from '@tauri-apps/api/window'
import { Minus, Square, X } from 'lucide-react'

export default function TitleBar() {
  const win = getCurrentWindow()

  return (
    <header
      data-tauri-drag-region
      className="flex items-center justify-between h-10 px-4 shrink-0 select-none"
      style={{ background: 'var(--color-bg-panel)', borderBottom: '1px solid var(--color-border)' }}
    >
      {/* Left: App identity */}
      <div className="flex items-center gap-2 pointer-events-none">
        <div
          className="w-5 h-5 rounded"
          style={{ background: 'var(--color-accent)' }}
        />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          SkillHub
        </span>
      </div>

      {/* Right: Window controls */}
      <div className="flex items-center gap-0.5" style={{ pointerEvents: 'auto' }}>
        <WinBtn onClick={() => win.minimize()} title="Minimize">
          <Minus size={12} />
        </WinBtn>
        <WinBtn onClick={() => win.toggleMaximize()} title="Maximize">
          <Square size={11} />
        </WinBtn>
        <WinBtn onClick={() => win.close()} title="Close" danger>
          <X size={12} />
        </WinBtn>
      </div>
    </header>
  )
}

function WinBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center w-8 h-7 rounded transition-colors"
      style={{
        color: 'var(--color-text-secondary)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.background = danger ? 'var(--color-danger)' : 'var(--color-bg-hover)'
        el.style.color = danger ? '#fff' : 'var(--color-text-primary)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.background = 'transparent'
        el.style.color = 'var(--color-text-secondary)'
      }}
    >
      {children}
    </button>
  )
}
