import type { BoundaryDefinition, GameCard, PackDefinition } from '../data/game-data'

export interface PlayerCompatibilityProfile {
  readonly boundary: string | null
  readonly inRelationship: boolean
}

export interface PackAvailability {
  readonly active: boolean
  readonly pack: PackDefinition
}

export function isCardPotentiallyPlayable(
  card: GameCard,
  players: readonly PlayerCompatibilityProfile[],
  boundaries: readonly BoundaryDefinition[],
): boolean {
  const boundaryLevels = new Map(boundaries.map((boundary) => [boundary.name, boundary.level]))
  const requiredLevel = boundaryLevels.get(card.boundary)
  if (requiredLevel === undefined) return false

  const eligiblePlayers = players.filter((player) => {
    if (!player.boundary) return false
    const playerLevel = boundaryLevels.get(player.boundary)
    if (playerLevel === undefined || playerLevel < requiredLevel) return false
    return card.relationshipAllowed || !player.inRelationship
  })

  return eligiblePlayers.length >= card.otherPlayers + 1
}

export function selectPackAvailability(
  packs: readonly PackDefinition[],
  cards: readonly GameCard[],
  players: readonly PlayerCompatibilityProfile[],
  boundaries: readonly BoundaryDefinition[],
): readonly PackAvailability[] {
  const activePackIds = new Set(
    cards
      .filter((card) => isCardPotentiallyPlayable(card, players, boundaries))
      .map((card) => card.packId),
  )

  return packs.map((pack) => ({ active: activePackIds.has(pack.id), pack }))
}

export function normalizeSelectedPackIds(
  selectedPackIds: readonly string[],
  availability: readonly PackAvailability[],
): readonly string[] {
  const activeIds = new Set(availability.filter((item) => item.active).map((item) => item.pack.id))
  return selectedPackIds.filter((id) => activeIds.has(id))
}
