import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'flex h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)]',
        'px-3 py-1 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)]',
        'transition-colors duration-150',
        'focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
