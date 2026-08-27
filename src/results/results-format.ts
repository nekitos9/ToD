import type { ActiveGamePlayer } from '../game/game-state'

export interface FormattedResult {
  readonly activity: string
  readonly main: string
  readonly refusals: string
}

export function formatResult(player: ActiveGamePlayer): FormattedResult {
  let main = `выполнил ${player.completedDares} действий и ответил ${player.answeredTruths} правд`
  if (player.absenceSkips > 0) main += `, а также пропустил ${player.absenceSkips} раундов`
  let refusals = ''
  if (player.refusedTruths > 0 || player.refusedDares > 0) {
    refusals = `${player.absenceSkips > 0 ? ' и' : ', а также'} отказался от ${player.refusedTruths} правд и ${player.refusedDares} действий`
  }
  const activity = player.activityPoints > 0
    ? `. А ещё ты помог выполнить задание ${player.activityPoints} раз другим игрокам`
    : ''
  return { activity, main, refusals }
}
