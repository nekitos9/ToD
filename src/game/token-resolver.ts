import type { ActiveGamePlayer } from './game-state'
import { nextRandom, type RandomSource } from './random'

export interface ResolvedCardText {
  readonly phoneNumber: string | null
  readonly text: string
}

export function resolveCardTokens(
  text: string,
  participants: readonly ActiveGamePlayer[],
  random: RandomSource,
): ResolvedCardText {
  const phoneNumber = text.includes('*PHONE_NUM*') ? generatePhoneNumber(random) : null
  const resolved = text.replace(/\*(PLAYER(\d*)|PHONE_NUM)\*/g, (token, name: string, suffix: string) => {
    if (name === 'PHONE_NUM') return phoneNumber!
    const index = suffix === '' ? 0 : Number(suffix) - 1
    const participant = participants[index]
    if (participant === undefined) throw new Error(`Не найден участник для токена ${token}`)
    return participant.name
  })
  return { phoneNumber, text: resolved }
}

export function generatePhoneNumber(random: RandomSource): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(nextRandom(random) * 10))
  return `+7 (9${digits[0]}${digits[1]}) ${digits[2]}${digits[3]}${digits[4]}-${digits[5]}${digits[6]}-${digits[7]}${digits[8]}`
}
