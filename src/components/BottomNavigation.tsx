import type { ReactNode } from 'react'
import './layout.css'

interface BottomNavigationProps {
  readonly children: ReactNode
  readonly label?: string
}

export function BottomNavigation({
  children,
  label = 'Навигация по экрану',
}: BottomNavigationProps) {
  return (
    <nav className="bottom-navigation" aria-label={label}>
      <div className="bottom-navigation__inner">{children}</div>
    </nav>
  )
}

