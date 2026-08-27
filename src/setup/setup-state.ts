export type SetupStep = 'welcome' | 'rules' | 'players' | 'packs' | 'game'

export type Boundary = 'virgin' | 'regular' | 'full'
export type GameMode = 'automatic' | 'manual'

export const BOUNDARY_DATA_NAMES: Readonly<Record<Boundary, string>> = {
  virgin: 'Целочка',
  regular: 'Обычный',
  full: 'Полный раж',
}

export interface SetupPlayer {
  readonly boundary: Boundary | null
  readonly id: string
  readonly inRelationship: boolean
  readonly name: string
}

export interface SetupState {
  readonly removeAfterAbsence: boolean
  readonly removeAfterRefusal: boolean
  readonly mode: GameMode
  readonly nextPlayerId: number
  readonly players: readonly SetupPlayer[]
  readonly selectedPackIds: readonly string[]
}

export const initialSetupState: SetupState = {
  removeAfterAbsence: false,
  removeAfterRefusal: false,
  mode: 'automatic',
  nextPlayerId: 3,
  players: [createPlayer('player-1'), createPlayer('player-2')],
  selectedPackIds: [],
}

export function createPlayer(id: string): SetupPlayer {
  return { boundary: null, id, inRelationship: false, name: '' }
}
