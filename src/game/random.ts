export interface RandomSource {
  next(): number
}

export const mathRandomSource: RandomSource = {
  next: () => Math.random(),
}

export function nextRandom(random: RandomSource): number {
  const value = random.next()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError(`RandomSource вернул значение вне диапазона [0, 1): ${value}`)
  }
  return value
}

export function shuffle<T>(values: readonly T[], random: RandomSource): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(nextRandom(random) * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}
