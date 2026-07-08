import * as RadixTooltip from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

export const TooltipProvider = RadixTooltip.Provider
export const TooltipRoot     = RadixTooltip.Root
export const TooltipTrigger  = RadixTooltip.Trigger

export function TooltipContent({
  className,
  sideOffset = 5,
  ...props
}: RadixTooltip.TooltipContentProps) {
  return (
    <RadixTooltip.Portal>
      <RadixTooltip.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 rounded-md border border-[var(--color-border)]',
          'bg-[var(--color-bg-panel)] px-2.5 py-1.5',
          'text-[11px] text-[var(--color-text-secondary)]',
          'shadow-[0_4px_16px_rgba(0,0,0,0.3)]',
          'animate-fade-in',
          className,
        )}
        {...props}
      />
    </RadixTooltip.Portal>
  )
}

/** Convenient single-import wrapper */
export function Tooltip({
  content,
  children,
  delayDuration = 400,
}: {
  content: React.ReactNode
  children: React.ReactNode
  delayDuration?: number
}) {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <TooltipContent>{content}</TooltipContent>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}
