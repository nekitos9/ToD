import { BottomNavigation } from '../components/BottomNavigation'
import { Button } from '../components/Button'
import { FocusRegion } from '../components/FocusRegion'
import { getResultPlayers, type ActiveGameState } from '../game/game-state'
import { DecorativeCircles } from '../setup/WelcomeScreen'
import './results.css'
import { formatResult } from './results-format'

interface ResultsScreenProps {
  readonly game: ActiveGameState
  readonly onRestart: () => void
  readonly onReusePlayers: () => void
}

const playerColors = ['#ff0004', '#dbff00', '#00e1d5', '#cf25e9', '#ffb000', '#00ad1d']

export function ResultsScreen({ game, onRestart, onReusePlayers }: ResultsScreenProps) {
  const players = getResultPlayers(game)
  return (
    <FocusRegion>
      <main className="results-screen">
        <DecorativeCircles />
        <div className="results-screen__scroll">
          <div className="results">
            <header>
              <h1>Результаты</h1>
              <p>Весело и стыдно? Мне тоже.</p>
            </header>
            <div className="results__list">
              {players.map((player, index) => {
                const result = formatResult(player)
                return (
                  <p className="results__player" key={player.id}>
                    <strong style={{ color: playerColors[index % playerColors.length] }}>{player.name}</strong>
                    {' '}{result.main}
                    {result.refusals && <span className="results__refusals">{result.refusals}</span>}
                    {result.activity}.
                  </p>
                )
              })}
            </div>
          </div>
        </div>
        <BottomNavigation>
          <Button onClick={onRestart}>С нуля</Button>
          <Button onClick={onReusePlayers}>С теми же игроками</Button>
        </BottomNavigation>
      </main>
    </FocusRegion>
  )
}
