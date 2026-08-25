import { gameData } from '../generated/game-data'

export function App() {
  return (
    <main className="app-shell">
      <h1>Правда или Действие</h1>
      <dl className="data-summary" aria-label="Загруженные данные">
        <div>
          <dt>Карточки</dt>
          <dd>{gameData.summary.cardCount}</dd>
        </div>
        <div>
          <dt>Паки</dt>
          <dd>{gameData.summary.packCount}</dd>
        </div>
        <div>
          <dt>Грани</dt>
          <dd>{gameData.summary.boundaryCount}</dd>
        </div>
        <div>
          <dt>Типы</dt>
          <dd>{gameData.summary.cardTypeCount}</dd>
        </div>
      </dl>
    </main>
  )
}
