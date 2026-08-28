import { expect, test } from "@playwright/test";

/**
 * E2E smoke suite (spec §31.2). Requires a running stack; see
 * playwright.config.ts. Skipped entirely when no access code is provided.
 */

const ACCESS_CODE = process.env.E2E_ACCESS_CODE;

test.skip(!ACCESS_CODE, "E2E_ACCESS_CODE not set — start the dev stack first");

async function unlock(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.fill("#access-code", ACCESS_CODE!);
  await page.click("button[type=submit]");
  await page.waitForSelector("text=What should the reading explore?");
}

test("unauthorized root shows the gate, wrong code shows generic copy", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("PRIVATE ACCESS")).toBeVisible();
  await page.fill("#access-code", "definitely-wrong");
  await page.click("button[type=submit]");
  await expect(
    page.getByText("That access code doesn’t open this space."),
  ).toBeVisible();
  // No application content leaked behind the gate.
  await expect(page.getByText("Prepare a reading")).toHaveCount(0);
});

test("a complete reading with zero birth information", async ({ page }) => {
  await unlock(page);
  await page.click("text=General");
  await page.fill("#situation", "I keep starting projects and abandoning them halfway.");
  await page.click('button:has-text("Draw the cards")');
  await page.waitForSelector(".reading-title", { timeout: 30_000 });
  // The optional note aims the reading and is echoed in the prose (ADR 0011).
  await expect(page.locator(".prose-reading")).toContainText(
    "abandoning them halfway",
  );
  // Cards revealed with names; prose present; no chat box anywhere.
  await expect(page.locator(".card-caption strong").first()).toBeVisible();
  await expect(page.locator(".prose-reading p").first()).toBeVisible();
  await expect(page.locator("textarea")).toHaveCount(0);
  const bodyText = await page.textContent("body");
  for (const banned of ["API", "token", "quota", "OpenAI", "HTTP 4", "budget"]) {
    expect(bodyText).not.toContain(banned);
  }
});

test("transparency layer opens and closes without persistence", async ({ page }) => {
  await unlock(page);
  await page.click("text=Timing & Cycles");
  await page.click('button:has-text("Draw the cards")');
  await page.waitForSelector(".reading-title", { timeout: 30_000 });
  await page.click('button:has-text("What shaped this reading")');
  const dialog = page.locator("dialog[open]");
  await expect(dialog.locator(".eyebrow").first()).toBeVisible();
  await expect(dialog.getByText("The cards")).toBeVisible();
  await page.click('dialog button:has-text("Close")');
});

test("encrypted share: create, open in a fresh browser through the gate, decrypt locally", async ({ page, browser }) => {
  await unlock(page);
  await page.click("text=General");
  await page.click('button:has-text("Draw the cards")');
  await page.waitForSelector(".reading-title", { timeout: 30_000 });
  await page.click('button:has-text("Create private share link")');
  await page.click('dialog button:has-text("Create private link")');
  const url = await page.inputValue("#share-url");
  expect(url).toContain("/r/");
  expect(url).toContain("#");

  // Fresh, unauthorized browser context: gate first, then local decrypt.
  const fresh = await browser.newContext();
  const freshPage = await fresh.newPage();
  await freshPage.goto(url);
  await expect(freshPage.getByText("PRIVATE ACCESS")).toBeVisible();
  await freshPage.fill("#access-code", ACCESS_CODE!);
  await freshPage.click("button[type=submit]");
  await freshPage.waitForSelector("text=A shared reading", { timeout: 20_000 });
  await expect(freshPage.locator(".prose-reading p").first()).toBeVisible();
  await expect(
    freshPage.getByText("Personal details used to create this reading"),
  ).toBeVisible();
  await fresh.close();
});

test("refresh closes the active reading gracefully", async ({ page }) => {
  await unlock(page);
  await page.click("text=General");
  await page.click('button:has-text("Draw the cards")');
  await page.waitForSelector(".reading-title", { timeout: 30_000 });
  await page.reload();
  await expect(page.getByText("This reading has closed.")).toBeVisible();
});

test("renders at a 320px viewport", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 720 } });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByText("PRIVATE ACCESS")).toBeVisible();
  // No horizontal overflow.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await context.close();
});
