import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the application heading', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Правда или Действие' }),
    ).toBeInTheDocument()
  })

  it('shows the imported workbook summary', () => {
    render(<App />)

    expect(screen.getByText('103')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
