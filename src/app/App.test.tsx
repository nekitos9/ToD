import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('starts Players with two empty independent players and automatic mode', () => {
    render(<App />)
    openPlayers()

    const names = screen.getAllByRole('textbox', { name: 'Имя игрока' })
    expect(names).toHaveLength(2)
    expect(names[0]).toHaveValue('')
    expect(names[1]).toHaveValue('')
    expect(screen.getAllByRole('combobox', { name: 'Грань игрока' })).toHaveLength(2)
    for (const boundary of screen.getAllByRole('combobox', { name: 'Грань игрока' })) {
      expect(boundary).toHaveValue('')
    }
    for (const relationship of screen.getAllByRole('checkbox', { name: 'Отношения' })) {
      expect(relationship).not.toBeChecked()
    }
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: 'Удалить последнего игрока' })).toBeDisabled()
  })

  it('adds multiple players and never removes below two', () => {
    render(<App />)
    openPlayers()
    const add = screen.getByRole('button', { name: 'Добавить игрока' })
    const remove = screen.getByRole('button', { name: 'Удалить последнего игрока' })

    fireEvent.click(remove)
    expect(screen.getAllByRole('textbox', { name: 'Имя игрока' })).toHaveLength(2)
    fireEvent.click(add)
    fireEvent.click(add)
    expect(screen.getAllByRole('textbox', { name: 'Имя игрока' })).toHaveLength(4)
    fireEvent.click(remove)
    fireEvent.click(remove)
    expect(screen.getAllByRole('textbox', { name: 'Имя игрока' })).toHaveLength(2)
    expect(remove).toBeDisabled()
  })

  it('allows duplicate names and validates names before boundaries', () => {
    render(<App />)
    openPlayers()
    const names = screen.getAllByRole('textbox', { name: 'Имя игрока' })
    const next = screen.getByRole('button', { name: 'Далее' })
    expect(next).toBeDisabled()

    fireEvent.change(names[0], { target: { value: 'Никита' } })
    fireEvent.change(names[1], { target: { value: '   ' } })
    expect(next).toBeDisabled()
    fireEvent.change(names[1], { target: { value: 'Никита' } })
    expect(next).toBeEnabled()
    fireEvent.click(next)
    for (const boundary of screen.getAllByRole('combobox', { name: 'Грань игрока' })) {
      expect(boundary).toHaveAttribute('aria-invalid', 'true')
    }

    const boundaries = screen.getAllByRole('combobox', { name: 'Грань игрока' })
    fireEvent.change(boundaries[0], { target: { value: 'regular' } })
    fireEvent.change(boundaries[1], { target: { value: 'full' } })
    expect(boundaries[0]).toHaveAttribute('aria-invalid', 'false')
    expect(boundaries[1]).toHaveAttribute('aria-invalid', 'false')
  })

  it('opens and closes the player setup help', async () => {
    render(<App />)
    openPlayers()

    fireEvent.click(screen.getByRole('button', { name: 'Открыть справку о настройках игроков' }))
    expect(screen.getByRole('dialog', { name: 'Грани и «Отношения»' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Ясно' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Грани и «Отношения»' })).not.toBeInTheDocument()
    })
  })

  it('updates each player independently and preserves state through Rules', () => {
    render(<App />)
    openPlayers()
    const names = screen.getAllByRole('textbox', { name: 'Имя игрока' })
    const boundaries = screen.getAllByRole('combobox', { name: 'Грань игрока' })
    const relationships = screen.getAllByRole('checkbox', { name: 'Отношения' })
    fireEvent.change(names[0], { target: { value: 'Одинаково' } })
    fireEvent.change(names[1], { target: { value: 'Одинаково' } })
    fireEvent.change(boundaries[0], { target: { value: 'full' } })
    fireEvent.change(boundaries[1], { target: { value: 'virgin' } })
    fireEvent.click(relationships[1])
    fireEvent.click(screen.getByRole('switch'))

    fireEvent.click(screen.getByRole('button', { name: 'Назад' }))
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
    expect(screen.getAllByRole('textbox', { name: 'Имя игрока' })[0]).toHaveValue('Одинаково')
    expect(screen.getAllByRole('textbox', { name: 'Имя игрока' })[1]).toHaveValue('Одинаково')
    expect(screen.getAllByRole('combobox', { name: 'Грань игрока' })[0]).toHaveValue('full')
    expect(screen.getAllByRole('combobox', { name: 'Грань игрока' })[1]).toHaveValue('virgin')
    expect(screen.getAllByRole('checkbox', { name: 'Отношения' })[0]).not.toBeChecked()
    expect(screen.getAllByRole('checkbox', { name: 'Отношения' })[1]).toBeChecked()
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('keeps focus logical after adding and removing by stable id', () => {
    render(<App />)
    openPlayers()
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Имя игрока' })[1], { target: { value: 'Второй' } })
    fireEvent.click(screen.getByRole('button', { name: 'Добавить игрока' }))
    const third = screen.getAllByRole('textbox', { name: 'Имя игрока' })[2]
    expect(third).toHaveFocus()
    expect(third.closest('[data-player-id]')).toHaveAttribute('data-player-id', 'player-3')
    fireEvent.click(screen.getByRole('button', { name: 'Удалить последнего игрока' }))
    expect(screen.getAllByRole('textbox', { name: 'Имя игрока' })[1]).toHaveFocus()
    expect(screen.queryByText('player-3')).not.toBeInTheDocument()
  })
})

function openPlayers() {
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }))
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
}
