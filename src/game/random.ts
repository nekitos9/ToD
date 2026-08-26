export interface RandomSource {
  next(): number
}

export const mathRandomSource: RandomSource = {
  next: () => Math.random(),
}

export function shuffle<T>(values: readonly T[], random: RandomSource): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random.next() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}
