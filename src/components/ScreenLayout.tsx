import type { ReactNode } from 'react'
import { FocusRegion } from './FocusRegion'
import './layout.css'

interface ScreenLayoutProps {
  readonly children: ReactNode
  readonly footer?: ReactNode
  readonly subtitle?: string
  readonly theme?: 'blue' | 'accent'
  readonly title: string
}

export function ScreenLayout({
  children,
  footer,
  subtitle,
  theme = 'blue',
  title,
}: ScreenLayoutProps) {
  return (
    <FocusRegion>
      <main className={`screen screen--${theme}`}>
        <div className="screen__circle screen__circle--first" aria-hidden="true" />
        <div className="screen__circle screen__circle--second" aria-hidden="true" />
        <div className="screen__scroll">
          <div className="screen__inner">
            <header className="screen__header">
              <h1>{title}</h1>
              {subtitle ? <p>{subtitle}</p> : null}
            </header>
            <div className="screen__content">{children}</div>
          </div>
        </div>
        {footer}
      </main>
    </FocusRegion>
  )
}

