import type { GameData } from '../data/game-data'
import type { ActiveGamePlayer, ActiveGameState, CurrentTurn } from '../game/game-state'
import type { Boundary, SetupPlayer, SetupState } from '../setup/setup-state'

export const GAME_SESSION_KEY = 'truth-or-dare:unfinished-game'
export const GAME_SESSION_SCHEMA_VERSION = 1

export interface PersistedGameSession {
  readonly schemaVersion: typeof GAME_SESSION_SCHEMA_VERSION
  readonly setup: SetupState
  readonly game: ActiveGameState
}

type StorageAccess = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>
type GameCatalog = Pick<GameData, 'cards' | 'packs'>

export function saveGameSession(storage: StorageAccess, setup: SetupState, game: ActiveGameState): boolean {
  const session: PersistedGameSession = { schemaVersion: GAME_SESSION_SCHEMA_VERSION, setup, game }
  try {
    storage.setItem(GAME_SESSION_KEY, JSON.stringify(session))
    return true
  } catch {
    return false
  }
}

export function loadGameSession(storage: StorageAccess, catalog: GameCatalog): PersistedGameSession | null {
  let raw: string | null
  try {
    raw = storage.getItem(GAME_SESSION_KEY)
  } catch {
    return null
  }
  if (raw === null) return null

  try {
    const value: unknown = JSON.parse(raw)
    const normalized = normalizeLegacySession(value)
    if (isPersistedGameSession(normalized, catalog)) return normalized
  } catch {
    // Invalid JSON is discarded below.
  }
  clearGameSession(storage)
  return null
}

export function clearGameSession(storage: Pick<Storage, 'removeItem'>): void {
  try {
    storage.removeItem(GAME_SESSION_KEY)
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

function isPersistedGameSession(value: unknown, catalog: GameCatalog): value is PersistedGameSession {
  if (!isRecord(value) || value.schemaVersion !== GAME_SESSION_SCHEMA_VERSION) return false
  const cardIds = new Set(catalog.cards.map((card) => card.id))
  const packIds = new Set(catalog.packs.map((pack) => pack.id))
  return isSetupState(value.setup, packIds) && isGameState(value.game, cardIds, packIds, value.setup)
}

function isSetupState(value: unknown, packIds: ReadonlySet<string>): value is SetupState {
  if (!isRecord(value) || !isMode(value.mode) || !isNonNegativeInteger(value.nextPlayerId)) return false
  if (typeof value.removeAfterAbsence !== 'boolean' || typeof value.removeAfterRefusal !== 'boolean') return false
  if (typeof value.unlimitedReplacement !== 'boolean' || typeof value.penalizeReplacement !== 'boolean') return false
  if (!isStringArray(value.selectedPackIds) || !isUnique(value.selectedPackIds) || value.selectedPackIds.some((id) => !packIds.has(id))) return false
  if (!Array.isArray(value.players) || value.players.length < 2 || !value.players.every(isSetupPlayer)) return false
  return isUnique(value.players.map((player) => player.id))
}

function isSetupPlayer(value: unknown): value is SetupPlayer {
  return isRecord(value) && typeof value.id === 'string' && value.id.length > 0 && typeof value.name === 'string' &&
    typeof value.inRelationship === 'boolean' && (value.boundary === null || isBoundary(value.boundary))
}

function isGameState(
  value: unknown,
  cardIds: ReadonlySet<string>,
  packIds: ReadonlySet<string>,
  setup: SetupState,
): value is ActiveGameState {
  if (!isRecord(value) || !isMode(value.mode) || typeof value.removeAfterAbsence !== 'boolean' || typeof value.removeAfterRefusal !== 'boolean') return false
  if (typeof value.unlimitedReplacement !== 'boolean' || typeof value.penalizeReplacement !== 'boolean') return false
  if (value.unlimitedReplacement !== setup.unlimitedReplacement || value.penalizeReplacement !== setup.penalizeReplacement) return false
  if (!Array.isArray(value.players) || value.players.length < 1 || !value.players.every(isGamePlayer)) return false
  if (!Array.isArray(value.eliminatedPlayers) || !value.eliminatedPlayers.every(isGamePlayer)) return false

  const allPlayers = [...value.players, ...value.eliminatedPlayers]
  const allIds = allPlayers.map((player) => player.id)
  const activeIds = new Set(value.players.map((player) => player.id))
  if (!isUnique(allIds) || !isStringArray(value.playerOrder) || !sameMembers(value.playerOrder, allIds)) return false
  if (!isNonNegativeInteger(value.currentPlayerIndex) || value.currentPlayerIndex >= value.players.length) return false
  if (!isStringArray(value.selectedPackIds) || !isUnique(value.selectedPackIds) || value.selectedPackIds.some((id) => !packIds.has(id))) return false
  if (!sameMembers(value.selectedPackIds, setup.selectedPackIds) || value.mode !== setup.mode && value.mode !== 'manual') return false
  if (typeof value.selectedType !== 'string' && value.selectedType !== null || value.selectedType !== null && !isCardType(value.selectedType)) return false

  if (!isCardIdArray(value.queue, cardIds) || !isCardIdArray(value.usedCardIds, cardIds)) return false
  if (!Array.isArray(value.cooldown) || !value.cooldown.every((entry) => isCooldownEntry(entry, cardIds))) return false
  const cooldownIds = value.cooldown.map((entry) => entry.cardId)
  if (!isUnique(cooldownIds) || hasOverlap(value.queue, value.usedCardIds) || hasOverlap(value.queue, cooldownIds) || hasOverlap(value.usedCardIds, cooldownIds)) return false
  if (!isCurrentTurn(value.currentTurn, cardIds, activeIds, value.players[value.currentPlayerIndex].id, value.selectedType)) return false
  if (value.currentTurn && (value.queue.includes(value.currentTurn.cardId) || value.usedCardIds.includes(value.currentTurn.cardId) || cooldownIds.includes(value.currentTurn.cardId))) return false
  return allIds.every((id) => setup.players.some((player) => player.id === id))
}

function isGamePlayer(value: unknown): value is ActiveGamePlayer {
  if (!isRecord(value) || !isBoundary(value.boundary) || typeof value.id !== 'string' || value.id.length === 0) return false
  if (typeof value.name !== 'string' || typeof value.inRelationship !== 'boolean' || !isNonNegativeInteger(value.colorId)) return false
  return ['activityPoints', 'answeredTruths', 'completedDares', 'absenceSkips', 'refusalSkips', 'refusedDares', 'refusedTruths', 'replacementPenaltyTurns']
    .every((field) => isNonNegativeInteger(value[field])) &&
    isNonNegativeInteger(value.truthCount) && value.truthCount <= 2
}

function isCurrentTurn(
  value: unknown,
  cardIds: ReadonlySet<string>,
  activeIds: ReadonlySet<string>,
  currentPlayerId: string,
  selectedType: unknown,
): value is CurrentTurn | null {
  if (value === null) return true
  if (!isRecord(value) || typeof value.cardId !== 'string' || !cardIds.has(value.cardId)) return false
  if (!isCardType(value.type) || value.type !== selectedType || typeof value.resolvedText !== 'string') return false
  if (!Array.isArray(value.renderSegments) || !value.renderSegments.every(isRenderSegment)) return false
  if (value.renderSegments.map((segment) => segment.text).join('') !== value.resolvedText) return false
  if (value.phoneNumber !== null && (typeof value.phoneNumber !== 'string' || !/^\+7 \(9\d{2}\) \d{3}-\d{2}-\d{2}$/.test(value.phoneNumber))) return false
  if (!isStringArray(value.secondaryPlayerIds) || !isUnique(value.secondaryPlayerIds)) return false
  const secondaryPlayerIds = value.secondaryPlayerIds
  return secondaryPlayerIds.every((id) => activeIds.has(id) && id !== currentPlayerId) &&
    value.renderSegments.every((segment) => segment.kind !== 'player' || secondaryPlayerIds.includes(segment.playerId))
}

function isRenderSegment(value: unknown): value is CurrentTurn['renderSegments'][number] {
  return isRecord(value) && typeof value.text === 'string' && (
    value.kind === 'text' || value.kind === 'player' && typeof value.playerId === 'string'
  )
}

function normalizeLegacySession(value: unknown): unknown {
  if (!isRecord(value) || value.schemaVersion !== GAME_SESSION_SCHEMA_VERSION || !isRecord(value.game) || !isRecord(value.setup)) return value
  const game = value.game
  const setup = {
    ...value.setup,
    unlimitedReplacement: value.setup.unlimitedReplacement ?? false,
    penalizeReplacement: value.setup.penalizeReplacement ?? false,
  }
  const order = Array.isArray(game.playerOrder) ? game.playerOrder.filter((id): id is string => typeof id === 'string') : []
  const colorById = new Map(order.map((id, index) => [id, index]))
  const normalizePlayer = (player: unknown) => isRecord(player) && typeof player.id === 'string'
    ? {
        ...player,
        colorId: player.colorId ?? colorById.get(player.id) ?? colorById.size,
        replacementPenaltyTurns: player.replacementPenaltyTurns ?? 0,
      }
    : player
  const turn = isRecord(game.currentTurn) && typeof game.currentTurn.resolvedText === 'string' && game.currentTurn.renderSegments === undefined
    ? { ...game.currentTurn, renderSegments: [{ kind: 'text', text: game.currentTurn.resolvedText }] }
    : game.currentTurn
  return {
    ...value,
    setup,
    game: {
      ...game,
      unlimitedReplacement: game.unlimitedReplacement ?? setup.unlimitedReplacement,
      penalizeReplacement: game.penalizeReplacement ?? setup.penalizeReplacement,
      currentTurn: turn,
      players: Array.isArray(game.players) ? game.players.map(normalizePlayer) : game.players,
      eliminatedPlayers: Array.isArray(game.eliminatedPlayers) ? game.eliminatedPlayers.map(normalizePlayer) : game.eliminatedPlayers,
    },
  }
}

function isCooldownEntry(value: unknown, cardIds: ReadonlySet<string>) {
  return isRecord(value) && typeof value.cardId === 'string' && cardIds.has(value.cardId) &&
    isNonNegativeInteger(value.turnsRemaining) && value.turnsRemaining > 0
}

function isCardIdArray(value: unknown, cardIds: ReadonlySet<string>): value is string[] {
  return isStringArray(value) && isUnique(value) && value.every((id) => cardIds.has(id))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isBoundary(value: unknown): value is Boundary {
  return value === 'virgin' || value === 'regular' || value === 'full'
}

function isMode(value: unknown) {
  return value === 'automatic' || value === 'manual'
}

function isCardType(value: unknown) {
  return value === 'truth' || value === 'dare'
}

function isUnique(values: readonly string[]) {
  return new Set(values).size === values.length
}

function sameMembers(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value) => right.includes(value))
}

function hasOverlap(left: readonly string[], right: readonly string[]) {
  const rightSet = new Set(right)
  return left.some((value) => rightSet.has(value))
}
