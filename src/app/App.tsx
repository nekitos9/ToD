import { useState } from 'react'
import { Button } from '../components/Button'
import { Dialog } from '../components/Dialog'
import { GameScreen } from '../game/GameScreen'
import { createGame, type ActiveGameState } from '../game/game-state'
import { gameData } from '../generated/game-data'
import { clearGameSession, loadGameSession, saveGameSession, type PersistedGameSession } from '../persistence/game-session'
import { ResultsScreen } from '../results/ResultsScreen'
import { RulesScreen } from '../setup/RulesScreen'
import { PlayersScreen } from '../setup/PlayersScreen'
import { PacksScreen } from '../setup/PacksScreen'
import { normalizeSetupPackSelection } from '../setup/pack-selection'
import { initialSetupState, type SetupState, type SetupStep } from '../setup/setup-state'
import { WelcomeScreen } from '../setup/WelcomeScreen'

export function App() {
  const [step, setStep] = useState<SetupStep>('welcome')
  const [setup, setSetup] = useState<SetupState>(initialSetupState)
  const [hasNavigated, setHasNavigated] = useState(false)
  const [game, setGame] = useState<ActiveGameState | null>(null)
  const [restorableSession, setRestorableSession] = useState<PersistedGameSession | null>(() =>
    typeof window === 'undefined' ? null : loadGameSession(window.localStorage, gameData),
  )
  function navigate(nextStep: SetupStep) {
    setHasNavigated(true)
    setStep(nextStep)
  }

  function openPacks() {
    setSetup((current) => normalizeSetupPackSelection(current))
    navigate('packs')
  }

  function startGame() {
    const nextGame = createGame(setup, gameData)
    saveGameSession(window.localStorage, setup, nextGame)
    setGame(nextGame)
    navigate('game')
  }

  function updateGame(nextGame: ActiveGameState) {
    saveGameSession(window.localStorage, setup, nextGame)
    setGame(nextGame)
  }

  function continueGame() {
    if (!restorableSession) return
    setSetup(restorableSession.setup)
    setGame(restorableSession.game)
    setRestorableSession(null)
    navigate('game')
  }

  function startAnotherGame() {
    clearGameSession(window.localStorage)
    setRestorableSession(null)
    setGame(null)
    setSetup(initialSetupState)
    setHasNavigated(false)
    setStep('welcome')
  }

  function showResults() {
    clearGameSession(window.localStorage)
    setHasNavigated(true)
    setStep('results')
  }

  function restartFromWelcome() {
    clearGameSession(window.localStorage)
    setGame(null)
    setSetup(initialSetupState)
    setHasNavigated(false)
    setStep('welcome')
  }

  function reusePlayers() {
    clearGameSession(window.localStorage)
    setGame(null)
    setHasNavigated(true)
    setStep('players')
  }

  if (step === 'game' && game) {
    return <GameScreen animateEntrance game={game} onExit={showResults} onGameChange={updateGame} />
  }

  if (step === 'results' && game) {
    return <ResultsScreen game={game} onRestart={restartFromWelcome} onReusePlayers={reusePlayers} />
  }

  if (step === 'rules') {
    return (
      <RulesScreen
        animateTransition={hasNavigated}
        onBack={() => navigate('welcome')}
        onNext={() => navigate('players')}
        onSettingsChange={setSetup}
        settings={setup}
      />
    )
  }

  if (step === 'players') {
    return (
      <PlayersScreen
        animateTransition={hasNavigated}
        onBack={() => navigate('rules')}
        onNext={openPacks}
        onSetupChange={setSetup}
        setup={setup}
      />
    )
  }


  if (step === 'packs') {
    return (
      <PacksScreen
        animateTransition={hasNavigated}
        onBack={() => navigate('players')}
        onSetupChange={setSetup}
        onStart={startGame}
        setup={setup}
      />
    )
  }

  return (
    <WelcomeScreen
      animateTransition={hasNavigated}
      onStart={() => navigate('rules')}
      overlay={restorableSession ? (
        <Dialog
          actions={<><Button onClick={continueGame}>Продолжить</Button><Button onClick={startAnotherGame}>Начать другую</Button></>}
          className="dialog--resume"
          onClose={() => undefined}
          open
          title="Вижу незаконченную игру"
        ><p>Продолжить с того же места?</p></Dialog>
      ) : undefined}
    />
  )
}
