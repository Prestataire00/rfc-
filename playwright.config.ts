import { defineConfig, devices } from "@playwright/test";

/**
 * Configuration Playwright pour tests E2E RFC.
 *
 * Convention :
 *   - Tests dans tests/e2e/**.spec.ts
 *   - Serveur dev démarré automatiquement (npm run dev) si pas déjà UP
 *   - Chromium uniquement par défaut — multi-browser uniquement en CI nightly
 *   - Captures + traces sur échec pour debug
 *
 * Variables d'env reconnues :
 *   - PLAYWRIGHT_BASE_URL : override de la baseURL (defaults http://localhost:3000)
 *   - CI : active retry + serial + browser supplémentaires
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    ...(process.env.CI
      ? [
          {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
          },
          {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
          },
        ]
      : []),
  ],

  // En local : démarre `npm run dev` automatiquement avant les tests.
  // En CI : on suppose que le déploiement preview est passé via PLAYWRIGHT_BASE_URL.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
