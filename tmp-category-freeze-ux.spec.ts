/**
 * Sprint 3B.5 — category UX polish smoke (presentation only).
 */
import { chromium, expect, test } from "playwright/test"

const BASE = process.env.EM_WEB_BASE ?? "http://localhost:3000"

test.describe.configure({ timeout: 180_000 })

test("category premium UX polish v5 smoke", async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const pageErrors: string[] = []
  page.on("pageerror", (e) => pageErrors.push(String(e)))

  const seed = await page.request.post(`${BASE}/api/ai-content`, {
    data: { action: "seed", slugs: ["elektronica"] },
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
  await expect(page.locator("[data-block='product-insights']")).toBeVisible()
  await expect(page.locator("[data-editorial-kind='importance']")).toBeVisible()
  await expect(page.locator("[data-editorial-kind='topic_visual']")).toBeVisible()
  await expect(page.locator("[data-topic-visual='icon']").first()).toBeVisible()
  await expect(page.locator("[data-topic-icon='cpu'], [data-topic-icon='memory'], [data-topic-icon='display'], [data-topic-icon='battery'], [data-topic-icon='generic']").first()).toBeVisible()

  await expect(page.locator("[data-ai-content-block='discovery']")).toBeVisible()
  await expect(page.locator("[data-discovery-rail]").first()).toBeVisible()

  await page.setViewportSize({ width: 834, height: 900 })
  await expect(page.locator("[data-ai-content-block='buy-guide']")).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(
    page.getByRole("heading", { level: 2, name: "Koopgids" })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { level: 2, name: "Bekijk ook" })
  ).toBeVisible()

  const realErrors = pageErrors.filter(
    (e) => !e.includes("Hydration failed") && !e.includes("hydration")
  )
  expect(realErrors).toEqual([])
  await browser.close()
})
