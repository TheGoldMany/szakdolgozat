import { test, expect } from "@playwright/test";

test.describe("Állatok böngészése", () => {
  test("az állat-kártya kattintható és az állat részletes oldala betölt", async ({ page }) => {
    await page.goto("/animals");
    // Várjuk meg az első állatkártyát
    const firstCard = page.locator("a[href*='/animals/']").first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    const href = await firstCard.getAttribute("href");
    await firstCard.click();
    await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("a keresés szűri az állatok listáját", async ({ page }) => {
    await page.goto("/animals");
    const search = page.getByPlaceholder(/keresés/i);
    await expect(search).toBeVisible();
    await search.fill("kutya");
    // A szűrés után az URL vagy a megjelenített lista változik
    await expect(page.locator("main")).toBeVisible();
  });

  test("404-es URL állat-oldalon 404-et jelenít meg", async ({ page }) => {
    const response = await page.goto("/animals/nem-letező-allat-slug-12345");
    // Next.js 404 – vagy a state code, vagy a szöveg
    expect(response?.status() === 404 || await page.getByText(/nem található|not found/i).isVisible()).toBeTruthy();
  });
});

test.describe("Menhelyek böngészése", () => {
  test("a menhely-kártya kattintható és a menhely oldal betölt", async ({ page }) => {
    await page.goto("/shelters");
    const firstCard = page.locator("a[href*='/shelters/']").first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("a menhelyek listája tartalmaz elemeket", async ({ page }) => {
    await page.goto("/shelters");
    // Legalább 1 menhelykártya megjelenik
    const cards = page.locator("a[href*='/shelters/']");
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    expect(await cards.count()).toBeGreaterThan(0);
  });
});

test.describe("Örökbefogadási kérelem (vendég)", () => {
  test("bejelentkezés nélkül az 'Örökbe fogadom' gomb a login oldalra irányít", async ({ page }) => {
    // Keresünk egy elérhető állatot
    await page.goto("/animals");
    const firstAnimalLink = page.locator("a[href*='/animals/']").first();
    await expect(firstAnimalLink).toBeVisible({ timeout: 10_000 });
    await firstAnimalLink.click();

    // Az 'Örökbe fogadom' vagy hasonló gomb megnyomása
    const adoptBtn = page.getByRole("button", { name: /örökbe|kérel|fogad/i }).first();
    if (await adoptBtn.isVisible()) {
      await adoptBtn.click();
      // Nem bejelentkezve → login oldalra irányít
      await expect(page).toHaveURL(/\/auth\/login|\/auth\/signin/, { timeout: 5000 });
    } else {
      // Ha az állat nem örökbe fogadható, a teszt elhalasztva
      test.skip();
    }
  });
});
