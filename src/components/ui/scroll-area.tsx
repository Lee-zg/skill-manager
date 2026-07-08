import * as RadixScrollArea from '@radix-ui/react-scroll-area'
import { cn } from '@/lib/utils'

export function ScrollArea({
  className,
  children,
  ...props
}: RadixScrollArea.ScrollAreaProps) {
  return (
    <RadixScrollArea.Root
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <RadixScrollArea.Viewport className="h-full w-full rounded-[inherit]">
        {children}
      </RadixScrollArea.Viewport>
      <ScrollBar />
      <RadixScrollArea.Corner />
    </RadixScrollArea.Root>
  )
}

export function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: RadixScrollArea.ScrollAreaScrollbarProps) {
  return (
    <RadixScrollArea.Scrollbar
      orientation={orientation}
      className={cn(
        'flex touch-none select-none transition-colors',
        orientation === 'vertical' &&
          'h-full w-1 border-l border-l-transparent p-[1px]',
        orientation === 'horizontal' &&
          'h-1 flex-col border-t border-t-transparent p-[1px]',
        className,
      )}
      {...props}
    >
      <RadixScrollArea.Thumb className="relative flex-1 rounded-full bg-[var(--color-border)] hover:bg-[var(--color-bg-hover)]" />
    </RadixScrollArea.Scrollbar>
  )
}
