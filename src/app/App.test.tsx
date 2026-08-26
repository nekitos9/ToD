import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('moves from Welcome to Rules and back', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Правда или Действие' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Начать' }))
    expect(screen.getByRole('heading', { name: 'Правила игры' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }))
    expect(screen.getByRole('heading', { name: 'Правда или Действие' })).toBeInTheDocument()
  })

  it('keeps both independent rule settings after navigating back and forward', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Начать' }))

    const refusal = screen.getByRole('checkbox', { name: /От заданий нельзя отказываться/ })
    const absence = screen.getByRole('checkbox', { name: /У пользователя есть право пропустить/ })
    expect(refusal).not.toBeChecked()
    expect(absence).not.toBeChecked()
    fireEvent.click(refusal)
    expect(refusal).toBeChecked()
    expect(absence).not.toBeChecked()
    fireEvent.click(absence)
    expect(refusal).toBeChecked()
    expect(absence).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: 'Назад' }))
    fireEvent.click(screen.getByRole('button', { name: 'Начать' }))
    expect(screen.getByRole('checkbox', { name: /От заданий нельзя отказываться/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /У пользователя есть право пропустить/ })).toBeChecked()
  })
})
