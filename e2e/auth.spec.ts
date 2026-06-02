import { test, expect } from "@playwright/test";

// Seed adatokból ismert teszt fiókok
const ADMIN    = { email: "admin@menhely.hu",  password: "Admin1234!" };
const REG_USER = { email: "user1@example.com", password: "User1234!" };

test.describe("Bejelentkezés", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
  });

  test("a bejelentkező oldal betölt", async ({ page }) => {
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /bejelentkezés/i })).toBeVisible();
  });

  test("hibás jelszóval hibaüzenet jelenik meg", async ({ page }) => {
    await page.getByRole("textbox", { name: /e-?mail/i }).fill(REG_USER.email);
    await page.locator('input[type="password"]').fill("rossz_jelszo");
    await page.getByRole("button", { name: /bejelentkezés/i }).click();

    // NextAuth invalid credentials → hibaüzenet
    await expect(
      page.getByText(/érvénytelen|hibás|helytelen|invalid/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("érvényes adatokkal bejelentkezés sikeres", async ({ page }) => {
    await page.getByRole("textbox", { name: /e-?mail/i }).fill(REG_USER.email);
    await page.locator('input[type="password"]').fill(REG_USER.password);
    await page.getByRole("button", { name: /bejelentkezés/i }).click();

    // Sikeres bejelentkezés → főoldalra vagy dashboard-ra irányít
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  });

  test("superadmin bejelentkezés és dashboard elérés", async ({ page }) => {
    await page.getByRole("textbox", { name: /e-?mail/i }).fill(ADMIN.email);
    await page.locator('input[type="password"]').fill(ADMIN.password);
    await page.getByRole("button", { name: /bejelentkezés/i }).click();

    // Admin dashboard elérhető
    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  });

  test("a 'Regisztráció' link a regisztrációs oldalra navigál", async ({ page }) => {
    await page.getByRole("link", { name: /regisztráció/i }).click();
    await expect(page).toHaveURL(/\/auth\/register/);
  });
});

test.describe("Regisztráció", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/register");
  });

  test("a regisztrációs oldal betölt", async ({ page }) => {
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /regisztráció/i })).toBeVisible();
  });

  test("rövid jelszóval validációs hiba jelenik meg", async ({ page }) => {
    await page.getByRole("textbox", { name: /e-?mail/i }).fill("tesztx@example.com");
    await page.locator('input[type="password"]').first().fill("abc");
    await page.getByRole("button", { name: /regisztráció/i }).click();

    await expect(
      page.getByText(/jelszó|password|karakter/i)
    ).toBeVisible({ timeout: 3000 });
  });

  test("meglévő e-mail-lel hibát ad", async ({ page }) => {
    await page.getByRole("textbox", { name: /e-?mail/i }).fill(REG_USER.email);
    const pwInputs = page.locator('input[type="password"]');
    await pwInputs.nth(0).fill(REG_USER.password);
    await pwInputs.nth(1).fill(REG_USER.password);
    await page.getByRole("button", { name: /regisztráció/i }).click();

    await expect(
      page.getByText(/már|foglalt|regisztrált|exists/i)
    ).toBeVisible({ timeout: 5000 });
  });
});
