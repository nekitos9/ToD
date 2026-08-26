import { useEffect, useId, useRef, type ReactNode } from 'react'
import './dialog.css'

interface DialogProps {
  readonly actions: ReactNode
  readonly children: ReactNode
  readonly onClose: () => void
  readonly open: boolean
  readonly title: string
}

export function Dialog({ actions, children, onClose, open, title }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="dialog"
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
