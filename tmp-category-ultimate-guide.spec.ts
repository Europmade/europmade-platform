/**
 * Sprint 3B.6 — ultimate buying guide smoke.
 */
import { chromium, expect, test } from "playwright/test"

const BASE = process.env.EM_WEB_BASE ?? "http://localhost:3000"

test.describe.configure({ timeout: 180_000 })

test("category ultimate buying guide smoke", async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const pageErrors: string[] = []
  page.on("pageerror", (e) => pageErrors.push(String(e)))

  const seed = await page.request.post(`${BASE}/api/ai-content`, {
    data: { action: "seed", slugs: ["elektronica", "tuin"] },
  })
  expect(seed.ok()).toBeTruthy()

  await page.goto(`${BASE}/categorie/elektronica`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  })

  await expect(
    page.getByRole("heading", { level: 1, name: /Elektronica/i })
  ).toBeVisible({ timeout: 60_000 })

  await expect(page.locator("[data-ai-content-block='buy-guide']")).toBeVisible()
  await expect(page.locator("[data-guide-family='electronics']")).toBeVisible()
  await expect(page.getByText("Welk product past bij mij?")).toBeVisible()
  await expect(page.locator("[data-persona='daily']")).toBeVisible()
  await expect(page.locator("[data-editorial-kind='expert_tip']")).toBeVisible()
  await expect(
    page.locator("[data-editorial-kind='common_mistakes']")
  ).toBeVisible()
  await expect(page.locator("[data-editorial-kind='topic_visual']")).toBeVisible()
  await expect(page.locator("[data-topic-visual='icon']").first()).toBeVisible()

  // Removed decision-criteria importance board
  await expect(page.locator("[data-editorial-kind='importance']")).toHaveCount(0)
  await expect(page.getByText("Vergelijk deze categorie")).toHaveCount(0)

  await expect(page.locator("[data-discovery-rail='related_categories'], [data-discovery-rail='popular_brands']").first()).toBeVisible()
  await expect(page.getByText("Welke laptop past bij mij?")).toBeVisible()

  await page.setViewportSize({ width: 834, height: 900 })
  await expect(page.locator("[data-persona='student']")).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(
    page.getByRole("heading", { level: 2, name: "Koopgids" })
  ).toBeVisible()

  await page.goto(`${BASE}/categorie/tuin`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  })
  await expect(page.locator("[data-guide-family='garden']")).toBeVisible({
    timeout: 60_000,
  })
  await expect(
    page.getByRole("button", { name: "Accu of elektrisch?" })
  ).toBeVisible()

  const realErrors = pageErrors.filter(
    (e) => !e.includes("Hydration failed") && !e.includes("hydration")
  )
  expect(realErrors).toEqual([])
  await browser.close()
})
