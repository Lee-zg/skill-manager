import * as RadixSelect from '@radix-ui/react-select'
import { ChevronRightIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

// ── Root re-exports ──────────────────────────────────────────────────────────
export const SelectRoot     = RadixSelect.Root
export const SelectValue    = RadixSelect.Value
export const SelectGroup    = RadixSelect.Group
export const SelectLabel    = RadixSelect.Label
export const SelectItem     = RadixSelect.Item
export const SelectSeparator = RadixSelect.Separator

// ── Trigger ──────────────────────────────────────────────────────────────────
export function SelectTrigger({
  className,
  children,
  ...props
}: RadixSelect.SelectTriggerProps) {
  return (
    <RadixSelect.Trigger
      className={cn(
        'flex h-10 items-center justify-between gap-2 rounded-md border border-[var(--color-border)]',
        'bg-[var(--color-bg-surface)] px-3 text-[15px] text-[var(--color-text-secondary)]',
        'transition-[transform,border-color,background-color,color] duration-150 cursor-pointer select-none',
        'hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]',
        'focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]',
        'data-[placeholder]:text-[var(--color-text-placeholder)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      <RadixSelect.Icon asChild>
        <span style={{ display: 'flex', color: 'var(--color-text-placeholder)', rotate: '90deg' }}>
          <ChevronRightIcon size={14} />
        </span>
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  )
}

// ── Content / Viewport ───────────────────────────────────────────────────────
export function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: RadixSelect.SelectContentProps) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        position={position}
        sideOffset={4}
        className={cn(
          'z-50 min-w-[8rem] overflow-hidden rounded-lg',
          'border border-[var(--color-border)] bg-[var(--color-bg-panel)]',
          'shadow-[0_8px_24px_rgba(0,0,0,0.4)]',
          'data-[state=open]:animate-fade-in',
          className,
        )}
        {...props}
      >
        <RadixSelect.Viewport className="p-1">{children}</RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  )
}

// ── Item ─────────────────────────────────────────────────────────────────────
export function SelectItemEl({
  className,
  children,
  ...props
}: RadixSelect.SelectItemProps) {
  return (
    <RadixSelect.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-[14px] outline-none',
        'text-[var(--color-text-secondary)] transition-colors duration-100',
        'focus:bg-[var(--color-accent-muted)] focus:text-[var(--color-accent-hover)]',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  )
}
