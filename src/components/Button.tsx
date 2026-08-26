import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import './controls.css'

export type ButtonVariant = 'primary' | 'truth' | 'dare' | 'ghost'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant
  readonly icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, className = '', icon, type = 'button', variant = 'primary', ...props },
  ref,
) {
  const classes = ['button', `button--${variant}`, className].filter(Boolean).join(' ')

  return (
    <button ref={ref} className={classes} type={type} {...props}>
      {icon ? <span className="button__icon" aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </button>
  )
})

