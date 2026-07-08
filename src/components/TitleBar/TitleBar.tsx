import { getCurrentWindow } from '@tauri-apps/api/window'
import { MinusIcon, SquareIcon, XIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

export default function TitleBar() {
  const win = getCurrentWindow()

  return (
    <header
      data-tauri-drag-region
      className="flex items-center justify-between h-10 px-4 shrink-0 select-none bg-[var(--color-bg-panel)] border-b border-[var(--color-border)]"
    >
      {/* Left: App identity */}
      <div className="flex items-center gap-2 pointer-events-none">
        {/* Logo mark */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="18" height="18" rx="4" fill="var(--color-accent)" />
          <path d="M5 13 L9 5 L13 13" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <line x1="6.5" y1="10.5" x2="11.5" y2="10.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
          SkillHub
        </span>
      </div>

      {/* Right: Window controls */}
      <div className="flex items-center gap-0.5" style={{ pointerEvents: 'auto' }}>
        <WinBtn onClick={() => win.minimize()} label="Minimize">
          <MinusIcon size={12} />
        </WinBtn>
        <WinBtn onClick={() => win.toggleMaximize()} label="Maximize">
          <SquareIcon size={11} />
        </WinBtn>
        <WinBtn onClick={() => win.close()} label="Close" danger>
          <XIcon size={12} />
        </WinBtn>
      </div>
    </header>
  )
}

function WinBtn({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex items-center justify-center w-8 h-7 rounded transition-colors duration-100',
        'text-[var(--color-text-secondary)] bg-transparent border-none cursor-pointer',
        danger
          ? 'hover:bg-[var(--color-danger)] hover:text-white'
          : 'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
      )}
    >
      {children}
    </button>
  )
}
