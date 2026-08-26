import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import './controls.css'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly label: string
  readonly icon: ReactNode
  readonly tone?: 'neutral' | 'success' | 'danger' | 'warning'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { className = '', icon, label, tone = 'neutral', type = 'button', ...props },
    ref,
  ) {
    const classes = ['icon-button', `icon-button--${tone}`, className]
      .filter(Boolean)
      .join(' ')

    return (
      <button
        ref={ref}
        aria-label={label}
        className={classes}
        title={label}
        type={type}
        {...props}
      >
        <span aria-hidden="true">{icon}</span>
      </button>
    )
  },
)

