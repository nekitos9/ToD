import { beforeEach, describe, expect, it } from 'vitest'
import { createGame, type ActiveGameState } from '../game/game-state'
import { gameData } from '../generated/game-data'
import type { SetupState } from '../setup/setup-state'
import {
  clearGameSession,
  GAME_SESSION_KEY,
  GAME_SESSION_SCHEMA_VERSION,
  loadGameSession,
  saveGameSession,
} from './game-session'

describe('unfinished game persistence', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips the complete game snapshot without changing random resolved values', () => {
    const setup = makeSetup('Одинаково')
    const initial = createGame(setup, gameData, fixedRandom)
    const card = gameData.cards.find((item) => setup.selectedPackIds.includes(item.packId))!
    const game: ActiveGameState = {
      ...initial,
      currentTurn: {
        cardId: card.id,
        phoneNumber: '+7 (912) 345-67-89',
        renderSegments: [
          { kind: 'player', playerId: 'p2', text: 'Одинаково' },
          { kind: 'text', text: ' звонит по номеру +7 (912) 345-67-89' },
        ],
        resolvedText: 'Одинаково звонит по номеру +7 (912) 345-67-89',
        secondaryPlayerIds: ['p2'],
        type: card.type,
      },
      players: initial.players.map((player, index) => ({
        ...player,
        absenceSkips: index,
        activityPoints: index + 2,
        answeredTruths: index + 3,
        completedDares: index + 4,
        refusalSkips: index + 1,
        refusedDares: index,
        refusedTruths: index + 1,
        truthCount: index as 0 | 1,
      })),
      mode: 'manual',
      queue: initial.queue.filter((id) => id !== card.id),
      selectedType: card.type,
      usedCardIds: [],
    }

    expect(saveGameSession(localStorage, setup, game)).toBe(true)
    const restored = loadGameSession(localStorage, gameData)

    expect(restored).toEqual({ schemaVersion: GAME_SESSION_SCHEMA_VERSION, setup, game })
    expect(restored?.game.currentTurn?.phoneNumber).toBe('+7 (912) 345-67-89')
    expect(restored?.game.currentTurn?.secondaryPlayerIds).toEqual(['p2'])
    expect(restored?.game.queue).toEqual(game.queue)
    expect(restored?.game.mode).toBe('manual')
    expect(restored?.game.players.map((player) => player.id)).toEqual(['p1', 'p2'])
  })

  it('preserves cooldown, used cards and removed players', () => {
    const setup = makeSetup()
    const initial = createGame(setup, gameData, fixedRandom)
    const [usedId, cooldownId] = initial.queue
    const removed = initial.players[0]
    const game: ActiveGameState = {
      ...initial,
      cooldown: [{ cardId: cooldownId, turnsRemaining: 2 }],
      currentPlayerIndex: 0,
      eliminatedPlayers: [removed],
      players: [initial.players[1]],
      queue: initial.queue.filter((id) => id !== usedId && id !== cooldownId),
      usedCardIds: [usedId],
    }
    saveGameSession(localStorage, setup, game)

    expect(loadGameSession(localStorage, gameData)?.game).toEqual(game)
  })

  it.each([
    ['invalid JSON', '{broken'],
    ['unknown schema', JSON.stringify({ schemaVersion: 999, setup: {}, game: {} })],
    ['missing critical gameplay state', JSON.stringify({ schemaVersion: 1, setup: makeSetup(), game: {} })],
  ])('discards %s safely', (_, raw) => {
    localStorage.setItem(GAME_SESSION_KEY, raw)
    expect(loadGameSession(localStorage, gameData)).toBeNull()
    expect(localStorage.getItem(GAME_SESSION_KEY)).toBeNull()
  })

  it('rejects a current turn that references an unknown card', () => {
    const setup = makeSetup()
    const game = createGame(setup, gameData, fixedRandom)
    localStorage.setItem(GAME_SESSION_KEY, JSON.stringify({
      schemaVersion: 1,
      setup,
      game: { ...game, selectedType: 'dare', currentTurn: { cardId: 'missing', phoneNumber: null, resolvedText: '', secondaryPlayerIds: [], type: 'dare' } },
    }))
    expect(loadGameSession(localStorage, gameData)).toBeNull()
  })

  it('always restores the newest rapid synchronous save', () => {
    const setup = makeSetup()
    const initial = createGame(setup, gameData, fixedRandom)
    for (let index = 0; index < 24; index += 1) {
      saveGameSession(localStorage, setup, { ...initial, currentPlayerIndex: index % 2 })
    }
    expect(loadGameSession(localStorage, gameData)?.game.currentPlayerIndex).toBe(1)
  })

  it('restores immutable render content without consulting changed catalog text', () => {
    const setup = makeSetup('Одинаково')
    const initial = createGame(setup, gameData, fixedRandom)
    const card = gameData.cards.find((item) => setup.selectedPackIds.includes(item.packId))!
    const game: ActiveGameState = {
      ...initial,
      selectedType: card.type,
      queue: initial.queue.filter((id) => id !== card.id),
      currentTurn: {
        cardId: card.id,
        phoneNumber: null,
        renderSegments: [{ kind: 'text', text: 'Старый сохранённый текст' }],
        resolvedText: 'Старый сохранённый текст',
        secondaryPlayerIds: [],
        type: card.type,
      },
    }
    saveGameSession(localStorage, setup, game)
    const changedCatalog = {
      ...gameData,
      cards: gameData.cards.map((item) => item.id === card.id ? { ...item, text: '*PLAYER9* Новый текст' } : item),
    }
    expect(loadGameSession(localStorage, changedCatalog)?.game.currentTurn).toEqual(game.currentTurn)
  })

  it('upgrades a schema 1 snapshot without colors or render segments safely', () => {
    const setup = makeSetup()
    const game = createGame(setup, gameData, fixedRandom)
    const legacy = JSON.parse(JSON.stringify({ schemaVersion: 1, setup, game }))
    for (const player of legacy.game.players) delete player.colorId
    legacy.game.selectedType = 'truth'
    const cardId = legacy.game.queue.shift()
    legacy.game.currentTurn = { cardId, phoneNumber: null, resolvedText: 'Готовый текст', secondaryPlayerIds: [], type: 'truth' }
    localStorage.setItem(GAME_SESSION_KEY, JSON.stringify(legacy))
    const restored = loadGameSession(localStorage, gameData)
    expect(restored?.game.players.map((player) => player.colorId)).toEqual([0, 1])
    expect(restored?.game.currentTurn?.renderSegments).toEqual([{ kind: 'text', text: 'Готовый текст' }])
  })

  it('clears a saved game idempotently', () => {
    const setup = makeSetup()
    saveGameSession(localStorage, setup, createGame(setup, gameData, fixedRandom))
    clearGameSession(localStorage)
    clearGameSession(localStorage)
    expect(loadGameSession(localStorage, gameData)).toBeNull()
  })
})

function makeSetup(sharedName?: string): SetupState {
  return {
    mode: 'automatic',
    nextPlayerId: 3,
    players: [
      { boundary: 'full', id: 'p1', inRelationship: false, name: sharedName ?? 'Первый' },
      { boundary: 'full', id: 'p2', inRelationship: true, name: sharedName ?? 'Второй' },
    ],
    removeAfterAbsence: true,
    removeAfterRefusal: true,
    selectedPackIds: gameData.packs.map((pack) => pack.id),
  }
}

const fixedRandom = { next: () => 0 }
