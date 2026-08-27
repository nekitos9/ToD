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
    await completePlayers(page)
    await expect(page.getByRole('heading', { name: 'Паки вопросов' })).toBeVisible()
    await assertNoHorizontalOverflow(page)
    await assertPackCardsDoNotOverlap(page)
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

test('keeps focus trapped and restores it for setup and game dialogs', async ({ page }) => {
  await openPlayers(page)
  const help = page.getByRole('button', { name: 'Открыть справку о настройках игроков' })
  await help.focus()
  await page.keyboard.press('Enter')
  const helpDialog = page.getByRole('dialog', { name: 'Грани и «Отношения»' })
  await expect(helpDialog.getByRole('button', { name: 'Закрыть справку' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(help).toBeFocused()

  await completePlayers(page)
  await page.getByRole('checkbox', { name: 'Обычный' }).check({ force: true })
  await page.getByRole('button', { name: 'Далее' }).click()
  const exit = page.getByRole('button', { name: 'Выход' })
  await exit.focus()
  await page.keyboard.press('Enter')
  const exitDialog = page.getByRole('dialog', { name: 'Конец?' })
  await expect(exitDialog.getByRole('button', { name: 'Да' })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(exitDialog.getByRole('button', { name: 'Нет' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(exit).toBeFocused()
})

test('enters Packs and selects a pack without mouse or Tab', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.type('Первый')
  await page.keyboard.press('ArrowDown')
  await chooseFirstSelectOption(page)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.type('Второй')
  await page.keyboard.press('ArrowDown')
  await chooseFirstSelectOption(page)

  const playersNext = page.getByRole('button', { name: 'Далее' })
  for (let step = 0; step < 8 && !(await playersNext.evaluate((element) => element === document.activeElement)); step += 1) {
    await page.keyboard.press('ArrowDown')
  }
  await expect(playersNext).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Паки вопросов' })).toBeVisible()

  await page.keyboard.press('ArrowDown')
  const ordinary = page.getByRole('checkbox', { name: 'Обычный' })
  await expect(ordinary).toBeFocused()
  await page.keyboard.press('Space')
  await expect(ordinary).toBeChecked()
  await expect(page.getByRole('button', { name: 'Далее' })).toBeEnabled()
})

test('moves predictably through the three-column pack grid and skips disabled packs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  await openPacks(page)
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('checkbox', { name: 'Обычный' })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('checkbox', { name: 'Личное-публичное' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('checkbox', { name: 'Нижний мир' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('checkbox', { name: 'Другие люди' })).toBeFocused()
  await page.keyboard.press('Space')
  await expect(page.getByRole('checkbox', { name: 'Другие люди' })).toBeChecked()

  await page.getByRole('button', { name: 'Назад' }).click()
  for (const boundary of await page.getByRole('combobox', { name: 'Грань игрока' }).all()) await boundary.selectOption('virgin')
  for (const relationship of await page.getByRole('checkbox', { name: 'Отношения' }).all()) await relationship.check()
  await page.getByRole('button', { name: 'Далее' }).click()
  await expect(page.getByRole('checkbox', { name: 'Горячий' })).toBeDisabled()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('checkbox', { name: 'Обычный' })).toBeFocused()
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

test('keeps BottomNavigation as the final logical row with many players', async ({ page }) => {
  await page.setViewportSize({ width: 424, height: 917 })
  await openPlayers(page)
  const add = page.getByRole('button', { name: 'Добавить игрока' })
  for (let index = 0; index < 6; index += 1) await add.click()
  for (const [index, input] of (await page.getByRole('textbox', { name: 'Имя игрока' }).all()).entries()) {
    await input.fill(`Игрок ${index + 1}`)
  }
  const back = page.getByRole('button', { name: 'Назад' })
  const next = page.getByRole('button', { name: 'Далее' })
  await back.focus()
  await page.keyboard.press('ArrowRight')
  await expect(next).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(back).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(page.getByRole('switch')).toBeFocused()
})

test('scrolls focused player controls clear of fixed navigation', async ({ page }) => {
  await page.setViewportSize({ width: 424, height: 917 })
  await openPlayers(page)
  const add = page.getByRole('button', { name: 'Добавить игрока' })
  for (let index = 0; index < 6; index += 1) await add.click()
  await page.getByRole('button', { name: 'Назад' }).focus()
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await expect.poll(async () => page.evaluate(() => {
    const focused = document.activeElement as HTMLElement | null
    const navigation = document.querySelector('.bottom-navigation')
    if (!focused || !navigation) return false
    return focused.getBoundingClientRect().bottom <= navigation.getBoundingClientRect().top - 12
  })).toBe(true)
})

test('reveals the full focused bottom pack card above navigation', async ({ page }) => {
  await page.setViewportSize({ width: 424, height: 917 })
  await openPacks(page)
  await page.keyboard.press('ArrowDown')
  for (let index = 0; index < 7; index += 1) await page.keyboard.press('ArrowDown')
  await expect.poll(async () => page.evaluate(() => {
    const input = document.activeElement as HTMLInputElement | null
    const card = input?.closest('.pack-card')
    const navigation = document.querySelector('.bottom-navigation')
    if (!card || !navigation) return false
    return card.getBoundingClientRect().bottom <= navigation.getBoundingClientRect().top - 12
  })).toBe(true)
})

test('completes an automatic game turn using only the keyboard on the game screen', async ({ page }) => {
  await startGame(page)
  const truth = page.getByRole('button', { name: 'Правда' })
  await expect(truth).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Готово' })).toBeEnabled()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('button', { name: 'Готово' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Игрок 2' })).toBeVisible()
})

test('skips a generated card with a keyboard-only reason dialog flow', async ({ page }) => {
  await startGame(page)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(280)
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('button', { name: 'Готово' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('button', { name: 'Пропуск' })).toBeFocused()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Пропуск?' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Он так захотел' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('.game-card--skip')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Игрок 2' })).toBeVisible()
})

test('replaces an allowed generated card using only the keyboard on the game screen', async ({ page }) => {
  await startGame(page, 'Другие люди')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(280)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  const replacement = page.getByRole('button', { name: 'Перезадать' })
  await expect(replacement).toBeEnabled()
  await expect(replacement).toBeFocused()
  const activeCopy = page.locator('.game-card:not([aria-hidden]) .game-card__copy')
  const textBefore = await activeCopy.textContent()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Замена' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Нет' })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(dialog.getByRole('button', { name: 'Да' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog).not.toBeVisible()
  await expect.poll(() => activeCopy.textContent()).not.toBe(textBefore)
  await expect(page.getByRole('heading', { name: 'Игрок 1' })).toBeVisible()
})

test('uses reduced motion for game-card completion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await startGame(page)
  await page.getByRole('button', { name: 'Действие' }).click()
  await page.getByRole('button', { name: 'Готово' }).click()
  await expect(page.getByRole('heading', { name: 'Игрок 2' })).toBeVisible()
})

test('reduces manual deal and setup content animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openPlayers(page)
  const setupAnimation = await page.locator('.players').evaluate((element) => getComputedStyle(element).animationName)
  expect(setupAnimation).toBe('none')
  await completePlayers(page)
  await page.getByRole('checkbox', { name: 'Обычный' }).check({ force: true })
  await page.getByRole('button', { name: 'Назад' }).click()
  await page.getByRole('switch').click()
  await page.getByRole('button', { name: 'Далее' }).click()
  await page.getByRole('button', { name: 'Далее' }).click()
  await page.getByRole('button', { name: 'Действие' }).click()
  const duration = await page.locator('.game-card').evaluate((card) => {
    card.classList.add('game-card--deal')
    return getComputedStyle(card).animationDuration
  })
  expect(['0s', '0.02s']).toContain(duration)
  await page.getByRole('button', { name: 'Выдать' }).click()
  await expect(page.getByRole('button', { name: 'Готово' })).toBeEnabled()
})

for (const viewport of [
  { width: 320, height: 480 },
  { width: 424, height: 917 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 1024 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
]) {
  test(`game layout has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await startGame(page)
    await assertNoHorizontalOverflow(page)
    const exit = page.getByRole('button', { name: 'Выход' })
    await expect(exit).toBeVisible()
    expect(await exit.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight
    })).toBe(true)
  })
}

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

async function assertPackCardsDoNotOverlap(page: Page) {
  const descriptionsFit = await page.locator('.pack-card__description').evaluateAll((elements) =>
    elements.every((element) => element.scrollHeight <= element.clientHeight),
  )
  expect(descriptionsFit).toBe(true)
  const cards = await page.locator('.pack-card').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect()
    return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top }
  }))
  for (let left = 0; left < cards.length; left += 1) {
    for (let right = left + 1; right < cards.length; right += 1) {
      const a = cards[left]
      const b = cards[right]
      expect(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top).toBe(true)
    }
  }
}

async function openPlayers(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Начать' }).click()
  await page.getByRole('button', { name: 'Далее' }).click()
  await expect(page.getByRole('heading', { name: 'Игроки' })).toBeVisible()
}

async function completePlayers(page: Page, boundary = 'full') {
  const names = page.getByRole('textbox', { name: 'Имя игрока' })
  const boundaries = page.getByRole('combobox', { name: 'Грань игрока' })
  for (let index = 0; index < await names.count(); index += 1) {
    await names.nth(index).fill(`Игрок ${index + 1}`)
    await boundaries.nth(index).selectOption(boundary)
  }
  await page.getByRole('button', { name: 'Далее' }).click()
}

async function openPacks(page: Page) {
  await openPlayers(page)
  await completePlayers(page)
  await expect(page.getByRole('heading', { name: 'Паки вопросов' })).toBeVisible()
}

async function startGame(page: Page, pack = 'Обычный') {
  await openPacks(page)
  await page.getByRole('checkbox', { name: pack }).check({ force: true })
  await page.getByRole('button', { name: 'Далее' }).click()
  await expect(page.getByRole('heading', { name: 'Игрок 1' })).toBeVisible()
}

async function chooseFirstSelectOption(page: Page) {
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
}
