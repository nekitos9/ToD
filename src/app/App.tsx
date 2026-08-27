import { useState } from 'react'
import { GameScreen } from '../game/GameScreen'
import { createGame, type ActiveGameState } from '../game/game-state'
import { gameData } from '../generated/game-data'
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
  function navigate(nextStep: SetupStep) {
    setHasNavigated(true)
    setStep(nextStep)
  }

  function openPacks() {
    setSetup((current) => normalizeSetupPackSelection(current))
    navigate('packs')
  }

  function startGame() {
    setGame(createGame(setup, gameData))
    navigate('game')
  }

  function showResults() {
    setHasNavigated(true)
    setStep('results')
  }

  function restartFromWelcome() {
    setGame(null)
    setSetup(initialSetupState)
    setHasNavigated(false)
    setStep('welcome')
  }

  function reusePlayers() {
    setGame(null)
    setHasNavigated(true)
    setStep('players')
  }

  if (step === 'game' && game) {
    return <GameScreen animateEntrance game={game} onExit={showResults} onGameChange={setGame} />
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

  return <WelcomeScreen animateTransition={hasNavigated} onStart={() => navigate('rules')} />
}
