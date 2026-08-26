import { expect, test, type Page } from '@playwright/test'

const viewports = [
  { width: 320, height: 480 },
  { width: 424, height: 917 },
  { width: 768, height: 1024 },
  { width: 1280, height: 640 },
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
  })
}

test('completes the two-screen flow using only arrows, Enter and Space', async ({ page }) => {
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
  await expect(back).toBeFocused()
  await expect(page.getByRole('button', { name: 'Далее' })).toBeDisabled()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Правда или Действие' })).toBeVisible()

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('checkbox', { name: /От заданий нельзя отказываться/ })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: /У пользователя есть право пропустить/ })).not.toBeChecked()
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
