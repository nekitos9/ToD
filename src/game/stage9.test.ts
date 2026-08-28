import { describe, expect, it } from 'vitest'
import type { BoundaryDefinition, GameCard, GameData } from '../data/game-data'
import type { SetupState } from '../setup/setup-state'
import {
  completeTableTurn,
  createGame,
  drawCard,
  getCurrentPlayer,
  getResultPlayers,
  isPackBaseExhausted,
  recordTypeChoice,
  replaceCurrentCard,
  skipCurrentTurn,
  switchGameToManual,
  type ActiveGameState,
} from './game-state'
import type { RandomSource } from './random'

const boundaries: BoundaryDefinition[] = [
  { description: '', level: 0, name: 'Целочка' },
  { description: '', level: 1, name: 'Обычный' },
  { description: '', level: 2, name: 'Полный раж' },
]

describe('skips and player removal', () => {
  it('tracks both reasons independently even when the related removal rule is disabled', () => {
    let game = activeTurn(makeGame({ removeAfterAbsence: false, removeAfterRefusal: true }))
    game = skipCurrentTurn(game, 'absence')
    expect(game.players[0].absenceSkips).toBe(1)
    game = activeTurn({ ...game, currentPlayerIndex: 0 })
    game = skipCurrentTurn(game, 'refusal')
    expect(game.players[0]).toMatchObject({ absenceSkips: 1, refusalSkips: 1, refusedDares: 1 })
  })

  it('records skipped Truth and Dare cards without enabling player removal', () => {
    let game = activeTurn(makeGame({ removeAfterRefusal: false }))
    game = skipCurrentTurn({ ...game, selectedType: 'truth', currentTurn: { ...game.currentTurn!, type: 'truth' } }, 'refusal')
    game = activeTurn({ ...game, currentPlayerIndex: 0 })
    game = skipCurrentTurn(game, 'refusal')

    expect(game.players).toHaveLength(3)
    expect(game.players[0]).toMatchObject({ refusalSkips: 2, refusedDares: 1, refusedTruths: 1 })
  })

  it.each([
    ['first', 0, 'p2'],
    ['middle', 1, 'p3'],
    ['last', 2, 'p1'],
  ])('removes the %s current player on the third counted skip and selects the correct next player', (_, index, nextId) => {
    let game = makeGame({ removeAfterRefusal: true })
    const removedId = game.players[index].id
    game = { ...game, currentPlayerIndex: index }
    for (let count = 0; count < 3; count += 1) {
      game = activeTurn({ ...game, currentPlayerIndex: game.players.findIndex((player) => player.id === removedId) })
      game = skipCurrentTurn(game, 'refusal')
      if (count < 2) game = { ...game, currentPlayerIndex: game.players.findIndex((player) => player.id === removedId) }
    }
    expect(game.players.map((player) => player.id)).not.toContain(removedId)
    expect(game.eliminatedPlayers.map((player) => player.id)).toContain(removedId)
    expect(getResultPlayers(game).map((player) => player.id)).toEqual(['p1', 'p2', 'p3'])
    expect(getCurrentPlayer(game).id).toBe(nextId)
  })

  it('leaves a valid one-player state instead of calculating modulo zero', () => {
    let game = makeGame({ playerCount: 2, removeAfterAbsence: true })
    game = { ...game, players: game.players.map((player, index) => index === 0 ? { ...player, absenceSkips: 2 } : player) }
    game = skipCurrentTurn(activeTurn(game), 'absence')
    expect(game.players).toHaveLength(1)
    expect(game.currentPlayerIndex).toBe(0)
    expect(getCurrentPlayer(game).id).toBe('p2')
  })
})

describe('cooldown', () => {
  it('does not mark a skipped card used and returns it only after a full player-count of later turns', () => {
    let game = skipCurrentTurn(activeTurn(makeGame()), 'refusal')
    expect(game.usedCardIds).toEqual([])
    expect(game.cooldown).toEqual([{ cardId: 'people-1', turnsRemaining: 3 }])
    expect(game.queue).not.toContain('people-1')
    for (let turn = 2; turn >= 1; turn -= 1) {
      game = completeTableTurn({ ...game, mode: 'manual' }, 'dare')
      expect(game.cooldown[0].turnsRemaining).toBe(turn)
      expect(game.queue).not.toContain('people-1')
    }
    game = completeTableTurn({ ...game, mode: 'manual' }, 'dare')
    expect(game.cooldown).toEqual([])
    expect(game.queue.at(-1)).toBe('people-1')
  })

  it('never restores a used card from a corrupted cooldown entry', () => {
    const game = { ...makeGame(), queue: [], usedCardIds: ['people-1'], cooldown: [{ cardId: 'people-1', turnsRemaining: 1 }] }
    const next = completeTableTurn({ ...game, mode: 'manual' }, 'dare')
    expect(next.queue).not.toContain('people-1')
    expect(next.cooldown).toEqual([])
  })

  it('keeps existing cooldown valid when the current player is removed', () => {
    let game = makeGame({ removeAfterRefusal: true })
    game = {
      ...game,
      cooldown: [{ cardId: 'street-1', turnsRemaining: 2 }],
      players: game.players.map((player, index) => index === 0 ? { ...player, refusalSkips: 2 } : player),
      queue: game.queue.filter((id) => id !== 'street-1'),
    }
    game = skipCurrentTurn(activeTurn(game), 'refusal')
    expect(game.players.map((player) => player.id)).toEqual(['p2', 'p3'])
    expect(game.cooldown).toEqual([
      { cardId: 'street-1', turnsRemaining: 1 },
      { cardId: 'people-1', turnsRemaining: 3 },
    ])
  })

  it('does not mutate deck or cooldown for a table-generated manual turn', () => {
    const game = { ...makeGame(), mode: 'manual' as const }
    const completed = completeTableTurn(game, 'truth')
    expect(completed.queue).toEqual(game.queue)
    expect(completed.cooldown).toEqual([])
    expect(completed.usedCardIds).toEqual([])
  })
})

describe('replacement and exhaustion', () => {
  it('replaces only allowed packs without changing player, type, stats or activity', () => {
    const initial = activeTurn(makeGame())
    const result = replaceCurrentCard(initial, data, fixedRandom(0))
    expect(result.card?.id).toBe('people-2')
    expect(result.card?.id).not.toBe(initial.currentTurn?.cardId)
    expect(result.state.currentPlayerIndex).toBe(initial.currentPlayerIndex)
    expect(result.state.selectedType).toBe('dare')
    expect(result.state.cooldown).toContainEqual({ cardId: 'people-1', turnsRemaining: 3 })
    expect(result.state.players).toEqual(initial.players)
    expect(result.state.usedCardIds).toEqual([])
  })

  it('rejects replacement for every other pack', () => {
    const game = activeTurn(makeGame(), 'ordinary-1')
    expect(() => replaceCurrentCard(game, data)).toThrow('нельзя заменить')
  })

  it('applies ordinary skip and replacement rules to a card generated in manual mode', () => {
    const generated = { ...activeTurn(makeGame()), mode: 'manual' as const }
    const replaced = replaceCurrentCard(generated, data, fixedRandom(0)).state
    expect(replaced.mode).toBe('manual')
    expect(replaced.currentTurn?.cardId).toBe('people-2')
    const skipped = skipCurrentTurn(replaced, 'absence')
    expect(skipped.cooldown.map((entry) => entry.cardId)).toEqual(['people-1', 'people-2'])
    expect(skipped.usedCardIds).toEqual([])
  })

  it('distinguishes no compatible card from exhausted base and switches mode without losing state', () => {
    const incompatible = { ...makeGame(), queue: ['truth-1'], currentPlayerIndex: 0 }
    const chosen = recordTypeChoice(incompatible, 'dare')
    expect(drawCard(chosen, 'dare', data).card).toBeNull()
    expect(isPackBaseExhausted(chosen)).toBe(false)
    const exhausted = { ...chosen, queue: [], usedCardIds: data.cards.map((card) => card.id) }
    expect(isPackBaseExhausted(exhausted)).toBe(true)
    const manual = switchGameToManual(exhausted)
    expect(manual).toMatchObject({ mode: 'manual', players: exhausted.players, selectedType: 'dare' })
  })

  it('does not loop when a complete queue pass has no compatible card', () => {
    const game = recordTypeChoice({ ...makeGame(), queue: ['truth-1'] }, 'dare')
    const snapshot = game.queue
    const result = drawCard(game, 'dare', data)
    expect(result.card).toBeNull()
    expect(result.state.queue).toBe(snapshot)
  })

  it('keeps replacement fully atomic when no alternative card exists', () => {
    const initial = { ...activeTurn(makeGame()), queue: [] }
    const snapshot = structuredClone(initial)
    const result = replaceCurrentCard(initial, data, fixedRandom(0))
    expect(result.card).toBeNull()
    expect(result.state).toEqual(snapshot)
  })

  it('rejects an automatic skip when no card was found without mutating state', () => {
    const noCard = recordTypeChoice({ ...makeGame(), queue: ['truth-1'] }, 'dare')
    const snapshot = structuredClone(noCard)
    expect(() => skipCurrentTurn(noCard, 'refusal')).toThrow('без карточки')
    expect(noCard).toEqual(snapshot)
  })
})

const cards: GameCard[] = [
  card('people-1', 'Другие люди'),
  card('people-2', 'Другие люди'),
  card('street-1', 'Безграничная улица'),
  card('ordinary-1', 'Обычный'),
  { ...card('truth-1', 'Обычный'), type: 'truth' },
]

const data: GameData = {
  boundaries,
  cards,
  cardTypes: [],
  packs: [],
  source: 'fixture',
  summary: { boundaryCount: 3, cardCount: cards.length, cardTypeCount: 2, packCount: 3 },
}

function card(id: string, pack: string): GameCard {
  return { boundary: 'Целочка', id, otherPlayers: 0, pack, packId: pack, relationshipAllowed: true, text: id, type: 'dare' }
}

function makeGame(options: { playerCount?: number; removeAfterAbsence?: boolean; removeAfterRefusal?: boolean } = {}): ActiveGameState {
  const playerCount = options.playerCount ?? 3
  const setup: SetupState = {
    mode: 'automatic',
    nextPlayerId: playerCount + 1,
    players: Array.from({ length: playerCount }, (_, index) => ({
      boundary: 'full' as const,
      id: `p${index + 1}`,
      inRelationship: false,
      name: `Player ${index + 1}`,
    })),
    removeAfterAbsence: options.removeAfterAbsence ?? false,
    removeAfterRefusal: options.removeAfterRefusal ?? false,
    selectedPackIds: ['Другие люди', 'Безграничная улица', 'Обычный'],
  }
  return { ...createGame(setup, data, fixedRandom(0)), queue: cards.map((item) => item.id) }
}

function activeTurn(game: ActiveGameState, cardId = 'people-1'): ActiveGameState {
  const chosen = recordTypeChoice(game, 'dare')
  return { ...chosen, currentTurn: { cardId, phoneNumber: null, renderSegments: [{ kind: 'text', text: cardId }], resolvedText: cardId, secondaryPlayerIds: [], type: 'dare' }, queue: chosen.queue.filter((id) => id !== cardId) }
}

function fixedRandom(value: number): RandomSource {
  return { next: () => value }
}
