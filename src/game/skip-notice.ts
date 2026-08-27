import type { ActiveGamePlayer, SkipReason } from './game-state'

export function getSkipNotice(
  player: ActiveGamePlayer,
  reason: SkipReason,
  enabled: boolean,
  nextCount: number,
): string | null {
  if (!enabled) return null
  if (nextCount >= 3) {
    return reason === 'absence'
      ? `Игрок «${player.name}» удалён из игры, потому что слишком долго отсутствует за столом.`
      : `Игрок «${player.name}» удалён из игры, потому что ничего не хочет делать.`
  }
  if (nextCount === 2) {
    return reason === 'absence'
      ? 'Если игрока не будет за столом ещё раз — он выйдет из игры.'
      : 'Если игрок снова откажется — он больше не будет играть.'
  }
  return null
}
