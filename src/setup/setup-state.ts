export type SetupStep = 'welcome' | 'rules' | 'players'

export type Boundary = 'virgin' | 'regular' | 'full'
export type GameMode = 'automatic' | 'manual'

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
}

export const initialSetupState: SetupState = {
  removeAfterAbsence: false,
  removeAfterRefusal: false,
  mode: 'automatic',
  nextPlayerId: 3,
  players: [createPlayer('player-1'), createPlayer('player-2')],
}

export function createPlayer(id: string): SetupPlayer {
  return { boundary: null, id, inRelationship: false, name: '' }
}
