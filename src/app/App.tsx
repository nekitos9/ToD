import { useState } from 'react'
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

  function navigate(nextStep: SetupStep) {
    setHasNavigated(true)
    setStep(nextStep)
  }

  function openPacks() {
    setSetup((current) => normalizeSetupPackSelection(current))
    navigate('packs')
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
        setup={setup}
      />
    )
  }

  return <WelcomeScreen animateTransition={hasNavigated} onStart={() => navigate('rules')} />
}
