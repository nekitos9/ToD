import { useEffect, useRef, useState } from 'react'
import { BottomNavigation } from '../components/BottomNavigation'
import { Button } from '../components/Button'
import { FocusRegion } from '../components/FocusRegion'
import { PlayerCard } from './PlayerCard'
import { PlayersHelpDialog } from './PlayersHelpDialog'
import { createPlayer, type SetupPlayer, type SetupState } from './setup-state'
import { DecorativeCircles } from './WelcomeScreen'
import './players.css'

interface PlayersScreenProps {
  readonly animateTransition: boolean
  readonly onBack: () => void
  readonly onNext: () => void
  readonly onSetupChange: (setup: SetupState) => void
  readonly setup: SetupState
}

export function PlayersScreen({ animateTransition, onBack, onNext, onSetupChange, setup }: PlayersScreenProps) {
  const [helpOpen, setHelpOpen] = useState(false)
  const [showBoundaryErrors, setShowBoundaryErrors] = useState(false)
  const pendingFocus = useRef<string | null>(null)

  useEffect(() => {
    if (!pendingFocus.current) return
    const element = document.querySelector<HTMLElement>(pendingFocus.current)
    pendingFocus.current = null
    element?.focus()
  }, [setup.players])

  function updatePlayer(updated: SetupPlayer) {
    onSetupChange({ ...setup, players: setup.players.map((player) => player.id === updated.id ? updated : player) })
  }

  function addPlayer() {
    const id = `player-${setup.nextPlayerId}`
    pendingFocus.current = `[data-player-id="${id}"] .player-card__name`
    onSetupChange({ ...setup, nextPlayerId: setup.nextPlayerId + 1, players: [...setup.players, createPlayer(id)] })
  }

  function removePlayer() {
    if (setup.players.length <= 2) return
    const removed = setup.players.at(-1)
    const next = setup.players.at(-2)
    if (!removed || !next) return
    pendingFocus.current = `[data-player-id="${next.id}"] .player-card__name`
    onSetupChange({ ...setup, players: setup.players.filter((player) => player.id !== removed.id) })
  }

  const namesValid = setup.players.every((player) => player.name.trim().length > 0)
  const boundariesValid = setup.players.every((player) => player.boundary !== null)

  function continueSetup() {
    if (!boundariesValid) {
      setShowBoundaryErrors(true)
      return
    }
    onNext()
  }

  return (
    <FocusRegion>
      <main className={`setup-screen setup-screen--players${animateTransition ? ' setup-screen--transition' : ''}`}>
        <DecorativeCircles />
        <div className="setup-screen__scroll">
          <div className="players">
            <header>
              <h1>Игроки</h1>
              <p>Это точно твои друзья?</p>
            </header>
            <button aria-label="Открыть справку о настройках игроков" className="players__help" data-focus-down=".player-card__name" onClick={() => setHelpOpen(true)} type="button">
              <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 29.25 29.25">
                <path d="M14.625 22.75h.003M10.359 11.578a4.27 4.27 0 0 1 8.507.458 4.27 4.27 0 0 1-2.655 3.504c-.832.333-1.586 1.032-1.586 1.929v.406M29.25 14.625A14.625 14.625 0 1 1 0 14.625a14.625 14.625 0 0 1 29.25 0Z" />
              </svg>
            </button>
            <div className="players__grid">
              {setup.players.map((player) => (
                <PlayerCard
                  boundaryInvalid={showBoundaryErrors && player.boundary === null}
                  key={player.id}
                  onChange={updatePlayer}
                  player={player}
                />
              ))}
            </div>
            <div className="players__actions">
              <button aria-label="Добавить игрока" className="round-action round-action--add" onClick={addPlayer} type="button" />
              <button aria-label="Удалить последнего игрока" className="round-action round-action--remove" disabled={setup.players.length <= 2} onClick={removePlayer} type="button" />
            </div>
            <button
              aria-checked={setup.mode === 'automatic'}
              className="game-mode"
              onClick={() => onSetupChange({ ...setup, mode: setup.mode === 'automatic' ? 'manual' : 'automatic' })}
              role="switch"
              type="button"
            >
              <span>Ручной</span>
              <span className="game-mode__track" aria-hidden="true"><span /></span>
              <span>Автоматический</span>
            </button>
          </div>
        </div>
        <BottomNavigation>
          <Button onClick={onBack}>Назад</Button>
          <Button disabled={!namesValid} onClick={continueSetup}>Далее</Button>
        </BottomNavigation>
        <PlayersHelpDialog onClose={() => setHelpOpen(false)} open={helpOpen} />
      </main>
    </FocusRegion>
  )
}
