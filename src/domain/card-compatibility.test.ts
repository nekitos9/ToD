import { describe, expect, it } from 'vitest'
import { gameData } from '../generated/game-data'
import {
  isCardPotentiallyPlayable,
  normalizeSelectedPackIds,
  selectPackAvailability,
} from './card-compatibility'

const fullPlayers = [
  { boundary: 'Полный раж', inRelationship: false },
  { boundary: 'Полный раж', inRelationship: false },
]

describe('card compatibility', () => {
  it('requires an eligible actor and the configured number of distinct other players', () => {
    const card = gameData.cards.find((item) => item.otherPlayers === 1)!
    expect(isCardPotentiallyPlayable(card, fullPlayers, gameData.boundaries)).toBe(true)
    expect(isCardPotentiallyPlayable(card, fullPlayers.slice(0, 1), gameData.boundaries)).toBe(false)
  })

  it('applies boundary and relationship restrictions to every participant', () => {
    const hotCard = gameData.cards.find((card) => card.pack === 'Горячий' && card.boundary === 'Полный раж')!
    expect(isCardPotentiallyPlayable(hotCard, fullPlayers, gameData.boundaries)).toBe(true)
    expect(isCardPotentiallyPlayable(hotCard, [
      fullPlayers[0],
      { boundary: 'Обычный', inRelationship: false },
    ], gameData.boundaries)).toBe(false)
    expect(isCardPotentiallyPlayable(hotCard, [
      fullPlayers[0],
      { boundary: 'Полный раж', inRelationship: true },
    ], gameData.boundaries)).toBe(false)
  })

  it('selects active packs and removes inactive ids from a previous selection', () => {
    const availability = selectPackAvailability(
      gameData.packs,
      gameData.cards,
      [
        { boundary: 'Целочка', inRelationship: true },
        { boundary: 'Целочка', inRelationship: true },
      ],
      gameData.boundaries,
    )
    const hot = availability.find((item) => item.pack.name === 'Горячий')!
    const ordinary = availability.find((item) => item.pack.name === 'Обычный')!
    expect(hot.active).toBe(false)
    expect(ordinary.active).toBe(true)
    expect(normalizeSelectedPackIds([hot.pack.id, ordinary.pack.id], availability)).toEqual([ordinary.pack.id])
  })
})
