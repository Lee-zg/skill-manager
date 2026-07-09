import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-accent)] text-white shadow-[0_4px_14px_rgba(99,102,241,0.25)] hover:bg-[var(--color-accent-hover)]',
        secondary:
          'bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
        ghost:
          'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)]',
        danger:
          'bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.3)] text-[var(--color-danger)] hover:bg-[rgba(239,68,68,0.22)]',
        success:
          'bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.3)] text-[var(--color-success)] hover:bg-[rgba(34,197,94,0.22)]',
        outline:
          'border border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]',
      },
      size: {
        sm:   'h-7 px-2.5 text-[11px]',
        md:   'h-8 px-3',
        lg:   'h-9 px-4 text-[13px]',
        icon: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { buttonVariants }
