import { useState } from 'react'
import { RulesScreen } from '../setup/RulesScreen'
import { PlayersScreen } from '../setup/PlayersScreen'
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
        onSetupChange={setSetup}
        setup={setup}
      />
    )
  }

  return <WelcomeScreen animateTransition={hasNavigated} onStart={() => navigate('rules')} />
}
