import { describe, expect, it } from 'vitest'
import type { GameData } from '../data/game-data'
import type { SetupState } from '../setup/setup-state'
import { completePackCard, completeUnavailableTurn, createGame, drawCard, recordTypeChoice, skipCurrentTurn } from './game-state'
import type { RandomSource } from './random'

describe('deck lifecycle invariants', () => {
  it('preserves disjoint card zones through a long deterministic scenario', () => {
    const random = seededRandom(0x13b)
    const setup: SetupState = {
      mode: 'automatic', nextPlayerId: 5, penalizeReplacement: false, removeAfterAbsence: false, removeAfterRefusal: false,
      unlimitedReplacement: false,
      selectedPackIds: ['pack'],
      players: Array.from({ length: 4 }, (_, index) => ({
        boundary: 'full', id: `p${index + 1}`, inRelationship: false, name: `Player ${index + 1}`,
      })),
    }
    const cards = Array.from({ length: 24 }, (_, index) => ({
      boundary: 'Целочка', id: `card-${index}`, otherPlayers: index % 3 === 0 ? 1 : 0,
      pack: 'Обычный', packId: 'pack', relationshipAllowed: true, text: index % 3 === 0 ? '*PLAYER* действует' : `Card ${index}`, type: 'dare' as const,
    }))
    const data: GameData = {
      boundaries: [
        { description: '', level: 0, name: 'Целочка' },
        { description: '', level: 1, name: 'Обычный' },
        { description: '', level: 2, name: 'Полный раж' },
      ],
      cards, cardTypes: [], packs: [], source: 'invariant',
      summary: { boundaryCount: 3, cardCount: cards.length, cardTypeCount: 1, packCount: 1 },
    }
    let game = createGame(setup, data, random)
    const eliminated = game.players[3]
    game = { ...game, players: game.players.slice(0, 3), eliminatedPlayers: [eliminated] }
    const completed = new Set<string>()

    for (let step = 0; step < 120; step += 1) {
      const beforeCooldown = new Map(game.cooldown.map((entry) => [entry.cardId, entry.turnsRemaining]))
      const chosen = recordTypeChoice(game, 'dare')
      const drawn = drawCard(chosen, 'dare', data, random)
      game = drawn.state
      if (game.currentTurn) {
        expect(game.currentTurn.secondaryPlayerIds).not.toContain(eliminated.id)
        if (step % 5 === 0) game = skipCurrentTurn(game, 'refusal')
        else {
          completed.add(game.currentTurn.cardId)
          game = completePackCard(game)
        }
      } else {
        game = completeUnavailableTurn(game)
      }

      const queue = new Set(game.queue)
      const used = new Set(game.usedCardIds)
      const cooldown = new Set(game.cooldown.map((entry) => entry.cardId))
      expect([...queue].some((id) => used.has(id) || cooldown.has(id))).toBe(false)
      expect([...used].some((id) => cooldown.has(id))).toBe(false)
      expect(game.currentTurn).toBeNull()
      expect(game.currentPlayerIndex).toBeGreaterThanOrEqual(0)
      expect(game.currentPlayerIndex).toBeLessThan(game.players.length)
      expect([...completed].every((id) => used.has(id) && !queue.has(id) && !cooldown.has(id))).toBe(true)
      for (const [id, remaining] of beforeCooldown) {
        if (remaining > 1) expect(queue.has(id)).toBe(false)
      }
    }
  })
})

function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0
  return { next: () => ((state = (state * 1664525 + 1013904223) >>> 0) / 0x1_0000_0000) }
}
