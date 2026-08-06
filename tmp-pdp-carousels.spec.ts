/**
 * Smoke: PDP commercial carousels + recently viewed (frontend-only).
 * Run: pnpm dlx playwright@1.49.0 test tmp-pdp-carousels.spec.ts --reporter=line
 */
import { chromium, expect, test } from "playwright/test"

const BASE = process.env.EM_WEB_BASE ?? "http://localhost:3000"

test.describe.configure({ timeout: 180_000 })

test("PDP shows reusable carousels and last-viewed after second product", async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const pageErrors: string[] = []
  page.on("pageerror", (e) => pageErrors.push(String(e)))

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 90_000 })
  const firstProduct = page.locator('a[href^="/product/"]').first()
  await expect(firstProduct).toBeVisible({ timeout: 60_000 })
  const firstHref = await firstProduct.getAttribute("href")
  expect(firstHref).toBeTruthy()

  await page.goto(`${BASE}${firstHref}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  })
  await expect(page).toHaveURL(/\/product\//, { timeout: 30_000 })

  await expect(page.getByRole("heading", { name: "Vergelijkbare producten" })).toBeVisible({
    timeout: 45_000,
  })
  await expect(
    page.getByText("Vergelijk vergelijkbare Europese producten.")
  ).toBeVisible()
  await expect(page.getByRole("heading", { name: "Vaak samen gekocht" })).toBeVisible()
  await expect(
    page.getByText("Klanten combineren deze producten regelmatig.")
  ).toBeVisible()
  await expect(page.getByRole("heading", { name: "Anderen bekeken ook" })).toBeVisible()
  await expect(
    page.getByText("Populaire alternatieven die bezoekers bekeken.")
  ).toBeVisible()

  // Fresh context: no prior views → Laatst bekeken hidden
  await expect(page.getByRole("heading", { name: "Laatst bekeken" })).toHaveCount(0)

  const similarRegion = page.getByRole("region", { name: "Vergelijkbare producten" })
  await expect(similarRegion).toBeVisible()
  const cardLinks = similarRegion.locator('a[href^="/product/"]')
  await expect(cardLinks.first()).toBeVisible({ timeout: 20_000 })
  expect(await cardLinks.count()).toBeGreaterThan(0)

  const scrollbarHidden = await similarRegion.evaluate((el) => {
    const style = getComputedStyle(el)
    return (
      style.scrollbarWidth === "none" ||
      (style as CSSStyleDeclaration & { msOverflowStyle?: string }).msOverflowStyle ===
        "none"
    )
  })
  expect(scrollbarHidden).toBeTruthy()

  const secondHref = await cardLinks.nth(0).getAttribute("href")
  expect(secondHref).toBeTruthy()
  await page.goto(`${BASE}${secondHref}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  })

  await expect(page.getByRole("heading", { name: "Laatst bekeken" })).toBeVisible({
    timeout: 45_000,
  })

  await expect(
    page.getByRole("button", { name: "Volgende producten" }).first()
  ).toBeAttached({ timeout: 15_000 })

  await expect(
    page.locator('button[aria-label*="favorieten"]').first()
  ).toBeAttached({ timeout: 15_000 })

  const realErrors = pageErrors.filter(
    (e) => !e.includes("Hydration failed") && !e.includes("hydration")
  )
  expect(realErrors).toEqual([])
  await browser.close()
})
