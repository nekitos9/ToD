import { expect, test } from '@playwright/test'

const viewports = [
  { width: 320, height: 480 },
  { width: 424, height: 917 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 1024 },
  { width: 1920, height: 1080 },
]

for (const viewport of viewports) {
  test(`${viewport.width}x${viewport.height} has a stable shell without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Компоненты' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Навигация по экрану' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Далее' })).toBeDisabled()

    const dimensions = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      document: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }))
    expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport)
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport)
  })
}

test('starts arrow focus navigation without mouse or Tab and skips disabled controls', async ({ page }) => {
  await page.goto('/')

  const primary = page.getByRole('button', { name: 'Основная' })
  await expect(primary).not.toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(primary).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('button', { name: 'Правда' })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('button', { name: 'Действие' })).toBeFocused()
})

test('supports the modal lifecycle', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Открыть окно' }).click()
  await expect(page.getByRole('dialog', { name: 'Конец?' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Конец?' })).toBeHidden()
})
