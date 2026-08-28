import { BottomNavigation } from '../components/BottomNavigation'
import { Button } from '../components/Button'
import { FocusRegion } from '../components/FocusRegion'
import { rulesContent } from './content'
import { RuleCheckbox } from './RuleCheckbox'
import type { SetupState } from './setup-state'
import { DecorativeCircles } from './WelcomeScreen'

interface RulesScreenProps {
  readonly animateTransition: boolean
  readonly onBack: () => void
  readonly onNext: () => void
  readonly onSettingsChange: (settings: SetupState) => void
  readonly settings: SetupState
}

export function RulesScreen({ animateTransition, onBack, onNext, onSettingsChange, settings }: RulesScreenProps) {
  return (
    <FocusRegion>
      <main className={`setup-screen setup-screen--rules${animateTransition ? ' setup-screen--transition' : ''}`}>
        <DecorativeCircles />
        <div className="setup-screen__scroll">
          <div className="rules">
            <header>
              <h1>{rulesContent.title}</h1>
              <p>{rulesContent.subtitle}</p>
            </header>
            <ol className="rules__list">
              {rulesContent.rules.map((rule) => <li key={rule}>{rule}</li>)}
            </ol>
            <div className="rules__settings">
              <RuleCheckbox checked={settings.removeAfterRefusal} onChange={(removeAfterRefusal) => onSettingsChange({ ...settings, removeAfterRefusal })}>
                {rulesContent.refusal}
              </RuleCheckbox>
              <RuleCheckbox checked={settings.removeAfterAbsence} onChange={(removeAfterAbsence) => onSettingsChange({ ...settings, removeAfterAbsence })}>
                {rulesContent.absence}
              </RuleCheckbox>
              <RuleCheckbox checked={settings.unlimitedReplacement} onChange={(unlimitedReplacement) => onSettingsChange({ ...settings, unlimitedReplacement })}>
                {rulesContent.unlimitedReplacement}
              </RuleCheckbox>
              <RuleCheckbox checked={settings.penalizeReplacement} onChange={(penalizeReplacement) => onSettingsChange({ ...settings, penalizeReplacement })}>
                {rulesContent.replacementPenalty}
              </RuleCheckbox>
            </div>
          </div>
        </div>
        <BottomNavigation>
          <Button onClick={onBack}>Назад</Button>
          <Button onClick={onNext}>Далее</Button>
        </BottomNavigation>
      </main>
    </FocusRegion>
  )
}
