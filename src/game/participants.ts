import type { BoundaryDefinition, GameCard } from '../data/game-data'
import { BOUNDARY_DATA_NAMES } from '../setup/setup-state'
import type { ActiveGamePlayer, ActiveGameState } from './game-state'
import { nextRandom, type RandomSource } from './random'

export function getEligibleSecondaryPlayers(
  card: GameCard,
  state: ActiveGameState,
  boundaries: readonly BoundaryDefinition[],
): readonly ActiveGamePlayer[] {
  const levels = new Map(boundaries.map((boundary) => [boundary.name, boundary.level]))
  const requiredLevel = levels.get(card.boundary)
  if (requiredLevel === undefined) return []

  return state.players.filter((player, index) =>
    index !== state.currentPlayerIndex &&
    (levels.get(BOUNDARY_DATA_NAMES[player.boundary]) ?? -1) >= requiredLevel &&
    (card.relationshipAllowed || !player.inRelationship),
  )
}

export function selectSecondaryParticipants(
  card: GameCard,
  state: ActiveGameState,
  boundaries: readonly BoundaryDefinition[],
  random: RandomSource,
): readonly ActiveGamePlayer[] | null {
  const candidates = [...getEligibleSecondaryPlayers(card, state, boundaries)]
  if (candidates.length < card.otherPlayers) return null
  const selected: ActiveGamePlayer[] = []

  while (selected.length < card.otherPlayers) {
    const pool = card.type === 'dare'
      ? candidates.filter((player) => player.activityPoints === Math.min(...candidates.map((item) => item.activityPoints)))
      : candidates
    const choice = pool[Math.floor(nextRandom(random) * pool.length)]
    selected.push(choice)
    candidates.splice(candidates.findIndex((player) => player.id === choice.id), 1)
  }

  return selected
}
