import { test as setup, expect } from "@playwright/test";
import path from "path";

// A bejelentkezési állapotot elmenti, hogy a többi teszt újra felhasználhassa
// Futtatás: npx playwright test auth.setup.ts
export const ADMIN_FILE    = path.join(__dirname, ".auth/admin.json");
export const USER_FILE     = path.join(__dirname, ".auth/user.json");

setup("admin auth state mentése", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByRole("textbox", { name: /e-?mail/i }).fill("admin@menhely.hu");
  await page.locator('input[type="password"]').fill("Admin1234!");
  await page.getByRole("button", { name: /bejelentkezés/i }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  await page.context().storageState({ path: ADMIN_FILE });
});

setup("user auth state mentése", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByRole("textbox", { name: /e-?mail/i }).fill("user1@example.com");
  await page.locator('input[type="password"]').fill("User1234!");
  await page.getByRole("button", { name: /bejelentkezés/i }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  await page.context().storageState({ path: USER_FILE });
});
