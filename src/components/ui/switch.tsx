/**
 * Switch — cc-switch style: pill track with smooth sliding thumb.
 * Built on @radix-ui/react-switch for full a11y.
 */
import * as RadixSwitch from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

export interface SwitchProps extends RadixSwitch.SwitchProps {
  className?: string
}

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <RadixSwitch.Root
      className={cn(
        // Track
        'group relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer rounded-full',
        'border-2 border-transparent outline-none',
        'transition-colors duration-200 ease-in-out',
        'focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-base)]',
        'data-[state=checked]:bg-[var(--color-accent)]',
        'data-[state=unchecked]:bg-[var(--color-bg-hover)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadixSwitch.Thumb
        className={cn(
          // Thumb
          'pointer-events-none block h-[16px] w-[16px] rounded-full bg-white',
          'shadow-[0_1px_4px_rgba(0,0,0,0.4)]',
          'ring-0 transition-transform duration-200 ease-in-out',
          'data-[state=checked]:translate-x-[18px]',
          'data-[state=unchecked]:translate-x-0',
        )}
      />
    </RadixSwitch.Root>
  )
}
