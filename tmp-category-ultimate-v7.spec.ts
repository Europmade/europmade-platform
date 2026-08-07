/**
 * Sprint 3B.7 — ultimate interactive buying guide smoke.
 */
import { chromium, expect, test } from "playwright/test"

const BASE = process.env.EM_WEB_BASE ?? "http://localhost:3000"

test.describe.configure({ timeout: 180_000 })

test("category ultimate interactive guide v7 smoke", async () => {
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

  // Top lists near results
  await expect(page.locator("[data-block='top-lists']")).toBeVisible()
  await expect(page.locator("[data-toplist='best']")).toBeVisible()
  await page.locator("[data-toplist='value']").click()
  await expect(page.locator("[data-block='top3-picks']")).toBeVisible({
    timeout: 10_000,
  })

  // Interactive guide
  await expect(page.locator("[data-ultimate-guide='v7']")).toBeVisible()
  await expect(page.locator("[data-block='buying-questions']")).toBeVisible()
  await page.locator("[data-question='q_ram']").click()
  await expect(page.getByText(/16 GB/i).first()).toBeVisible()
  await expect(page.locator("[data-attr-panel='attr_ram']")).toBeVisible()

  await expect(page.locator("[data-persona='student']")).toBeVisible()
  await page.locator("[data-persona='student']").click()
  await expect(page.locator("[data-block='top3-picks']")).toBeVisible()

  // Toggle attribute closed then open again
  await page.locator("[data-attr='attr_cpu']").click()
  await expect(page.locator("[data-attr-panel='attr_cpu']")).toBeVisible()

  await expect(page.locator("[data-block='when-not']")).toBeVisible()
  await expect(page.locator("[data-block='save-money']")).toBeVisible()
  await expect(page.locator("[data-block='lifespan']")).toBeVisible()
  await expect(page.locator("[data-block='comparison-use']")).toBeVisible()
  await expect(page.locator("[data-editorial-kind='expert_tip']")).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator("[data-block='top-lists']")).toBeVisible()

  const realErrors = pageErrors.filter(
    (e) => !e.includes("Hydration failed") && !e.includes("hydration")
  )
  expect(realErrors).toEqual([])
  await browser.close()
})
