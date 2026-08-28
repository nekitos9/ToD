import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { gameData } from '../generated/game-data'
import type { SetupState } from '../setup/setup-state'
import { GameScreen } from './GameScreen'
import { createGame, recordTypeChoice } from './game-state'

const setup: SetupState = {
  mode: 'automatic', nextPlayerId: 3, penalizeReplacement: false, removeAfterAbsence: true, removeAfterRefusal: true,
  unlimitedReplacement: false,
  selectedPackIds: [gameData.packs[0].id],
  players: [
    { boundary: 'full', id: 'p1', inRelationship: false, name: 'Первый' },
    { boundary: 'full', id: 'p2', inRelationship: false, name: 'Второй' },
  ],
}

describe('GameScreen state boundaries', () => {
  it('renders the saved turn snapshot even when catalog source differs', () => {
    const initial = createGame(setup, gameData, { next: () => 0 })
    const card = gameData.cards.find((item) => initial.queue.includes(item.id))!
    const game = {
      ...initial,
      selectedType: card.type,
      queue: initial.queue.filter((id) => id !== card.id),
      currentTurn: {
        cardId: card.id,
        phoneNumber: null,
        renderSegments: [{ kind: 'text' as const, text: 'Неизменяемый сохранённый вопрос' }],
        resolvedText: 'Неизменяемый сохранённый вопрос',
        secondaryPlayerIds: [],
        type: card.type,
      },
    }
    render(<GameScreen game={game} onExit={vi.fn()} onGameChange={vi.fn()} />)
    expect(screen.getByText('Неизменяемый сохранённый вопрос')).toBeInTheDocument()
    expect(screen.queryByText(card.text)).not.toBeInTheDocument()
  })

  it('disables skip in an automatic no-card state and cannot mutate counters', () => {
    const initial = createGame(setup, gameData, { next: () => 0 })
    const game = { ...recordTypeChoice(initial, 'truth'), queue: [] }
    const onGameChange = vi.fn()
    render(<GameScreen game={game} onExit={vi.fn()} onGameChange={onGameChange} />)
    const skip = screen.getByRole('button', { name: 'Пропуск' })
    expect(skip).toBeDisabled()
    fireEvent.click(skip)
    expect(onGameChange).not.toHaveBeenCalled()
    expect(game.players.map((player) => player.refusalSkips)).toEqual([0, 0])
  })
})
