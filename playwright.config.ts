import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  timeout: 90000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    headless: true,
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command:
      "npm run start -- --port " +
      (new URL(process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000")
        .port || "3000"),
    url: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 90000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
