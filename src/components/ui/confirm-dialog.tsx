import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void | Promise<void>
  onOpenChange: (open: boolean) => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  danger,
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className="glass-panel fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-floating)] data-[state=open]:animate-scale-in"
        >
          <Dialog.Title className="m-0 text-[18px] font-semibold text-[var(--color-text-primary)]">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
            {description}
          </Dialog.Description>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="secondary" size="md" onClick={() => onOpenChange(false)}>
              {cancelText}
            </Button>
            <Button
              variant={danger ? 'danger' : 'default'}
              size="md"
              onClick={async () => {
                await onConfirm()
                onOpenChange(false)
              }}
            >
              {confirmText}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
