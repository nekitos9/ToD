import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { gameData } from '../generated/game-data'
import { createGame, type ActiveGamePlayer } from '../game/game-state'
import type { SetupState } from '../setup/setup-state'
import { ResultsScreen } from './ResultsScreen'

describe('ResultsScreen', () => {
  it('renders completed, skip and activity metrics from the immutable game snapshot', () => {
    const game = createGame(setup(2), gameData)
    const first = withStats(game.players[0], {
      absenceSkips: 2,
      activityPoints: 3,
      answeredTruths: 4,
      completedDares: 5,
      refusalSkips: 2,
      refusedDares: 1,
      refusedTruths: 1,
    })
    const second = game.players[1]
    const snapshot = { ...game, players: [first], eliminatedPlayers: [second] }
    const serialized = JSON.stringify(snapshot)
    render(<ResultsScreen game={snapshot} onRestart={vi.fn()} onReusePlayers={vi.fn()} />)

    expect(screen.getByText(/выполнил 5 действий и ответил 4 правд/)).toHaveTextContent('пропустил 2 раундов')
    expect(screen.getByText(/выполнил 5 действий/)).toHaveTextContent('отказался от 1 правд и 1 действий')
    expect(document.querySelector('.results__refusals')).toHaveTextContent('отказался от 1 правд и 1 действий')
    expect(screen.getByText(/выполнил 5 действий/)).toHaveTextContent('помог выполнить задание 3 раз')
    expect(screen.getByText(/выполнил 0 действий и ответил 0 правд/)).not.toHaveTextContent('помог выполнить')
    expect(JSON.stringify(snapshot)).toBe(serialized)
  })

  it('keeps duplicate names as separate results by stable player id', () => {
    const game = createGame(setup(2, 'Одинаково'), gameData)
    render(<ResultsScreen game={game} onRestart={vi.fn()} onReusePlayers={vi.fn()} />)
    expect(screen.getAllByText('Одинаково')).toHaveLength(2)
    expect(document.querySelectorAll('.results__player')).toHaveLength(2)
  })

  it.each([2, 8, 20])('renders all %i participants including long names and zero stats', (count) => {
    const game = createGame(setup(count, 'Очень длинное имя участника без сокращения'), gameData)
    render(<ResultsScreen game={game} onRestart={vi.fn()} onReusePlayers={vi.fn()} />)
    expect(document.querySelectorAll('.results__player')).toHaveLength(count)
    expect(screen.getAllByText('Очень длинное имя участника без сокращения')).toHaveLength(count)
  })

  it('runs only the selected restart action', () => {
    const restart = vi.fn()
    const reuse = vi.fn()
    render(<ResultsScreen game={createGame(setup(2), gameData)} onRestart={restart} onReusePlayers={reuse} />)
    fireEvent.click(screen.getByRole('button', { name: 'С теми же игроками' }))
    expect(reuse).toHaveBeenCalledOnce()
    expect(restart).not.toHaveBeenCalled()
  })
})

function setup(count: number, sharedName?: string): SetupState {
  return {
    mode: 'automatic',
    nextPlayerId: count + 1,
    players: Array.from({ length: count }, (_, index) => ({
      boundary: 'full' as const,
      id: `p${index + 1}`,
      inRelationship: false,
      name: sharedName ?? `Player ${index + 1}`,
    })),
    removeAfterAbsence: true,
    removeAfterRefusal: true,
    penalizeReplacement: false,
    unlimitedReplacement: false,
    selectedPackIds: [gameData.packs[0].id],
  }
}

function withStats(player: ActiveGamePlayer, stats: Partial<ActiveGamePlayer>): ActiveGamePlayer {
  return { ...player, ...stats }
}
