/**
 * Smoke: AI Content Engine — seed offline, category page reads CMS only.
 */
import { chromium, expect, test } from "playwright/test"

const BASE = process.env.EM_WEB_BASE ?? "http://localhost:3000"

test.describe.configure({ timeout: 180_000 })

test("AI content engine category smoke", async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const pageErrors: string[] = []
  page.on("pageerror", (e) => pageErrors.push(String(e)))

  // Offline generation via API (never via page load)
  const seed = await page.request.post(`${BASE}/api/ai-content`, {
    data: { action: "seed", slugs: ["elektronica", "tuin"] },
  })
  expect(seed.ok()).toBeTruthy()
  const seedJson = await seed.json()
  expect(seedJson.count).toBeGreaterThanOrEqual(2)

  const docRes = await page.request.get(
    `${BASE}/api/ai-content/category/elektronica`
  )
  expect(docRes.ok()).toBeTruthy()
  const docJson = await docRes.json()
  expect(docJson.document.generationStatus).toBe("ready")
  expect(docJson.document.payload.faq.length).toBeGreaterThanOrEqual(8)
  expect(docJson.document.generatedBy).toBe("offline-analyzer")

  await page.goto(`${BASE}/categorie/elektronica`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  })

  await expect(
    page.getByRole("heading", { level: 1, name: /Elektronica/i })
  ).toBeVisible({ timeout: 60_000 })

  await expect(page.locator("[data-ai-content-block='buy-guide']")).toBeVisible()
  await expect(
    page.locator("[data-ai-content-block='internal-links']")
  ).toBeVisible()
  await expect(page.getByText("Koopgids")).toBeVisible()
  await expect(page.getByText("Veelgestelde vragen")).toBeVisible()

  // At least 8 FAQ accordion buttons
  const faqButtons = page.locator("section").filter({ hasText: "Veelgestelde vragen" }).getByRole("button")
  await expect(faqButtons).toHaveCount(8)

  // Focus topics for electronics (not vacuum-only)
  await expect(page.getByText(/processor|geheugen|scherm|batterij|Bluetooth|USB-C/i).first()).toBeVisible()

  await page.setViewportSize({ width: 834, height: 900 })
  await expect(page.locator("[data-ai-content-block='buy-guide']")).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByText("Koopgids")).toBeVisible()

  const realErrors = pageErrors.filter(
    (e) => !e.includes("Hydration failed") && !e.includes("hydration")
  )
  expect(realErrors).toEqual([])
  await browser.close()
})
