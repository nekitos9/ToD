import ExcelJS, {
  type Cell,
  type Workbook,
  type Worksheet,
} from 'exceljs'
import type {
  BoundaryDefinition,
  CardType,
  CardTypeDefinition,
  GameCard,
  GameData,
  PackDefinition,
} from '../../src/data/game-data.ts'

const EXPECTED_SHEETS = ['Вопросы', 'Паки', 'Грани', 'Действия'] as const

const REQUIRED_COLUMNS = {
  Вопросы: [
    'id',
    'Вопрос',
    'ПД',
    'Пак',
    'Грань',
    'Отношения',
    'Другие игроки',
  ],
  Паки: ['Паки', 'Суть'],
  Грани: ['Грани', 'Ур', 'Описание'],
  Действия: ['Действие', 'Описание'],
} as const

const CARD_TYPE_IDS: Readonly<Record<string, CardType>> = {
  Правда: 'truth',
  Действие: 'dare',
}

interface ValidationIssue {
  readonly sheet: string
  readonly cell?: string
  readonly cardId?: string
  readonly reason: string
}

interface ImportContext {
  readonly workbook: Workbook
  readonly issues: ValidationIssue[]
}

interface SheetTable {
  readonly sheet: Worksheet
  readonly columns: ReadonlyMap<string, number>
}

export class XlsxValidationError extends Error {
  readonly issues: readonly ValidationIssue[]

  constructor(issues: readonly ValidationIssue[]) {
    super(formatValidationIssues(issues))
    this.name = 'XlsxValidationError'
    this.issues = issues
  }
}

export async function importGameData(
  filePath: string,
  source = 'docs/Паки и вопросы.xlsx',
): Promise<GameData> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)
  return importGameDataFromWorkbook(workbook, source)
}

export function importGameDataFromWorkbook(
  workbook: Workbook,
  source = 'workbook.xlsx',
): GameData {
  const context: ImportContext = { workbook, issues: [] }
  const tables = new Map<string, SheetTable>()

  for (const sheetName of EXPECTED_SHEETS) {
    const sheet = workbook.getWorksheet(sheetName)
    if (!sheet) {
      addIssue(context, sheetName, `отсутствует обязательный лист «${sheetName}»`)
      continue
    }

    const table = readHeader(context, sheet, REQUIRED_COLUMNS[sheetName])
    if (table) {
      tables.set(sheetName, table)
    }
  }

  if (context.issues.length > 0) {
    throw new XlsxValidationError(context.issues)
  }

  const cardTypes = readCardTypes(context, requireTable(tables, 'Действия'))
  const boundaries = readBoundaries(context, requireTable(tables, 'Грани'))
  const packs = readPacks(context, requireTable(tables, 'Паки'))
  const cards = readCards(
    context,
    requireTable(tables, 'Вопросы'),
    cardTypes,
    boundaries,
    packs,
  )

  if (context.issues.length > 0) {
    throw new XlsxValidationError(context.issues)
  }

  const normalizedPacks = addPackStatistics(packs, cards, cardTypes)

  return {
    source,
    cards,
    packs: normalizedPacks,
    boundaries,
    cardTypes,
    summary: {
      cardCount: cards.length,
      packCount: normalizedPacks.length,
      boundaryCount: boundaries.length,
      cardTypeCount: cardTypes.length,
    },
  }
}

function readHeader(
  context: ImportContext,
  sheet: Worksheet,
  requiredColumns: readonly string[],
): SheetTable | undefined {
  const columns = new Map<string, number>()
  const headerRow = sheet.getRow(1)

  for (let column = 1; column <= Math.max(headerRow.cellCount, 1); column += 1) {
    const cell = headerRow.getCell(column)
    if (cell.isMerged && cell.master.address !== cell.address) continue
    const value = readScalar(context, sheet, cell)
    const header = normalizeText(value)
    if (!header) continue

    if (columns.has(header)) {
      addIssue(context, sheet.name, `повторяющаяся колонка «${header}»`, cell.address)
    } else {
      columns.set(header, column)
    }
  }

  for (const requiredColumn of requiredColumns) {
    if (!columns.has(requiredColumn)) {
      addIssue(
        context,
        sheet.name,
        `отсутствует обязательная колонка «${requiredColumn}»`,
        '1:1',
      )
    }
  }

  return context.issues.some((issue) => issue.sheet === sheet.name)
    ? undefined
    : { sheet, columns }
}

function readCardTypes(
  context: ImportContext,
  table: SheetTable,
): CardTypeDefinition[] {
  const result: CardTypeDefinition[] = []
  const names = new Set<string>()

  forEachDataRow(context, table, ['Действие', 'Описание'], (rowNumber, values) => {
    const name = requiredText(context, table, rowNumber, 'Действие', values)
    const description = requiredText(context, table, rowNumber, 'Описание', values)
    if (!name || !description) return

    const type = CARD_TYPE_IDS[name]
    if (!type) {
      addCellIssue(context, table, rowNumber, 'Действие', `неизвестный тип карточки «${name}»`)
      return
    }
    if (names.has(name)) {
      addCellIssue(context, table, rowNumber, 'Действие', `тип карточки «${name}» указан повторно`)
      return
    }

    names.add(name)
    result.push({ type, name, description })
  })

  for (const expectedName of Object.keys(CARD_TYPE_IDS)) {
    if (!names.has(expectedName)) {
      addIssue(context, table.sheet.name, `отсутствует допустимый тип карточки «${expectedName}»`)
    }
  }

  return result
}

function readBoundaries(
  context: ImportContext,
  table: SheetTable,
): BoundaryDefinition[] {
  const result: BoundaryDefinition[] = []
  const names = new Set<string>()
  const levels = new Set<number>()

  forEachDataRow(context, table, ['Грани', 'Ур', 'Описание'], (rowNumber, values) => {
    const name = requiredText(context, table, rowNumber, 'Грани', values)
    const description = requiredText(context, table, rowNumber, 'Описание', values)
    const level = requiredInteger(context, table, rowNumber, 'Ур', values, false)
    if (!name || !description || level === undefined) return

    if (names.has(name)) {
      addCellIssue(context, table, rowNumber, 'Грани', `грань «${name}» указана повторно`)
      return
    }
    if (levels.has(level)) {
      addCellIssue(context, table, rowNumber, 'Ур', `уровень грани ${level} указан повторно`)
      return
    }

    names.add(name)
    levels.add(level)
    result.push({ name, level, description })
  })

  return result.sort((left, right) => left.level - right.level)
}

function readPacks(context: ImportContext, table: SheetTable): PackDefinition[] {
  const result: PackDefinition[] = []
  const names = new Set<string>()

  forEachDataRow(context, table, ['Паки', 'Суть'], (rowNumber, values) => {
    const name = requiredText(context, table, rowNumber, 'Паки', values)
    const description = requiredText(context, table, rowNumber, 'Суть', values)
    if (!name || !description) return

    if (names.has(name)) {
      addCellIssue(context, table, rowNumber, 'Паки', `пак «${name}» указан повторно`)
      return
    }

    names.add(name)
    result.push({ id: `pack-${rowNumber}`, name, description, cardCount: 0, availableTypes: [] })
  })

  return result
}

function readCards(
  context: ImportContext,
  table: SheetTable,
  cardTypes: readonly CardTypeDefinition[],
  boundaries: readonly BoundaryDefinition[],
  packs: readonly PackDefinition[],
): GameCard[] {
  const result: GameCard[] = []
  const ids = new Set<string>()
  const cardTypeByName = new Map(cardTypes.map((definition) => [definition.name, definition.type]))
  const boundaryNames = new Set(boundaries.map((boundary) => boundary.name))
  const packByName = new Map(packs.map((pack) => [pack.name, pack]))
  const columns = REQUIRED_COLUMNS.Вопросы

  forEachDataRow(context, table, columns, (rowNumber, values) => {
    const id = requiredId(context, table, rowNumber, values)
    const text = requiredText(context, table, rowNumber, 'Вопрос', values, id)
    const typeName = requiredText(context, table, rowNumber, 'ПД', values, id)
    const pack = requiredText(context, table, rowNumber, 'Пак', values, id)
    const boundary = requiredText(context, table, rowNumber, 'Грань', values, id)
    const relationship = requiredText(context, table, rowNumber, 'Отношения', values, id)
    const otherPlayers = requiredInteger(
      context,
      table,
      rowNumber,
      'Другие игроки',
      values,
      true,
      id,
    )

    if (id) {
      if (ids.has(id)) {
        addCellIssue(context, table, rowNumber, 'id', `id «${id}» указан повторно`, id)
      } else {
        ids.add(id)
      }
    }

    const type = typeName ? cardTypeByName.get(typeName) : undefined
    if (typeName && !type) {
      addCellIssue(context, table, rowNumber, 'ПД', `недопустимый тип карточки «${typeName}»`, id)
    }
    if (pack && !packByName.has(pack)) {
      addCellIssue(context, table, rowNumber, 'Пак', `пак «${pack}» не существует`, id)
    }
    if (boundary && !boundaryNames.has(boundary)) {
      addCellIssue(context, table, rowNumber, 'Грань', `грань «${boundary}» не существует`, id)
    }
    if (relationship && relationship !== 'Да' && relationship !== 'Нет') {
      addCellIssue(
        context,
        table,
        rowNumber,
        'Отношения',
        `ожидалось «Да» или «Нет», получено «${relationship}»`,
        id,
      )
    }
    if (text && otherPlayers !== undefined) {
      validateTokens(context, table, rowNumber, text, otherPlayers, id)
    }

    if (
      id &&
      text &&
      type &&
      pack &&
      packByName.has(pack) &&
      boundary &&
      boundaryNames.has(boundary) &&
      (relationship === 'Да' || relationship === 'Нет') &&
      otherPlayers !== undefined
    ) {
      result.push({
        id,
        text,
        type,
        pack,
        packId: packByName.get(pack)!.id,
        boundary,
        relationshipAllowed: relationship === 'Да',
        otherPlayers,
      })
    }
  })

  return result
}

function addPackStatistics(
  packs: readonly PackDefinition[],
  cards: readonly GameCard[],
  cardTypes: readonly CardTypeDefinition[],
): PackDefinition[] {
  return packs.map((pack) => {
    const packCards = cards.filter((card) => card.pack === pack.name)
    const availableTypes = cardTypes
      .map((definition) => definition.type)
      .filter((type) => packCards.some((card) => card.type === type))

    return {
      ...pack,
      cardCount: packCards.length,
      availableTypes,
    }
  })
}

function forEachDataRow(
  context: ImportContext,
  table: SheetTable,
  relevantColumns: readonly string[],
  callback: (rowNumber: number, values: ReadonlyMap<string, unknown>) => void,
): void {
  for (let rowNumber = 2; rowNumber <= table.sheet.rowCount; rowNumber += 1) {
    const values = new Map<string, unknown>()
    let hasValue = false

    for (const columnName of relevantColumns) {
      const column = table.columns.get(columnName)
      if (!column) continue
      const value = readScalar(context, table.sheet, table.sheet.getCell(rowNumber, column))
      values.set(columnName, value)
      if (normalizeText(value) !== '') hasValue = true
    }

    if (hasValue) callback(rowNumber, values)
  }
}

function requiredId(
  context: ImportContext,
  table: SheetTable,
  rowNumber: number,
  values: ReadonlyMap<string, unknown>,
): string | undefined {
  const value = values.get('id')
  if (typeof value !== 'string' && typeof value !== 'number') {
    addCellIssue(context, table, rowNumber, 'id', 'id карточки должен быть строкой или числом')
    return undefined
  }

  const id = String(value).trim()
  if (!id) {
    addCellIssue(context, table, rowNumber, 'id', 'id карточки не может быть пустым')
    return undefined
  }
  return id
}

function requiredText(
  context: ImportContext,
  table: SheetTable,
  rowNumber: number,
  columnName: string,
  values: ReadonlyMap<string, unknown>,
  cardId?: string,
): string | undefined {
  const text = normalizeText(values.get(columnName))
  if (!text) {
    addCellIssue(context, table, rowNumber, columnName, 'значение не может быть пустым', cardId)
    return undefined
  }
  return text
}

function requiredInteger(
  context: ImportContext,
  table: SheetTable,
  rowNumber: number,
  columnName: string,
  values: ReadonlyMap<string, unknown>,
  nonNegative: boolean,
  cardId?: string,
): number | undefined {
  const value = values.get(columnName)
  const normalizedValue = normalizeText(value)
  const number = typeof value === 'number' ? value : Number(normalizeText(value))
  const constraint = nonNegative ? 'целым неотрицательным числом' : 'целым числом'

  if (
    normalizedValue === '' ||
    !Number.isInteger(number) ||
    (nonNegative && number < 0)
  ) {
    addCellIssue(
      context,
      table,
      rowNumber,
      columnName,
      `значение должно быть ${constraint}`,
      cardId,
    )
    return undefined
  }
  return number
}

function validateTokens(
  context: ImportContext,
  table: SheetTable,
  rowNumber: number,
  text: string,
  otherPlayers: number,
  cardId?: string,
): void {
  const rawTokens = [...text.matchAll(/\*([^*]+)\*/g)].map((match) => match[1].trim())
  const playerIndexes = new Set<number>()

  for (const token of rawTokens) {
    if (token === 'PHONE_NUM') continue

    const playerMatch = /^PLAYER([2-9][0-9]*)?$/.exec(token)
    if (!playerMatch) {
      addCellIssue(context, table, rowNumber, 'Вопрос', `неизвестный токен «*${token}*»`, cardId)
      continue
    }

    playerIndexes.add(playerMatch[1] ? Number(playerMatch[1]) : 1)
  }

  const actual = [...playerIndexes].sort((left, right) => left - right)
  const expected = Array.from({ length: otherPlayers }, (_, index) => index + 1)
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    const actualLabel = actual.length > 0 ? actual.join(', ') : 'нет'
    const expectedLabel = expected.length > 0 ? expected.join(', ') : 'нет'
    addCellIssue(
      context,
      table,
      rowNumber,
      'Вопрос',
      `токены игроков не соответствуют полю «Другие игроки»: ожидались ${expectedLabel}, найдены ${actualLabel}`,
      cardId,
    )
  }
}

function readScalar(
  context: ImportContext,
  sheet: Worksheet,
  cell: Cell,
  visited = new Set<string>(),
): unknown {
  const value = cell.value
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (value instanceof Date) return value.toISOString()
  if ('richText' in value) return value.richText.map((part) => part.text).join('')
  if ('hyperlink' in value) return value.text

  if ('formula' in value || 'sharedFormula' in value) {
    const formula = 'formula' in value ? value.formula : undefined
    if (!formula) {
      addIssue(context, sheet.name, 'shared formula без развёрнутой прямой ссылки не поддерживается', cell.address)
      return undefined
    }
    return resolveDirectReference(context, sheet, cell, formula, visited)
  }

  addIssue(context, sheet.name, 'неподдерживаемый тип значения ячейки', cell.address)
  return undefined
}

function resolveDirectReference(
  context: ImportContext,
  sourceSheet: Worksheet,
  sourceCell: Cell,
  formula: string,
  visited: Set<string>,
): unknown {
  const directReference = /^=?(?:'((?:[^']|'')+)'|([^'!]+))!\$?([A-Z]{1,3})\$?([1-9][0-9]*)$/i.exec(
    formula.trim(),
  )
  if (!directReference) {
    addIssue(
      context,
      sourceSheet.name,
      `формула «${formula}» не поддерживается; разрешены только прямые ссылки на одну ячейку`,
      sourceCell.address,
    )
    return undefined
  }

  const targetSheetName = (directReference[1] ?? directReference[2]).replaceAll("''", "'").trim()
  const targetAddress = `${directReference[3].toUpperCase()}${directReference[4]}`
  const targetSheet = context.workbook.getWorksheet(targetSheetName)
  if (!targetSheet) {
    addIssue(
      context,
      sourceSheet.name,
      `формула ссылается на отсутствующий лист «${targetSheetName}»`,
      sourceCell.address,
    )
    return undefined
  }

  const referenceKey = `${targetSheetName}!${targetAddress}`
  if (visited.has(referenceKey)) {
    addIssue(context, sourceSheet.name, `обнаружена циклическая ссылка через ${referenceKey}`, sourceCell.address)
    return undefined
  }

  const nextVisited = new Set(visited)
  nextVisited.add(referenceKey)
  return readScalar(context, targetSheet, targetSheet.getCell(targetAddress), nextVisited)
}

function normalizeText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim()
  }
  return ''
}

function addCellIssue(
  context: ImportContext,
  table: SheetTable,
  rowNumber: number,
  columnName: string,
  reason: string,
  cardId?: string,
): void {
  const column = table.columns.get(columnName)
  const cell = column ? table.sheet.getCell(rowNumber, column).address : undefined
  addIssue(context, table.sheet.name, reason, cell, cardId)
}

function addIssue(
  context: ImportContext,
  sheet: string,
  reason: string,
  cell?: string,
  cardId?: string,
): void {
  context.issues.push({ sheet, cell, cardId, reason })
}

function requireTable(tables: ReadonlyMap<string, SheetTable>, name: string): SheetTable {
  const table = tables.get(name)
  if (!table) throw new Error(`Internal error: table ${name} was not initialized`)
  return table
}

function formatValidationIssues(issues: readonly ValidationIssue[]): string {
  const lines = issues.map((issue) => {
    const location = issue.cell ? `${issue.sheet}!${issue.cell}` : issue.sheet
    const id = issue.cardId ? `, id=${issue.cardId}` : ''
    return `- [${location}${id}] ${issue.reason}`
  })
  return `Импорт XLSX завершился с ошибками (${issues.length}):\n${lines.join('\n')}`
}

export function serializeGameData(gameData: GameData): string {
  const serialized = JSON.stringify(gameData, null, 2)
  return `// Generated from docs/Паки и вопросы.xlsx. Do not edit manually.\nimport type { GameData } from '../data/game-data'\n\nexport const gameData = ${serialized} as const satisfies GameData\n`
}

export { ExcelJS }
