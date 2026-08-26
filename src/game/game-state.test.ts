import { describe, expect, it } from 'vitest'
import type { BoundaryDefinition, GameCard, GameData } from '../data/game-data'
import type { SetupState } from '../setup/setup-state'
import {
  advanceTurn,
  canChooseType,
  completePackCard,
  createGame,
  drawCard,
  getCurrentPlayer,
  isCardPlayableForTurn,
  recordTypeChoice,
} from './game-state'
import { shuffle, type RandomSource } from './random'

const boundaries: BoundaryDefinition[] = [
  { description: '', level: 0, name: 'Целочка' },
  { description: '', level: 1, name: 'Обычный' },
  { description: '', level: 2, name: 'Полный раж' },
]

const cards: GameCard[] = [
  card('truth-low', 'truth', 'Целочка'),
  card('dare-low', 'dare', 'Целочка'),
  card('truth-high', 'truth', 'Полный раж'),
  card('dare-single', 'dare', 'Обычный', false, 1),
]

const data: GameData = {
  boundaries,
  cards,
  cardTypes: [],
  packs: [
    { availableTypes: ['truth', 'dare'], cardCount: 3, description: '', id: 'pack-a', name: 'A' },
    { availableTypes: ['dare'], cardCount: 1, description: '', id: 'pack-b', name: 'B' },
  ],
  source: 'fixture',
  summary: { boundaryCount: 3, cardCount: 4, cardTypeCount: 2, packCount: 2 },
}

describe('active game state', () => {
  it('keeps setup player order stable and advances cyclically', () => {
    let game = createGame(setup(), data, sequenceRandom([0.9, 0.1, 0.7]))
    expect(game.players.map((player) => player.id)).toEqual(['p1', 'p2', 'p3'])
    expect(game.mode).toBe('automatic')
    expect(game.removeAfterAbsence).toBe(false)
    expect(game.removeAfterRefusal).toBe(false)
    expect(getCurrentPlayer(game).id).toBe('p1')
    game = advanceTurn(advanceTurn(advanceTurn(game)))
    expect(getCurrentPlayer(game).id).toBe('p1')
  })

  it('allows at most two Truth choices per player and resets the count after Dare', () => {
    let game = createGame(setup(), data)
    game = recordTypeChoice(recordTypeChoice(game, 'truth'), 'truth')
    expect(getCurrentPlayer(game).truthCount).toBe(2)
    expect(canChooseType(game, 'truth')).toBe(false)
    expect(() => recordTypeChoice(game, 'truth')).toThrow('третью Правду')
    game = recordTypeChoice(game, 'dare')
    expect(getCurrentPlayer(game).truthCount).toBe(0)
    expect(canChooseType(game, 'truth')).toBe(true)
  })

  it('builds one reproducibly shuffled queue from every selected pack', () => {
    const randomValues = [0.8, 0.2, 0.6]
    const first = createGame(setup(), data, sequenceRandom(randomValues))
    const second = createGame(setup(), data, sequenceRandom(randomValues))
    expect(first.queue).toEqual(second.queue)
    expect(new Set(first.queue)).toEqual(new Set(cards.map((item) => item.id)))
    expect(first.queue).not.toEqual(cards.map((item) => item.id))
  })

  it('draws by type without losing skipped cards and never repeats used cards', () => {
    const game = { ...createGame(setup(), data), queue: ['dare-low', 'truth-low', 'truth-high', 'dare-single'] }
    const first = drawCard(game, 'truth', data)
    expect(first.card?.id).toBe('truth-low')
    expect(first.state.queue).toContain('dare-low')
    expect(first.state.usedCardIds).toEqual([])
    const completed = completePackCard(first.state)
    expect(completed.usedCardIds).toEqual(['truth-low'])
    const second = drawCard(completed, 'truth', data)
    expect(second.card?.id).toBe('truth-high')
    expect(second.state.usedCardIds).toEqual(['truth-low'])
    expect(second.state.queue).not.toContain('truth-low')
  })

  it('filters the actor and additional participants by boundary and relationship', () => {
    const game = createGame(setup(), data)
    expect(isCardPlayableForTurn(cards[2], game, boundaries)).toBe(true)
    const restrictedActor = { ...game, players: [{ ...game.players[0], boundary: 'regular' as const }, ...game.players.slice(1)] }
    expect(isCardPlayableForTurn(cards[2], restrictedActor, boundaries)).toBe(false)
    const relationshipBlocked = {
      ...game,
      players: game.players.map((player, index) => index === 1 ? { ...player, inRelationship: true } : player),
    }
    expect(isCardPlayableForTurn(cards[3], relationshipBlocked, boundaries)).toBe(true)
    const notEnoughOthers = {
      ...relationshipBlocked,
      players: relationshipBlocked.players.map((player, index) => index === 2 ? { ...player, boundary: 'virgin' as const } : player),
    }
    expect(isCardPlayableForTurn(cards[3], notEnoughOthers, boundaries)).toBe(false)
  })

  it('does not consume the queue when no compatible card exists', () => {
    const game = { ...createGame(setup(), data), queue: ['truth-high'] }
    const state = { ...game, players: game.players.map((player) => ({ ...player, boundary: 'virgin' as const })) }
    const result = drawCard(state, 'truth', data)
    expect(result.card).toBeNull()
    expect(result.state).toBe(state)
  })
})

describe('random source', () => {
  it('makes Fisher-Yates shuffling reproducible', () => {
    expect(shuffle([1, 2, 3, 4], sequenceRandom([0.5, 0.25, 0.75]))).toEqual([4, 2, 1, 3])
  })
})

function setup(): SetupState {
  return {
    mode: 'automatic',
    nextPlayerId: 4,
    players: [
      { boundary: 'full', id: 'p1', inRelationship: false, name: 'One' },
      { boundary: 'full', id: 'p2', inRelationship: false, name: 'Two' },
      { boundary: 'full', id: 'p3', inRelationship: false, name: 'Three' },
    ],
    removeAfterAbsence: false,
    removeAfterRefusal: false,
    selectedPackIds: ['pack-a', 'pack-b'],
  }
}

function card(
  id: string,
  type: GameCard['type'],
  boundary: string,
  relationshipAllowed = true,
  otherPlayers = 0,
): GameCard {
  return { boundary, id, otherPlayers, pack: id === 'dare-single' ? 'B' : 'A', packId: id === 'dare-single' ? 'pack-b' : 'pack-a', relationshipAllowed, text: id, type }
}

function sequenceRandom(values: readonly number[]): RandomSource {
  let index = 0
  return { next: () => values[index++ % values.length] }
}
