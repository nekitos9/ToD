import type { BoundaryDefinition, CardType, GameCard, GameData } from '../data/game-data'
import { BOUNDARY_DATA_NAMES, type Boundary, type GameMode, type SetupState } from '../setup/setup-state'
import { mathRandomSource, shuffle, type RandomSource } from './random'

export type TruthCount = 0 | 1 | 2

export interface ActiveGamePlayer {
  readonly boundary: Boundary
  readonly id: string
  readonly inRelationship: boolean
  readonly name: string
  readonly truthCount: TruthCount
}

export interface ActiveGameState {
  readonly currentPlayerIndex: number
  readonly mode: GameMode
  readonly players: readonly ActiveGamePlayer[]
  readonly queue: readonly string[]
  readonly removeAfterAbsence: boolean
  readonly removeAfterRefusal: boolean
  readonly selectedPackIds: readonly string[]
  readonly usedCardIds: readonly string[]
}

export interface CardDrawResult {
  readonly card: GameCard | null
  readonly state: ActiveGameState
}

export function createGame(
  setup: SetupState,
  data: GameData,
  random: RandomSource = mathRandomSource,
): ActiveGameState {
  const selectedPackIds = new Set(setup.selectedPackIds)
  const queue = shuffle(
    data.cards.filter((card) => selectedPackIds.has(card.packId)).map((card) => card.id),
    random,
  )

  return {
    currentPlayerIndex: 0,
    mode: setup.mode,
    players: setup.players.map((player) => {
      if (player.boundary === null) throw new Error(`У игрока ${player.id} не выбрана грань`)
      return { ...player, boundary: player.boundary, truthCount: 0 }
    }),
    queue,
    removeAfterAbsence: setup.removeAfterAbsence,
    removeAfterRefusal: setup.removeAfterRefusal,
    selectedPackIds: [...setup.selectedPackIds],
    usedCardIds: [],
  }
}

export function getCurrentPlayer(state: ActiveGameState): ActiveGamePlayer {
  return state.players[state.currentPlayerIndex]
}

export function advanceTurn(state: ActiveGameState): ActiveGameState {
  return {
    ...state,
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
  }
}

export function canChooseType(state: ActiveGameState, type: CardType): boolean {
  return type === 'dare' || getCurrentPlayer(state).truthCount < 2
}

export function recordTypeChoice(state: ActiveGameState, type: CardType): ActiveGameState {
  if (!canChooseType(state, type)) throw new Error('Нельзя выбрать третью Правду подряд')
  const current = getCurrentPlayer(state)
  const truthCount = type === 'truth' ? ((current.truthCount + 1) as TruthCount) : 0
  return {
    ...state,
    players: state.players.map((player, index) =>
      index === state.currentPlayerIndex ? { ...player, truthCount } : player,
    ),
  }
}

export function drawCard(
  state: ActiveGameState,
  type: CardType,
  data: Pick<GameData, 'boundaries' | 'cards'>,
): CardDrawResult {
  if (!canChooseType(state, type)) return { card: null, state }
  const cardsById = new Map(data.cards.map((card) => [card.id, card]))
  const usedIds = new Set(state.usedCardIds)
  const matchIndex = state.queue.findIndex((id) => {
    const card = cardsById.get(id)
    return card !== undefined && !usedIds.has(id) && card.type === type && isCardPlayableForTurn(card, state, data.boundaries)
  })
  if (matchIndex < 0) return { card: null, state }

  const cardId = state.queue[matchIndex]
  const card = cardsById.get(cardId)!
  return {
    card,
    state: {
      ...state,
      queue: [...state.queue.slice(matchIndex + 1), ...state.queue.slice(0, matchIndex)],
      usedCardIds: [...state.usedCardIds, cardId],
    },
  }
}

export function isCardPlayableForTurn(
  card: GameCard,
  state: ActiveGameState,
  boundaries: readonly BoundaryDefinition[],
): boolean {
  const levels = new Map(boundaries.map((boundary) => [boundary.name, boundary.level]))
  const requiredLevel = levels.get(card.boundary)
  if (requiredLevel === undefined) return false
  const eligible = (player: ActiveGamePlayer) =>
    (levels.get(BOUNDARY_DATA_NAMES[player.boundary]) ?? -1) >= requiredLevel &&
    (card.relationshipAllowed || !player.inRelationship)
  if (!eligible(getCurrentPlayer(state))) return false
  return state.players.filter((player, index) => index !== state.currentPlayerIndex && eligible(player)).length >= card.otherPlayers
}
