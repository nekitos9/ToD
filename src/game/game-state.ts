import type { BoundaryDefinition, CardType, GameCard, GameData } from '../data/game-data'
import { BOUNDARY_DATA_NAMES, type Boundary, type GameMode, type SetupState } from '../setup/setup-state'
import { selectSecondaryParticipants } from './participants'
import { mathRandomSource, shuffle, type RandomSource } from './random'
import { resolveCardTokens, type ResolvedTextSegment } from './token-resolver'

export type TruthCount = 0 | 1 | 2

export interface ActiveGamePlayer {
  readonly boundary: Boundary
  readonly id: string
  readonly inRelationship: boolean
  readonly name: string
  readonly colorId: number
  readonly activityPoints: number
  readonly answeredTruths: number
  readonly completedDares: number
  readonly truthCount: TruthCount
  readonly absenceSkips: number
  readonly refusalSkips: number
  readonly refusedDares: number
  readonly refusedTruths: number
}

export type SkipReason = 'absence' | 'refusal'

export interface CooldownEntry {
  readonly cardId: string
  readonly turnsRemaining: number
}

export interface CurrentTurn {
  readonly cardId: string
  readonly phoneNumber: string | null
  readonly resolvedText: string
  readonly renderSegments: readonly ResolvedTextSegment[]
  readonly secondaryPlayerIds: readonly string[]
  readonly type: CardType
}

export interface ActiveGameState {
  readonly currentPlayerIndex: number
  readonly currentTurn: CurrentTurn | null
  readonly cooldown: readonly CooldownEntry[]
  readonly mode: GameMode
  readonly eliminatedPlayers: readonly ActiveGamePlayer[]
  readonly playerOrder: readonly string[]
  readonly players: readonly ActiveGamePlayer[]
  readonly queue: readonly string[]
  readonly removeAfterAbsence: boolean
  readonly removeAfterRefusal: boolean
  readonly selectedType: CardType | null
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
  if (setup.players.length < 2) throw new Error('Для начала игры нужно минимум два игрока')
  const selectedPackIds = new Set(setup.selectedPackIds)
  const queue = shuffle(
    data.cards.filter((card) => selectedPackIds.has(card.packId)).map((card) => card.id),
    random,
  )

  return {
    currentPlayerIndex: 0,
    currentTurn: null,
    mode: setup.mode,
    players: setup.players.map((player, colorId) => {
      if (player.boundary === null) throw new Error(`У игрока ${player.id} не выбрана грань`)
      return {
        ...player,
        colorId,
        activityPoints: 0,
        absenceSkips: 0,
        answeredTruths: 0,
        boundary: player.boundary,
        completedDares: 0,
        refusalSkips: 0,
        refusedDares: 0,
        refusedTruths: 0,
        truthCount: 0,
      }
    }),
    queue,
    cooldown: [],
    eliminatedPlayers: [],
    playerOrder: setup.players.map((player) => player.id),
    removeAfterAbsence: setup.removeAfterAbsence,
    removeAfterRefusal: setup.removeAfterRefusal,
    selectedType: null,
    selectedPackIds: [...setup.selectedPackIds],
    usedCardIds: [],
  }
}

export function getCurrentPlayer(state: ActiveGameState): ActiveGamePlayer {
  return state.players[state.currentPlayerIndex]
}

export function advanceTurn(state: ActiveGameState): ActiveGameState {
  if (state.currentTurn !== null) throw new Error('Нельзя перейти к следующему игроку при активной карточке')
  return {
    ...state,
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
  }
}

export function canChooseType(state: ActiveGameState, type: CardType): boolean {
  return type === 'dare' || getCurrentPlayer(state).truthCount < 2
}

export function recordTypeChoice(state: ActiveGameState, type: CardType): ActiveGameState {
  if (state.selectedType !== null || state.currentTurn !== null) {
    throw new Error('Тип текущего хода уже выбран')
  }
  if (!canChooseType(state, type)) throw new Error('Нельзя выбрать третью Правду подряд')
  const current = getCurrentPlayer(state)
  const truthCount = type === 'truth' ? ((current.truthCount + 1) as TruthCount) : 0
  return {
    ...state,
    selectedType: type,
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
  if (state.currentTurn !== null || state.selectedType !== type) return { card: null, state }
  const cardsById = new Map(data.cards.map((card) => [card.id, card]))
  const usedIds = new Set(state.usedCardIds)
  const cooldownIds = new Set(state.cooldown.map((entry) => entry.cardId))
  const matchIndex = state.queue.findIndex((id) => {
    const card = cardsById.get(id)
    return card !== undefined && !usedIds.has(id) && !cooldownIds.has(id) && card.type === type && isCardPlayableForTurn(card, state, data.boundaries)
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
        renderSegments: resolved.segments,
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
  const withResult: ActiveGameState = {
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
  }
  return finishTurn({
    ...withResult,
    currentTurn: null,
    selectedType: null,
    usedCardIds: [...withResult.usedCardIds, turn.cardId],
  })
}

export function completeTableTurn(state: ActiveGameState, type: CardType): ActiveGameState {
  if (state.mode !== 'manual') throw new Error('Вопрос от стола доступен только в ручном режиме')
  if (state.currentTurn !== null) throw new Error('Нельзя завершить вопрос от стола при активной карточке')
  const withChoice = recordTypeChoice(state, type)
  return finishTurn({ ...withChoice, selectedType: null })
}

export function completeSelectedTableTurn(state: ActiveGameState): ActiveGameState {
  if (state.mode !== 'manual' || state.currentTurn !== null || state.selectedType === null) {
    throw new Error('Нет выбранного вопроса от стола')
  }
  return finishTurn({ ...state, selectedType: null })
}

export function completeUnavailableTurn(state: ActiveGameState): ActiveGameState {
  if (state.mode !== 'automatic' || state.currentTurn !== null || state.selectedType === null) {
    throw new Error('Нет хода без совместимой карточки')
  }
  return finishTurn({ ...state, selectedType: null })
}

export function skipCurrentTurn(state: ActiveGameState, reason: SkipReason): ActiveGameState {
  if (state.selectedType === null) throw new Error('Нет активного хода для пропуска')
  if (state.mode === 'automatic' && state.currentTurn === null) {
    throw new Error('Нельзя пропустить ход без карточки')
  }
  const actor = getCurrentPlayer(state)
  const enabled = reason === 'absence' ? state.removeAfterAbsence : state.removeAfterRefusal
  const field = reason === 'absence' ? 'absenceSkips' : 'refusalSkips'
  const count = actor[field] + 1
  const shouldRemove = enabled && count >= 3
  const cardId = state.currentTurn?.cardId
  const withoutTurn: ActiveGameState = {
    ...state,
    currentTurn: null,
    selectedType: null,
    players: state.players.map((player) => player.id === actor.id ? {
      ...player,
      [field]: count,
      ...(reason === 'refusal'
        ? state.selectedType === 'truth'
          ? { refusedTruths: player.refusedTruths + 1 }
          : { refusedDares: player.refusedDares + 1 }
        : {}),
    } : player),
  }
  const progressed = tickCooldown(withoutTurn)
  const withCooldown = cardId ? putOnCooldown(progressed, cardId, state.players.length) : progressed
  return shouldRemove ? removeCurrentPlayer(withCooldown) : advanceTurn(withCooldown)
}

export function replaceCurrentCard(
  state: ActiveGameState,
  data: Pick<GameData, 'boundaries' | 'cards'>,
  random: RandomSource = mathRandomSource,
): CardDrawResult {
  const turn = state.currentTurn
  if (turn === null) throw new Error('Нет карточки для замены')
  const card = data.cards.find((item) => item.id === turn.cardId)
  if (!card || !isReplacementAllowed(card)) throw new Error('Эту карточку нельзя заменить')
  const candidate = drawCard({ ...state, currentTurn: null }, turn.type, data, random)
  if (candidate.card === null) return { card: null, state }
  return {
    card: candidate.card,
    state: putOnCooldown(candidate.state, turn.cardId, state.players.length),
  }
}

export function isReplacementAllowed(card: GameCard): boolean {
  return card.pack === 'Другие люди' || card.pack === 'Безграничная улица'
}

export function isPackBaseExhausted(state: ActiveGameState): boolean {
  const used = new Set(state.usedCardIds)
  return state.currentTurn === null &&
    state.cooldown.every((entry) => used.has(entry.cardId)) &&
    state.queue.every((id) => used.has(id))
}

export function switchGameToManual(state: ActiveGameState): ActiveGameState {
  return { ...state, mode: 'manual' }
}

function finishTurn(state: ActiveGameState): ActiveGameState {
  return advanceTurn(tickCooldown(state))
}

function tickCooldown(state: ActiveGameState): ActiveGameState {
  if (state.cooldown.length === 0) return state
  const queue = [...state.queue]
  const used = new Set(state.usedCardIds)
  const currentId = state.currentTurn?.cardId
  const cooldown: CooldownEntry[] = []
  for (const entry of state.cooldown) {
    const remaining = entry.turnsRemaining - 1
    if (remaining <= 0) {
      if (!used.has(entry.cardId) && entry.cardId !== currentId && !queue.includes(entry.cardId)) queue.push(entry.cardId)
    } else {
      cooldown.push({ ...entry, turnsRemaining: remaining })
    }
  }
  return { ...state, cooldown, queue }
}

function putOnCooldown(state: ActiveGameState, cardId: string, turnsRemaining: number): ActiveGameState {
  if (state.usedCardIds.includes(cardId)) throw new Error('Использованная карточка не может попасть в cooldown')
  return {
    ...state,
    cooldown: [...state.cooldown.filter((entry) => entry.cardId !== cardId), { cardId, turnsRemaining }],
    queue: state.queue.filter((id) => id !== cardId),
  }
}

function removeCurrentPlayer(state: ActiveGameState): ActiveGameState {
  const index = state.currentPlayerIndex
  const removed = state.players[index]
  const players = state.players.filter((_, playerIndex) => playerIndex !== index)
  return {
    ...state,
    players,
    eliminatedPlayers: removed ? [...state.eliminatedPlayers, removed] : state.eliminatedPlayers,
    currentPlayerIndex: players.length === 0 ? 0 : index % players.length,
  }
}

export function getResultPlayers(state: ActiveGameState): readonly ActiveGamePlayer[] {
  const byId = new Map([...state.players, ...state.eliminatedPlayers].map((player) => [player.id, player]))
  return state.playerOrder.flatMap((id) => {
    const player = byId.get(id)
    return player ? [player] : []
  })
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
