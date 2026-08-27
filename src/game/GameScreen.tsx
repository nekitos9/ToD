import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import { ActionIcon } from '../components/ActionIcon'
import { Button } from '../components/Button'
import { Dialog } from '../components/Dialog'
import { FocusRegion } from '../components/FocusRegion'
import { IconButton } from '../components/IconButton'
import { gameData } from '../generated/game-data'
import { BOUNDARY_DATA_NAMES } from '../setup/setup-state'
import { DecorativeCircles } from '../setup/WelcomeScreen'
import type { CardType } from '../data/game-data'
import {
  canChooseType,
  completePackCard,
  completeSelectedTableTurn,
  completeTableTurn,
  completeUnavailableTurn,
  drawCard,
  getCurrentPlayer,
  isPackBaseExhausted,
  isReplacementAllowed,
  recordTypeChoice,
  replaceCurrentCard,
  skipCurrentTurn,
  switchGameToManual,
  type ActiveGameState,
  type CurrentTurn,
  type SkipReason,
} from './game-state'
import './game.css'
import { getSkipNotice } from './skip-notice'

interface GameScreenProps {
  readonly animateEntrance?: boolean
  readonly game: ActiveGameState
  readonly onExit: () => void
  readonly onGameChange: (game: ActiveGameState) => void
}

type ExitStage = 'closed' | 'first' | 'second'
type CardTransition =
  | { readonly kind: 'leaving'; readonly game: ActiveGameState; readonly manualType: CardType | null; readonly type: CardType }
  | { readonly kind: 'skipping'; readonly game: ActiveGameState; readonly manualType: CardType | null }
  | { readonly kind: 'dealing'; readonly game: ActiveGameState; readonly manualType: CardType | null }
  | { readonly kind: 'revealing'; readonly game: ActiveGameState; readonly manualType: CardType | null }

const playerPalette = ['#BE4244', '#7642BE', '#008F5B', '#CF25E9', '#AF6B00', '#4269BE']
type NoticeState = 'hidden' | 'visible' | 'closing'

export function GameScreen({ animateEntrance = false, game, onExit, onGameChange }: GameScreenProps) {
  const [manualType, setManualType] = useState<CardType | null>(null)
  const [exitStage, setExitStage] = useState<ExitStage>('closed')
  const [skipDialogOpen, setSkipDialogOpen] = useState(false)
  const [replacementDialogOpen, setReplacementDialogOpen] = useState(false)
  const [exhaustedDialogOpen, setExhaustedDialogOpen] = useState(false)
  const [cardTransition, setCardTransition] = useState<CardTransition | null>(null)
  const [notice, setNotice] = useState<{ readonly message: string; readonly state: NoticeState }>({ message: '', state: 'hidden' })
  const transitionTimer = useRef<number | undefined>(undefined)
  const noticeClosingTimer = useRef<number | undefined>(undefined)
  const noticeRemovalTimer = useRef<number | undefined>(undefined)
  const firstControlRef = useRef<HTMLButtonElement>(null)
  const turn = game.currentTurn
  const card = turn ? gameData.cards.find((item) => item.id === turn.cardId) : undefined
  const pack = card ? gameData.packs.find((item) => item.id === card.packId) : undefined
  const selectedType = turn?.type ?? manualType ?? game.selectedType
  const colors = useMemo(
    () => new Map(game.players.map((item, index) => [item.id, playerPalette[index % playerPalette.length]])),
    [game.players],
  )

  useEffect(() => {
    firstControlRef.current?.focus()
  }, [game.currentPlayerIndex])

  useEffect(() => () => {
    window.clearTimeout(transitionTimer.current)
    window.clearTimeout(noticeClosingTimer.current)
    window.clearTimeout(noticeRemovalTimer.current)
  }, [])

  function chooseType(type: CardType) {
    setCardTransition({ kind: 'revealing', game, manualType })
    scheduleTransitionEnd()
    if (game.mode === 'manual') {
      setManualType(type)
      return
    }
    const chosen = recordTypeChoice(game, type)
    const result = drawCard(chosen, type, gameData)
    onGameChange(result.state)
    if (result.card === null && isPackBaseExhausted(result.state)) setExhaustedDialogOpen(true)
  }

  function scheduleTransitionEnd() {
    window.clearTimeout(transitionTimer.current)
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    transitionTimer.current = window.setTimeout(() => setCardTransition(null), reduced ? 20 : 260)
  }

  function issueQuestion() {
    if (!manualType) return
    const chosen = recordTypeChoice(game, manualType)
    setCardTransition({ kind: 'dealing', game, manualType })
    window.clearTimeout(transitionTimer.current)
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    transitionTimer.current = window.setTimeout(() => setCardTransition(null), reduced ? 20 : 320)
    onGameChange(drawCard(chosen, manualType, gameData).state)
  }

  function finishTurn() {
    if (!selectedType) return
    const next = turn
      ? completePackCard(game)
      : game.selectedType !== null
        ? game.mode === 'manual' ? completeSelectedTableTurn(game) : completeUnavailableTurn(game)
        : completeTableTurn(game, selectedType)
    transitionToNextPlayer(next, selectedType, 'complete')
  }

  function transitionToNextPlayer(next: ActiveGameState, type: CardType, transition: 'complete' | 'skip') {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    setCardTransition(transition === 'skip'
      ? { kind: 'skipping', game, manualType }
      : { kind: 'leaving', game, manualType, type })
    setManualType(null)
    onGameChange(next)
    window.clearTimeout(transitionTimer.current)
    transitionTimer.current = window.setTimeout(() => setCardTransition(null), reduced ? 20 : 320)
  }

  function skip(reason: SkipReason) {
    if (!selectedType) return
    const skipState = game.selectedType === null && manualType !== null
      ? recordTypeChoice(game, manualType)
      : game
    const next = skipCurrentTurn(skipState, reason)
    const actor = getCurrentPlayer(skipState)
    const enabled = reason === 'absence' ? skipState.removeAfterAbsence : skipState.removeAfterRefusal
    const previousCount = reason === 'absence' ? actor.absenceSkips : actor.refusalSkips
    const noticeMessage = getSkipNotice(actor, reason, enabled, previousCount + 1)
    if (noticeMessage) showNotice(noticeMessage)
    setSkipDialogOpen(false)
    transitionToNextPlayer(next, selectedType, 'skip')
  }

  function showNotice(message: string) {
    window.clearTimeout(noticeClosingTimer.current)
    window.clearTimeout(noticeRemovalTimer.current)
    setNotice({ message, state: 'visible' })
    noticeClosingTimer.current = window.setTimeout(() => setNotice((current) => ({ ...current, state: 'closing' })), 3840)
    noticeRemovalTimer.current = window.setTimeout(() => setNotice({ message: '', state: 'hidden' }), 4000)
  }

  function replaceCard() {
    if (!turn) return
    const result = replaceCurrentCard(game, gameData)
    setReplacementDialogOpen(false)
    setCardTransition({ kind: 'dealing', game, manualType })
    onGameChange(result.state)
    scheduleTransitionEnd()
  }

  const choosing = !turn && manualType === null && game.selectedType === null
  const replacementAllowed = Boolean(card && isReplacementAllowed(card))

  return (
    <FocusRegion>
      <main className={`game-screen game-screen--${packTheme(pack?.name)}${animateEntrance ? ' game-screen--enter' : ''}`}>
        <DecorativeCircles />
        <div className="game-shell">
          <header className="game-header">
            <h1>Правда или действие</h1>
            <p>{game.mode === 'automatic' ? 'Автоматический' : 'Ручной'}</p>
          </header>

          <div className="game-card-stage" aria-live="polite">
            {cardTransition?.kind === 'dealing' && (
              <GameCard game={cardTransition.game} manualType={cardTransition.manualType} colors={colors} ariaHidden />
            )}
            <GameCard
              game={game}
              manualType={manualType}
              colors={colors}
              className={cardTransition?.kind === 'dealing'
                ? 'game-card--deal'
                : cardTransition?.kind === 'revealing'
                  ? 'game-card--reveal'
                  : undefined}
              firstControlRef={firstControlRef}
              onChooseType={chooseType}
            />
            {cardTransition?.kind === 'leaving' && (
              <GameCard
                game={cardTransition.game}
                manualType={cardTransition.manualType}
                colors={colors}
                className={`game-card--leave-${cardTransition.type}`}
                ariaHidden
              />
            )}
            {cardTransition?.kind === 'skipping' && (
              <GameCard
                game={cardTransition.game}
                manualType={cardTransition.manualType}
                colors={colors}
                className="game-card--skip"
                ariaHidden
              />
            )}
            {cardTransition?.kind === 'revealing' && (
              <GameCard
                game={cardTransition.game}
                manualType={cardTransition.manualType}
                colors={colors}
                className="game-card--choice-exit"
                ariaHidden
              />
            )}
          </div>

          <div className="game-actions">
            <GameAction ref={choosing ? undefined : firstControlRef} disabled={choosing} label="Готово" name="complete" onClick={finishTurn} />
            <GameAction disabled={choosing} label="Пропуск" name="skip" onClick={() => setSkipDialogOpen(true)} />
            <GameAction disabled={!replacementAllowed} label="Перезадать" name="reroll" onClick={() => setReplacementDialogOpen(true)} />
            <GameAction disabled={game.mode !== 'manual' || manualType === null || turn !== null} label="Выдать" name="change-question" onClick={issueQuestion} />
            <IconButton className="game-action game-action--exit" icon={<ExitIcon />} label="Выход" onClick={() => setExitStage('first')} tone="danger" />
          </div>
        </div>
      </main>

      <Dialog
        actions={<><Button onClick={() => setExitStage('second')}>Да</Button><Button onClick={() => setExitStage('closed')}>Нет</Button></>}
        onClose={() => setExitStage('closed')}
        open={exitStage === 'first'}
        title="Конец?"
      ><p>Уверены, что хотите прекратить?</p></Dialog>
      <Dialog
        actions={<><Button onClick={onExit}>Да</Button><Button onClick={() => setExitStage('closed')}>Нет</Button></>}
        onClose={() => setExitStage('closed')}
        open={exitStage === 'second'}
        title="Точно конец?"
      ><p>Вы точно уверены?</p></Dialog>
      <Dialog
        actions={<><Button onClick={() => skip('refusal')}>Он так захотел</Button><Button onClick={() => skip('absence')}>Нет за столом</Button></>}
        onClose={() => setSkipDialogOpen(false)}
        open={skipDialogOpen}
        title="Пропуск?"
      ><p>Почему игрок пропускает ход?</p></Dialog>
      <Dialog
        actions={<><Button onClick={() => setReplacementDialogOpen(false)}>Нет</Button><Button onClick={replaceCard}>Да</Button></>}
        onClose={() => setReplacementDialogOpen(false)}
        open={replacementDialogOpen}
        title="Замена"
      ><p>Меняю вопрос?</p></Dialog>
      <Dialog
        actions={<Button onClick={() => { setExhaustedDialogOpen(false); onGameChange(switchGameToManual(game)) }}>Продолжить</Button>}
        onClose={() => { setExhaustedDialogOpen(false); onGameChange(switchGameToManual(game)) }}
        open={exhaustedDialogOpen}
        title="Упс.."
      ><p>База вопросов подошла к концу. Дальше игра переходит в ручной режим.</p></Dialog>
      <Dialog
        actions={<Button onClick={onExit}>Начать заново</Button>}
        onClose={onExit}
        open={game.players.length === 1}
        title="Конец игры"
      ><p>Кажется, у тебя кончились друзья. Начнем заново?</p></Dialog>
      {notice.state !== 'hidden' && (
        <div className="game-notice" data-state={notice.state} role="status">{notice.message}</div>
      )}
    </FocusRegion>
  )
}

function GameCard({ ariaHidden = false, className, colors, firstControlRef, game, manualType, onChooseType }: {
  readonly ariaHidden?: boolean
  readonly className?: string
  readonly colors: ReadonlyMap<string, string>
  readonly firstControlRef?: Ref<HTMLButtonElement>
  readonly game: ActiveGameState
  readonly manualType: CardType | null
  readonly onChooseType?: (type: CardType) => void
}) {
  const player = getCurrentPlayer(game)
  const turn = game.currentTurn
  const card = turn ? gameData.cards.find((item) => item.id === turn.cardId) : undefined
  const pack = card ? gameData.packs.find((item) => item.id === card.packId) : undefined
  const selectedType = turn?.type ?? manualType ?? game.selectedType
  const choosing = !turn && manualType === null && game.selectedType === null
  const noCard = game.mode === 'automatic' && game.selectedType !== null && turn === null

  return (
    <section className={`game-card${className ? ` ${className}` : ''}`} aria-hidden={ariaHidden || undefined}>
      <h2 style={{ color: colors.get(player.id) }}>{player.name}</h2>
      {choosing ? (
        <div className="game-choice">
          <Button
            ref={firstControlRef}
            disabled={!canChooseType(game, 'truth')}
            onClick={() => onChooseType?.('truth')}
            tabIndex={ariaHidden ? -1 : undefined}
            variant="truth"
          >Правда</Button>
          {canChooseType(game, 'truth') ? <strong>или</strong> : <strong>Ты уже выбирал две правды.</strong>}
          <Button onClick={() => onChooseType?.('dare')} tabIndex={ariaHidden ? -1 : undefined} variant="dare">Действие</Button>
        </div>
      ) : noCard ? (
        <p className="game-card__message">Карточки не нашлось</p>
      ) : (
        <>
          <p className={`game-card__type game-card__type--${selectedType}`}>
            {selectedType === 'truth' ? 'Правда' : 'Действие'}
          </p>
          <div className="game-card__text">
            <p className="game-card__copy">
              {turn ? renderResolvedText(card?.text, turn, game, colors) : manualPrompt(player)}
            </p>
          </div>
          <p className="game-card__pack">{turn ? pack?.name : 'Стол'}</p>
        </>
      )}
    </section>
  )
}

function GameAction({ disabled = false, label, name, onClick, ref }: {
  readonly disabled?: boolean
  readonly label: string
  readonly name: Parameters<typeof ActionIcon>[0]['name']
  readonly onClick?: () => void
  readonly ref?: Ref<HTMLButtonElement>
}) {
  return <IconButton className="game-action" disabled={disabled} icon={<ActionIcon name={name} />} label={label} onClick={onClick} ref={ref} />
}

function packTheme(name?: string) {
  if (name === 'Спайси') return 'spicy'
  if (name === 'Горячий') return 'hot'
  if (name === 'Нижний мир') return 'underworld'
  return 'default'
}

function manualPrompt(player: ActiveGameState['players'][number]) {
  const relationship = player.inRelationship ? ' в отношениях' : ''
  return <>Стол задает. Не забудьте, что игрок{relationship} выбрал грань «{BOUNDARY_DATA_NAMES[player.boundary]}».</>
}

function ExitIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 29.56 30">
      <defs><linearGradient id="game-exit-gradient" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#ff0004"/><stop offset="1" stopColor="#faa8a9"/></linearGradient></defs>
      <path d="M18.75 0C19.79 0 20.63.84 20.63 1.88v7.5a1.88 1.88 0 0 1-3.75 0V3.75H3.75v22.5h13.13v-5.63a1.88 1.88 0 0 1 3.75 0v7.5c0 1.04-.84 1.88-1.88 1.88H1.88A1.88 1.88 0 0 1 0 28.13V1.88C0 .84.84 0 1.88 0h16.87Zm5.17 8.45c.5.04.95.28 1.27.66l3.65 4.38c.95.8.96 1.95.26 2.71l-3.91 4.69a1.88 1.88 0 0 1-2.88-2.4l1.34-1.61H13.13a1.88 1.88 0 0 1 0-3.75h10.52l-1.34-1.62a1.88 1.88 0 0 1 1.61-3.06Z" fill="url(#game-exit-gradient)"/>
    </svg>
  )
}

function renderResolvedText(
  source: string | undefined,
  turn: CurrentTurn,
  game: ActiveGameState,
  colors: ReadonlyMap<string, string>,
) {
  if (!source) return turn.resolvedText
  const parts: ReactNode[] = []
  const pattern = /\*(PLAYER(\d*)|PHONE_NUM)\*/g
  let cursor = 0
  for (const match of source.matchAll(pattern)) {
    const offset = match.index
    if (offset > cursor) parts.push(source.slice(cursor, offset))
    if (match[1] === 'PHONE_NUM') {
      parts.push(turn.phoneNumber)
    } else {
      const participantIndex = match[2] === '' ? 0 : Number(match[2]) - 1
      const id = turn.secondaryPlayerIds[participantIndex]
      const participant = game.players.find((player) => player.id === id)
      parts.push(<mark key={`${offset}-${id}`} style={{ color: colors.get(id) }}>{participant?.name}</mark>)
    }
    cursor = offset + match[0].length
  }
  parts.push(source.slice(cursor))
  return parts
}
