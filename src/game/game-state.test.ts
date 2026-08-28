import { describe, expect, it } from 'vitest'
import type { BoundaryDefinition, GameCard, GameData } from '../data/game-data'
import type { SetupState } from '../setup/setup-state'
import {
  advanceTurn,
  canChooseType,
  completePackCard,
  completeTableTurn,
  createGame,
  drawCard,
  getCurrentPlayer,
  isCardPlayableForTurn,
  recordTypeChoice,
  type ActiveGameState,
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

  it('assigns unique stable colors to 8 duplicate-named players across elimination', () => {
    const many = {
      ...setup(),
      nextPlayerId: 9,
      players: Array.from({ length: 8 }, (_, index) => ({
        boundary: 'full' as const,
        id: `duplicate-${index}`,
        inRelationship: false,
        name: 'Одинаково',
      })),
    }
    const game = createGame(many, data)
    expect(new Set(game.players.map((player) => player.colorId)).size).toBe(8)
    const colorsBefore = new Map(game.players.map((player) => [player.id, player.colorId]))
    const afterEarlyRemoval = { ...game, players: game.players.slice(1), eliminatedPlayers: [game.players[0]] }
    expect(afterEarlyRemoval.players.every((player) => colorsBefore.get(player.id) === player.colorId)).toBe(true)
  })

  it('allows at most two Truth choices per player and resets the count after Dare', () => {
    let game: ActiveGameState = { ...createGame(setup(), data), mode: 'manual' }
    game = completeTableTurn(game, 'truth')
    game = completeTableTurn(game, 'dare')
    game = completeTableTurn(game, 'dare')
    game = completeTableTurn(game, 'truth')
    game = completeTableTurn(game, 'dare')
    game = completeTableTurn(game, 'dare')
    expect(getCurrentPlayer(game).truthCount).toBe(2)
    expect(canChooseType(game, 'truth')).toBe(false)
    const beforeThirdTruth = game
    expect(() => completeTableTurn(game, 'truth')).toThrow('третью Правду')
    expect(game).toBe(beforeThirdTruth)
    game = completeTableTurn(game, 'dare')
    game = completeTableTurn(game, 'dare')
    game = completeTableTurn(game, 'dare')
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
    const first = drawCard(recordTypeChoice(game, 'truth'), 'truth', data)
    expect(first.card?.id).toBe('truth-low')
    expect(first.state.queue).toContain('dare-low')
    expect(first.state.usedCardIds).toEqual([])
    const completed = completePackCard(first.state)
    expect(completed.usedCardIds).toEqual(['truth-low'])
    const second = drawCard(recordTypeChoice(completed, 'truth'), 'truth', data)
    expect(second.card?.id).toBe('truth-high')
    expect(second.state.usedCardIds).toEqual(['truth-low'])
    expect(second.state.queue).not.toContain('truth-low')
  })

  it('changes Truth count exactly once across the full public card lifecycle', () => {
    const chosen = recordTypeChoice(createGame(setup(), data), 'truth')
    expect(chosen.players[0].truthCount).toBe(1)
    const drawn = drawCard(chosen, 'truth', data).state
    const completed = completePackCard(drawn)
    expect(completed.players[0].truthCount).toBe(1)
    expect(completed.players[0].answeredTruths).toBe(1)
  })

  it('rejects turn advance and a second draw while a card is active', () => {
    const drawn = drawCard(recordTypeChoice(createGame(setup(), data), 'truth'), 'truth', data).state
    const playerId = getCurrentPlayer(drawn).id
    const turn = drawn.currentTurn
    expect(() => advanceTurn(drawn)).toThrow('активной карточке')
    expect(getCurrentPlayer(drawn).id).toBe(playerId)
    expect(drawn.currentTurn).toBe(turn)
    const repeated = drawCard(drawn, 'truth', data)
    expect(repeated.card).toBeNull()
    expect(repeated.state).toBe(drawn)
  })

  it('preserves the order of cards skipped while searching by type', () => {
    const game = {
      ...createGame(setup(), data),
      queue: ['dare-low', 'dare-single', 'truth-low', 'truth-high'],
    }
    const drawn = drawCard(recordTypeChoice(game, 'truth'), 'truth', data)
    expect(drawn.card?.id).toBe('truth-low')
    expect(drawn.state.queue).toEqual(['truth-high', 'dare-low', 'dare-single'])
  })

  it('never redraws a used id even if it reappears in the queue', () => {
    const chosen = recordTypeChoice(createGame(setup(), data), 'truth')
    const completed = completePackCard(drawCard(chosen, 'truth', data).state)
    const usedId = completed.usedCardIds[0]
    const corrupted = { ...completed, queue: [usedId] }
    const result = drawCard(recordTypeChoice(corrupted, 'truth'), 'truth', data)
    expect(result.card).toBeNull()
  })

  it('rejects setup with fewer than two players', () => {
    expect(() => createGame({ ...setup(), players: setup().players.slice(0, 1) }, data)).toThrow('минимум два')
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
    const chosen = recordTypeChoice(state, 'truth')
    const result = drawCard(chosen, 'truth', data)
    expect(result.card).toBeNull()
    expect(result.state).toBe(chosen)
  })
})

describe('random source', () => {
  it('makes Fisher-Yates shuffling reproducible', () => {
    expect(shuffle([1, 2, 3, 4], sequenceRandom([0.5, 0.25, 0.75]))).toEqual([4, 2, 1, 3])
  })

  it.each([1, -0.01, Number.NaN])('rejects an out-of-range value: %s', (value) => {
    expect(() => shuffle([1, 2], { next: () => value })).toThrow('диапазона [0, 1)')
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
    penalizeReplacement: false,
    unlimitedReplacement: false,
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
