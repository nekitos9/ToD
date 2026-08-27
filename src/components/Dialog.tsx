import { useEffect, useId, useRef, type ReactNode } from 'react'
import './dialog.css'

interface DialogProps {
  readonly actions: ReactNode
  readonly children: ReactNode
  readonly className?: string
  readonly onClose: () => void
  readonly open: boolean
  readonly title: string
}

export function Dialog({ actions, children, className, onClose, open, title }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
      dialog.querySelector<HTMLElement>('button:not(:disabled), [tabindex]:not([tabindex="-1"])')?.focus()
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
      if (openerRef.current?.isConnected) openerRef.current.focus()
      openerRef.current = null
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={`dialog${className ? ` ${className}` : ''}`}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dialog__surface">
        <h2 id={titleId}>{title}</h2>
        <div className="dialog__body">{children}</div>
        <div className="dialog__actions">{actions}</div>
      </div>
    </dialog>
  )
}
