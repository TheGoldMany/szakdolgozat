import { test, expect } from "@playwright/test";

// Ez a teszt az 'admin' projektben fut (storageState: ADMIN_FILE)
// Ehhez előbb le kell futtatni: npx playwright test --project=setup

test.describe("Dashboard (bejelentkezett admin)", () => {
  test("a dashboard főoldal betölt", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page.locator("h1, h2, nav").first()).toBeVisible();
  });

  test("az állatok oldal elérhető", async ({ page }) => {
    await page.goto("/dashboard/animals");
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("az örökbefogadási kérelmek oldala elérhető", async ({ page }) => {
    await page.goto("/dashboard/applications");
    await expect(page).not.toHaveURL(/\/auth\/login/);
  });

  test("a kampányok oldal elérhető", async ({ page }) => {
    await page.goto("/dashboard/campaigns");
    await expect(page).not.toHaveURL(/\/auth\/login/);
  });

  test("az admin/menhelyek oldal betölt (SUPER_ADMIN)", async ({ page }) => {
    await page.goto("/dashboard/admin/shelters");
    // SUPER_ADMIN hatáskör – nem irányít vissza
    await expect(page).not.toHaveURL(/\/auth\/login/);
  });
});
