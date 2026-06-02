import { test, expect } from "@playwright/test";

test.describe("Főoldal", () => {
  test("a főoldal betöltődik és tartalmazza a hero szekciót", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/menhely|allat/i);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("a navigációban megjelenik a Bejelentkezés gomb", async ({ page }) => {
    await page.goto("/");
    const loginLink = page.getByRole("link", { name: /bejelentkezés/i });
    await expect(loginLink).toBeVisible();
  });

  test("az 'Állatok' navigációs link az állatok oldalra mutat", async ({ page }) => {
    await page.goto("/");
    const animalsLink = page.getByRole("link", { name: /állatok/i }).first();
    await animalsLink.click();
    await expect(page).toHaveURL(/\/animals/);
    await expect(page.locator("h1")).toContainText(/állat/i);
  });

  test("a Menhelyek oldal betölt és listát jelenít meg", async ({ page }) => {
    await page.goto("/shelters");
    await expect(page.locator("h1")).toContainText(/Menhelyek/i);
  });

  test("az Állatok oldal betölt és kereső megjelenik", async ({ page }) => {
    await page.goto("/animals");
    await expect(page.locator("h1")).toContainText(/Állatok/i);
    const searchInput = page.getByPlaceholder(/keresés/i);
    await expect(searchInput).toBeVisible();
  });

  test("a Támogatás oldal betölt", async ({ page }) => {
    await page.goto("/donate");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });
});
