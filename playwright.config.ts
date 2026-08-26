import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: '/tmp/truth-or-dare-playwright',
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4173/truth-or-dare/',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/truth-or-dare/',
    reuseExistingServer: true,
  },
})
