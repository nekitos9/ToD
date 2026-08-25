import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  importGameData,
  serializeGameData,
  XlsxValidationError,
} from './xlsx/importer.ts'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = resolve(repositoryRoot, 'docs/Паки и вопросы.xlsx')
const outputPath = resolve(repositoryRoot, 'src/generated/game-data.ts')

async function main(): Promise<void> {
  const gameData = await importGameData(sourcePath)
  const content = serializeGameData(gameData)

  await mkdir(dirname(outputPath), { recursive: true })
  const currentContent = await readFile(outputPath, 'utf8').catch(() => undefined)
  if (currentContent !== content) {
    const temporaryPath = `${outputPath}.tmp`
    await writeFile(temporaryPath, content, 'utf8')
    await rename(temporaryPath, outputPath)
  }

  console.log(
    `XLSX импортирован: ${gameData.summary.cardCount} карточки, ` +
      `${gameData.summary.packCount} паков, ` +
      `${gameData.summary.boundaryCount} грани, ` +
      `${gameData.summary.cardTypeCount} типа.`,
  )
}

main().catch((error: unknown) => {
  if (error instanceof XlsxValidationError) {
    console.error(error.message)
  } else {
    console.error('Не удалось импортировать XLSX:', error)
  }
  process.exitCode = 1
})

