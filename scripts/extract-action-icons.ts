import { readFile, writeFile } from 'node:fs/promises'

const SOURCE = new URL('../design-reference/assets/vector-assets.json', import.meta.url)
const TARGET = new URL('../src/components/action-icon-data.generated.ts', import.meta.url)

const icons = {
  complete: 'e5bb0c60bab35fba',
  skip: '30f6cee613ef4138',
  reroll: '28e4bc3c255fa39b',
  question: 'c118e162d75e8370',
  questionSmall: '57f6713464de01c4',
} as const

interface VectorAsset {
  asset: {
    height: number
    vectorPaths: Array<{ data: string }>
    width: number
  }
}

const source = JSON.parse(await readFile(SOURCE, 'utf8')) as Record<string, VectorAsset>
const extracted = Object.fromEntries(
  Object.entries(icons).map(([name, hash]) => {
    const asset = source[hash]?.asset
    if (!asset || asset.vectorPaths.length !== 1) {
      throw new Error(`Cannot extract Figma vector ${hash} (${name})`)
    }

    return [name, { height: asset.height, path: asset.vectorPaths[0].data, width: asset.width }]
  }),
)

const output = `// Generated from design-reference/assets/vector-assets.json. Do not edit manually.\nexport const actionIconData = ${JSON.stringify(extracted, null, 2)} as const\n`
await writeFile(TARGET, output)
