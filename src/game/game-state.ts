import type { BoundaryDefinition, CardType, GameCard, GameData } from '../data/game-data'
import { BOUNDARY_DATA_NAMES, type Boundary, type GameMode, type SetupState } from '../setup/setup-state'
import { selectSecondaryParticipants } from './participants'
import { mathRandomSource, shuffle, type RandomSource } from './random'
import { resolveCardTokens } from './token-resolver'

export type TruthCount = 0 | 1 | 2

export interface ActiveGamePlayer {
  readonly boundary: Boundary
  readonly id: string
  readonly inRelationship: boolean
  readonly name: string
  readonly activityPoints: number
  readonly answeredTruths: number
  readonly completedDares: number
  readonly truthCount: TruthCount
}

export interface CurrentTurn {
  readonly cardId: string
  readonly phoneNumber: string | null
  readonly resolvedText: string
  readonly secondaryPlayerIds: readonly string[]
  readonly type: CardType
}

export interface ActiveGameState {
  readonly currentPlayerIndex: number
  readonly currentTurn: CurrentTurn | null
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
    currentTurn: null,
    mode: setup.mode,
    players: setup.players.map((player) => {
      if (player.boundary === null) throw new Error(`У игрока ${player.id} не выбрана грань`)
      return {
        ...player,
        activityPoints: 0,
        answeredTruths: 0,
        boundary: player.boundary,
        completedDares: 0,
        truthCount: 0,
      }
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
  random: RandomSource = mathRandomSource,
): CardDrawResult {
  if (state.currentTurn !== null || !canChooseType(state, type)) return { card: null, state }
  const cardsById = new Map(data.cards.map((card) => [card.id, card]))
  const usedIds = new Set(state.usedCardIds)
  const matchIndex = state.queue.findIndex((id) => {
    const card = cardsById.get(id)
    return card !== undefined && !usedIds.has(id) && card.type === type && isCardPlayableForTurn(card, state, data.boundaries)
  })
  if (matchIndex < 0) return { card: null, state }

  const cardId = state.queue[matchIndex]
  const card = cardsById.get(cardId)!
  const participants = selectSecondaryParticipants(card, state, data.boundaries, random)
  if (participants === null) return { card: null, state }
  const resolved = resolveCardTokens(card.text, participants, random)
  return {
    card,
    state: {
      ...state,
      currentTurn: {
        cardId,
        phoneNumber: resolved.phoneNumber,
        resolvedText: resolved.text,
        secondaryPlayerIds: participants.map((player) => player.id),
        type: card.type,
      },
      queue: [...state.queue.slice(matchIndex + 1), ...state.queue.slice(0, matchIndex)],
    },
  }
}

export function completePackCard(state: ActiveGameState): ActiveGameState {
  const turn = state.currentTurn
  if (turn === null) throw new Error('Нет активной карточки для завершения')
  const actorIndex = state.currentPlayerIndex
  const secondaryIds = new Set(turn.secondaryPlayerIds)
  const withResult = recordTypeChoice({
    ...state,
    players: state.players.map((player, index) => {
      if (index === actorIndex) {
        return turn.type === 'truth'
          ? { ...player, answeredTruths: player.answeredTruths + 1 }
          : { ...player, completedDares: player.completedDares + 1 }
      }
      if (turn.type === 'dare' && secondaryIds.has(player.id)) {
        return { ...player, activityPoints: player.activityPoints + 1 }
      }
      return player
    }),
  }, turn.type)
  return advanceTurn({
    ...withResult,
    currentTurn: null,
    usedCardIds: [...withResult.usedCardIds, turn.cardId],
  })
}

export function completeTableTurn(state: ActiveGameState, type: CardType): ActiveGameState {
  if (state.mode !== 'manual') throw new Error('Вопрос от стола доступен только в ручном режиме')
  if (state.currentTurn !== null) throw new Error('Нельзя завершить вопрос от стола при активной карточке')
  return advanceTurn(recordTypeChoice(state, type))
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
