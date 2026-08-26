import { useState } from 'react'
import { gameData } from '../generated/game-data'
import { ActionIcon } from '../components/ActionIcon'
import { BottomNavigation } from '../components/BottomNavigation'
import { Button } from '../components/Button'
import { Dialog } from '../components/Dialog'
import { IconButton } from '../components/IconButton'
import { ScreenLayout } from '../components/ScreenLayout'
import './showcase.css'

export function App() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <ScreenLayout
      title="Компоненты"
      subtitle="Визуальная основа приложения"
      footer={
        <BottomNavigation>
          <Button onClick={() => setDialogOpen(true)}>Назад</Button>
          <Button disabled>Далее</Button>
        </BottomNavigation>
      }
    >
      <section className="showcase" aria-labelledby="buttons-heading">
        <h2 id="buttons-heading">Кнопки</h2>
        <div className="showcase__buttons">
          <Button>Основная</Button>
          <Button variant="truth">Правда</Button>
          <Button variant="dare">Действие</Button>
          <Button disabled>Неактивна</Button>
        </div>
      </section>

      <section className="showcase" aria-labelledby="icons-heading">
        <h2 id="icons-heading">Действия</h2>
        <div className="showcase__icons">
          <IconButton icon={<ActionIcon name="complete" />} label="Выполнено" />
          <IconButton icon={<ActionIcon name="skip" />} label="Пропустить" />
          <IconButton icon={<ActionIcon name="reroll" />} label="Другой вопрос" />
          <IconButton icon={<ActionIcon name="change-question" />} label="Сменить вопрос" />
        </div>
      </section>

      <section className="showcase" aria-labelledby="data-heading">
        <h2 id="data-heading">Загруженные данные</h2>
        <dl className="showcase__summary">
          <Summary label="Карточки" value={gameData.summary.cardCount} />
          <Summary label="Паки" value={gameData.summary.packCount} />
          <Summary label="Грани" value={gameData.summary.boundaryCount} />
          <Summary label="Типы" value={gameData.summary.cardTypeCount} />
        </dl>
      </section>

      <Button className="showcase__dialog-trigger" onClick={() => setDialogOpen(true)}>
        Открыть окно
      </Button>

      <Dialog
        actions={
          <>
            <button type="button" onClick={() => setDialogOpen(false)}>Да</button>
            <button type="button" onClick={() => setDialogOpen(false)}>Нет</button>
          </>
        }
        onClose={() => setDialogOpen(false)}
        open={dialogOpen}
        title="Конец?"
      >
        <p>Уверены, что хотите прекратить?</p>
      </Dialog>
    </ScreenLayout>
  )
}

function Summary({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
