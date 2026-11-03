import { defineConfig, devices } from "@playwright/test";

// Reference screenshots are only generated and compared in CI; local runs write to their own folder.
export default defineConfig({
  testDir: "./test",
  outputDir: "./test/test-results",
  snapshotPathTemplate: process.env.CI
    ? "test/snapshots/{projectName}/{arg}{ext}"
    : "test/snapshots/local/{projectName}/{arg}{ext}",
  reporter: [
    ["html", { open: process.env.CI || process.argv.includes("--update-snapshots") ? "never" : "on-failure", outputFolder: "test/playwright-report" }],
  ],
  use: {
    baseURL: "http://localhost:5180",
    viewport: { width: 1024, height: 768 },
    screenshot: "on",
  },
  // Zoom is only compensated for in Blink, so tests tagged @blink only run in chromium.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } } },
    { name: "firefox", use: { ...devices["Desktop Firefox"], viewport: { width: 1024, height: 768 } }, grepInvert: /@blink/ },
    { name: "webkit", use: { ...devices["Desktop Safari"], viewport: { width: 1024, height: 768 } }, grepInvert: /@blink/ },
  ],
  webServer: {
    command: "pnpm exec vite --config test/vite.config.js",
    url: "http://localhost:5180/grid.html",
    reuseExistingServer: !process.env.CI,
  },
});
