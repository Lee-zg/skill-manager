import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-[var(--color-border)] bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]',
        accent:
          'border-[rgba(99,102,241,0.3)] bg-[var(--color-accent-muted)] text-[var(--color-accent-hover)]',
        success:
          'border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.12)] text-[var(--color-success)]',
        danger:
          'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.12)] text-[var(--color-danger)]',
        warning:
          'border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.12)] text-[var(--color-warning)]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
