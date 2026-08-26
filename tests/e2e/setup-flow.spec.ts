import { expect, test, type Page } from '@playwright/test'

const viewports = [
  { width: 320, height: 480 },
  { width: 424, height: 917 },
  { width: 768, height: 1024 },
  { width: 900, height: 700 },
  { width: 1024, height: 768 },
  { width: 1100, height: 800 },
  { width: 1280, height: 800 },
  { width: 1300, height: 800 },
  { width: 1440, height: 1024 },
  { width: 1920, height: 1080 },
]

for (const viewport of viewports) {
  test(`${viewport.width}x${viewport.height} keeps setup screens free of horizontal overflow`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Правда или Действие' })).toBeVisible()
    await assertNoHorizontalOverflow(page)
    await page.getByRole('button', { name: 'Начать' }).click()
    await expect(page.getByRole('heading', { name: 'Правила игры' })).toBeVisible()
    await assertNoHorizontalOverflow(page)
    await page.getByRole('button', { name: 'Далее' }).click()
    await expect(page.getByRole('heading', { name: 'Игроки' })).toBeVisible()
    await assertNoHorizontalOverflow(page)
    await assertPlayerCardsDoNotOverlap(page)
  })
}

test('reaches Players and edits its primary controls using only arrows, Enter and Space', async ({ page }) => {
  await page.goto('/')
  const start = page.getByRole('button', { name: 'Начать' })
  await expect(start).not.toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(start).toBeFocused()
  await page.keyboard.press('Enter')

  const refusal = page.getByRole('checkbox', { name: /От заданий нельзя отказываться/ })
  const absence = page.getByRole('checkbox', { name: /У пользователя есть право пропустить/ })
  await expect(refusal).not.toBeChecked()
  await page.keyboard.press('ArrowDown')
  await expect(refusal).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(refusal).toBeChecked()
  await page.keyboard.press('ArrowDown')
  await expect(absence).toBeFocused()
  await page.keyboard.press('Space')
  await expect(absence).toBeChecked()
  await page.keyboard.press('Space')
  await expect(absence).not.toBeChecked()
  await page.keyboard.press('ArrowDown')
  const back = page.getByRole('button', { name: 'Назад' })
  await expect(back).toBeFocused()
  await page.keyboard.press('ArrowRight')
  const rulesNext = page.getByRole('button', { name: 'Далее' })
  await expect(rulesNext).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Игроки' })).toBeVisible()

  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('button', { name: 'Открыть справку о настройках игроков' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  const names = page.getByRole('textbox', { name: 'Имя игрока' })
  await expect(names.nth(0)).toBeFocused()
  await page.keyboard.type('Первый')
  await page.keyboard.press('ArrowDown')
  const boundaries = page.getByRole('combobox', { name: 'Грань игрока' })
  await expect(boundaries.nth(0)).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(boundaries.nth(0)).toHaveValue('virgin')
  await page.keyboard.press('ArrowRight')
  const relationships = page.getByRole('checkbox', { name: 'Отношения' })
  await expect(relationships.nth(0)).toBeFocused()
  await page.keyboard.press('Space')
  await expect(relationships.nth(0)).toBeChecked()
  await expect(relationships.nth(0)).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(boundaries.nth(0)).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(relationships.nth(0)).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(boundaries.nth(1)).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(names.nth(1)).toBeFocused()
  await page.keyboard.type('Второй')
  await page.keyboard.press('ArrowDown')
  await expect(boundaries.nth(1)).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(boundaries.nth(1)).toHaveValue('virgin')
})

test('keeps focus valid when players are added and removed with the keyboard', async ({ page }) => {
  await openPlayers(page)
  const add = page.getByRole('button', { name: 'Добавить игрока' })
  await add.focus()
  await page.keyboard.press('Enter')
  const names = page.getByRole('textbox', { name: 'Имя игрока' })
  await expect(names.nth(2)).toBeFocused()
  await page.keyboard.type('Третий')

  const remove = page.getByRole('button', { name: 'Удалить последнего игрока' })
  await remove.focus()
  await page.keyboard.press('Space')
  await expect(names).toHaveCount(2)
  await expect(names.nth(1)).toBeFocused()
})

test('keeps the player help close button clear of the dialog on a low wide viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 640 })
  await openPlayers(page)
  await page.getByRole('button', { name: 'Открыть справку о настройках игроков' }).click()

  const overlaps = await page.evaluate(() => {
    const surface = document.querySelector('.players-help__surface')?.getBoundingClientRect()
    const close = document.querySelector('.players-help__close')?.getBoundingClientRect()
    if (!surface || !close) return true
    return !(close.bottom <= surface.top || close.top >= surface.bottom || close.right <= surface.left || close.left >= surface.right)
  })
  expect(overlaps).toBe(false)
})

test('scrolls the complete checkbox label above fixed navigation when focused', async ({ page }) => {
  await page.setViewportSize({ width: 424, height: 917 })
  await page.goto('/')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')

  const absence = page.getByRole('checkbox', { name: /У пользователя есть право пропустить/ })
  await expect(absence).toBeFocused()
  await expect.poll(async () => page.evaluate(() => {
    const checkbox = document.querySelector<HTMLInputElement>('input[type="checkbox"]:focus')
    const label = checkbox?.closest('label')
    const navigation = document.querySelector('.bottom-navigation')
    if (!label || !navigation) return false
    return label.getBoundingClientRect().bottom <= navigation.getBoundingClientRect().top
  })).toBe(true)
})

async function assertNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }))
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport)
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport)
}

async function assertPlayerCardsDoNotOverlap(page: Page) {
  const layout = await page.locator('.player-card').evaluateAll((cards) => cards.map((card) => {
    const cardRect = card.getBoundingClientRect()
    const boundaryRect = card.querySelector('.player-card__boundary')?.getBoundingClientRect()
    const relationshipRect = card.querySelector('.relationship-toggle')?.getBoundingClientRect()
    return {
      card: { left: cardRect.left, right: cardRect.right },
      controls: boundaryRect && relationshipRect
        ? { boundaryRight: boundaryRect.right, relationshipLeft: relationshipRect.left }
        : null,
    }
  }))

  for (const item of layout) {
    expect(item.controls).not.toBeNull()
    expect(item.controls?.boundaryRight).toBeLessThanOrEqual(item.controls?.relationshipLeft ?? 0)
  }
  for (let index = 1; index < layout.length; index += 1) {
    const previous = layout[index - 1].card
    const current = layout[index].card
    expect(current.left >= previous.right || current.left === previous.left).toBe(true)
  }
}

async function openPlayers(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Начать' }).click()
  await page.getByRole('button', { name: 'Далее' }).click()
  await expect(page.getByRole('heading', { name: 'Игроки' })).toBeVisible()
}
