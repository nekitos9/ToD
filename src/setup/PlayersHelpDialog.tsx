import { useEffect, useId, useRef } from 'react'
import { Button } from '../components/Button'

interface PlayersHelpDialogProps {
  readonly onClose: () => void
  readonly open: boolean
}

export function PlayersHelpDialog({ onClose, open }: PlayersHelpDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
      dialog.dataset.state = 'open'
      return
    }
    if (!dialog.open) return

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      dialog.close()
      return
    }

    dialog.dataset.state = 'closing'
    const timeout = window.setTimeout(() => dialog.close(), 180)
    return () => window.clearTimeout(timeout)
  }, [open])

  return (
    <dialog
      aria-labelledby={titleId}
      className="players-help"
      onCancel={(event) => { event.preventDefault(); onClose() }}
      ref={dialogRef}
    >
      <button aria-label="Закрыть справку" className="players-help__close" onClick={onClose} type="button">×</button>
      <div className="players-help__surface">
        <h2 id={titleId}>Грани и «Отношения»</h2>
        <div className="players-help__body">
          <p>Грани выбираются в зависимости от вашей внутренней ханжи:</p>
          <p><strong>Целочка</strong> — самый скучный, как и вы. Никаких более-менее сложных заданий. Минимум прикосновений и взаимодействий. Никакой пошлости.</p>
          <p><strong>Обычный</strong> — название говорит само за себя. Есть взаимодействия и прикосновения, но без долгих поцелуев.</p>
          <p><strong>Полный раж</strong> — нет ограничений. Делайте со мной что хотите.</p>
          <p><strong>«В отношениях»</strong> означает, что игроку разрешены только карточки, допустимые для людей в отношениях.</p>
          <p><strong>Режимы игры:</strong><br /><strong>Ручной</strong> — вопросы и действия придумывают пользователи, при необходимости приложение может выдать карточку.<br /><strong>Автоматический</strong> — приложение сразу выдаёт карточки.</p>
        </div>
      </div>
      <Button className="players-help__confirm" onClick={onClose}>Ясно</Button>
    </dialog>
  )
}
