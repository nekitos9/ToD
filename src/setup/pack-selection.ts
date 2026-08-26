import { normalizeSelectedPackIds, selectPackAvailability } from '../domain/card-compatibility'
import { gameData } from '../generated/game-data'
import { BOUNDARY_DATA_NAMES, type SetupState } from './setup-state'

export function getPackAvailability(setup: SetupState) {
  return selectPackAvailability(
    gameData.packs,
    gameData.cards,
    setup.players.map((player) => ({
      boundary: player.boundary ? BOUNDARY_DATA_NAMES[player.boundary] : null,
      inRelationship: player.inRelationship,
    })),
    gameData.boundaries,
  )
}

export function normalizeSetupPackSelection(setup: SetupState): SetupState {
  const selectedPackIds = normalizeSelectedPackIds(setup.selectedPackIds, getPackAvailability(setup))
  if (
    selectedPackIds.length === setup.selectedPackIds.length &&
    selectedPackIds.every((id, index) => id === setup.selectedPackIds[index])
  ) return setup
  return { ...setup, selectedPackIds }
}
