import type { ActiveGamePlayer } from './game-state'
import { nextRandom, type RandomSource } from './random'

export interface ResolvedCardText {
  readonly phoneNumber: string | null
  readonly segments: readonly ResolvedTextSegment[]
  readonly text: string
}

export type ResolvedTextSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'player'; readonly playerId: string; readonly text: string }

export function resolveCardTokens(
  text: string,
  participants: readonly ActiveGamePlayer[],
  random: RandomSource,
): ResolvedCardText {
  const phoneNumber = text.includes('*PHONE_NUM*') ? generatePhoneNumber(random) : null
  const segments: ResolvedTextSegment[] = []
  const pattern = /\*(PLAYER(\d*)|PHONE_NUM)\*/g
  let cursor = 0
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) segments.push({ kind: 'text', text: text.slice(cursor, match.index) })
    if (match[1] === 'PHONE_NUM') {
      segments.push({ kind: 'text', text: phoneNumber! })
      cursor = match.index + match[0].length
      continue
    }
    const suffix = match[2]
    const index = suffix === '' ? 0 : Number(suffix) - 1
    const participant = participants[index]
    if (participant === undefined) throw new Error(`Не найден участник для токена ${match[0]}`)
    segments.push({ kind: 'player', playerId: participant.id, text: participant.name })
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) segments.push({ kind: 'text', text: text.slice(cursor) })
  return { phoneNumber, segments, text: segments.map((segment) => segment.text).join('') }
}

export function generatePhoneNumber(random: RandomSource): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(nextRandom(random) * 10))
  return `+7 (9${digits[0]}${digits[1]}) ${digits[2]}${digits[3]}${digits[4]}-${digits[5]}${digits[6]}-${digits[7]}${digits[8]}`
}
