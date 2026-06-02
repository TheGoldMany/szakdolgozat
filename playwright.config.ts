import { defineConfig, devices } from "@playwright/test";
import path from "path";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export const ADMIN_FILE = path.join(__dirname, "e2e/.auth/admin.json");
export const USER_FILE  = path.join(__dirname, "e2e/.auth/user.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // 1. Auth state felépítése (setup)
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // 2. Vendég tesztek (nincs bejelentkezve)
    {
      name: "guest",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /auth\.setup\.ts/,
    },
    // 3. Admin tesztek (bejelentkezve mint admin)
    {
      name: "admin",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ADMIN_FILE,
      },
      dependencies: ["setup"],
      testMatch: /dashboard\..*/,
    },
  ],
  // Next.js dev szerver automatikus indítása a tesztek előtt
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
