/**
 * Freeze-candidate smoke: editorial buy guide + discovery rails.
 */
import { chromium, expect, test } from "playwright/test"

const BASE = process.env.EM_WEB_BASE ?? "http://localhost:3000"

test.describe.configure({ timeout: 180_000 })

test("category freeze polish v4 smoke", async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const pageErrors: string[] = []
  page.on("pageerror", (e) => pageErrors.push(String(e)))

  const seed = await page.request.post(`${BASE}/api/ai-content`, {
    data: { action: "seed", slugs: ["elektronica", "mode", "tuin"] },
  })
  expect(seed.ok()).toBeTruthy()

  const docRes = await page.request.get(
    `${BASE}/api/ai-content/category/elektronica`
  )
  const doc = (await docRes.json()).document
  expect(doc.promptVersion).toBe("category-content-v4")
  expect(doc.payload.editorialBlocks.length).toBeGreaterThanOrEqual(8)
  expect(doc.payload.discoveryRails.length).toBeGreaterThanOrEqual(3)
  expect(doc.payload.productCloudInsights.length).toBeGreaterThanOrEqual(3)
  expect(doc.payload.topicVisuals.length).toBeGreaterThanOrEqual(2)

  await page.goto(`${BASE}/categorie/elektronica`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  })

  await expect(
    page.getByRole("heading", { level: 1, name: /Elektronica/i })
  ).toBeVisible({ timeout: 60_000 })

  await expect(page.locator("[data-ai-content-block='buy-guide']")).toBeVisible()
  await expect(page.locator("[data-editorial-kind='importance']")).toBeVisible()
  await expect(page.locator("[data-editorial-kind='topic_visual']")).toBeVisible()
  await expect(page.locator("[data-editorial-kind='expert_tip']")).toBeVisible()
  await expect(page.getByText("Productinzichten")).toBeVisible()

  await expect(page.locator("[data-ai-content-block='discovery']")).toBeVisible()
  await expect(page.locator("[data-discovery-rail]").first()).toBeVisible()
  await expect(page.getByText("Populaire merken")).toBeVisible()

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
