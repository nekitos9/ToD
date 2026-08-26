import { Button } from '../components/Button'
import { FocusRegion } from '../components/FocusRegion'
import { welcomeContent } from './content'
import './setup.css'

interface WelcomeScreenProps {
  readonly animateTransition: boolean
  readonly onStart: () => void
}

export function WelcomeScreen({ animateTransition, onStart }: WelcomeScreenProps) {
  return (
    <FocusRegion>
      <main className={`setup-screen setup-screen--welcome${animateTransition ? ' setup-screen--transition' : ''}`}>
        <DecorativeCircles />
        <div className="setup-screen__scroll">
          <div className="welcome">
            <h1>{welcomeContent.title}</h1>
            <p className="welcome__greeting">{welcomeContent.greeting}</p>
            <p className="welcome__contact">{welcomeContent.contact}</p>
            <Button className="welcome__start" onClick={onStart} variant="accent">Начать</Button>
            <p className="welcome__disclaimer">{welcomeContent.disclaimer}</p>
          </div>
        </div>
      </main>
    </FocusRegion>
  )
}

export function DecorativeCircles() {
  return (
    <>
      <div className="setup-screen__circle setup-screen__circle--first" aria-hidden="true" />
      <div className="setup-screen__circle setup-screen__circle--second" aria-hidden="true" />
    </>
  )
}
