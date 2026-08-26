import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the component gallery', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Компоненты' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Далее' })).toBeDisabled()
  })

  it('shows the imported workbook summary', () => {
    render(<App />)

    expect(screen.getByText('103')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('opens and closes the example dialog', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Открыть окно' }))
    expect(screen.getByRole('dialog')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Нет' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
