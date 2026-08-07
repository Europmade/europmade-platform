/**
 * Smoke: Final premium category polish — buy guide accordion + discovery cards.
 */
import { chromium, expect, test } from "playwright/test"

const BASE = process.env.EM_WEB_BASE ?? "http://localhost:3000"

test.describe.configure({ timeout: 180_000 })

test("category premium polish v3 smoke", async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const pageErrors: string[] = []
  page.on("pageerror", (e) => pageErrors.push(String(e)))

  const seed = await page.request.post(`${BASE}/api/ai-content`, {
    data: { action: "seed", slugs: ["elektronica"] },
  })
  expect(seed.ok()).toBeTruthy()

  const docRes = await page.request.get(
    `${BASE}/api/ai-content/category/elektronica`
  )
  const docJson = await docRes.json()
  expect(docJson.document.promptVersion).toBe("category-content-v3")
  expect(docJson.document.payload.buyGuideSections.length).toBeGreaterThanOrEqual(4)
  expect(docJson.document.payload.discoveryCards.length).toBeGreaterThanOrEqual(4)
  expect(docJson.document.payload.drawbacks.length).toBeGreaterThan(0)

  await page.goto(`${BASE}/categorie/elektronica`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  })

  await expect(page.getByRole("heading", { level: 1, name: /Elektronica/i })).toBeVisible({
    timeout: 60_000,
  })

  await expect(page.locator("[data-ai-content-block='buy-guide']")).toBeVisible()
  await expect(page.locator("[data-ai-content-block='discovery']")).toBeVisible()
  await expect(page.getByText("Bekijk ook")).toBeVisible()

  const guideBtn = page
    .locator("[data-ai-content-block='buy-guide']")
    .getByRole("button")
    .first()
  await expect(guideBtn).toHaveAttribute("aria-expanded", "false")
  await guideBtn.click()
  await expect(guideBtn).toHaveAttribute("aria-expanded", "true")
  await expect(page.getByText("Koopadvies").first()).toBeVisible()
  await expect(page.getByText("Checklist").first()).toBeVisible()

  // No pill-style see-also row (discovery uses cards)
  await expect(
    page.locator("[data-ai-content-block='discovery'] a").first()
  ).toBeVisible()

  const faqBtn = page
    .locator("section")
    .filter({ hasText: "Veelgestelde vragen" })
    .getByRole("button")
    .first()
  await expect(faqBtn).toHaveAttribute("aria-expanded", "false")
  await faqBtn.click()
  await expect(faqBtn).toHaveAttribute("aria-expanded", "true")

  await page.setViewportSize({ width: 834, height: 900 })
  await expect(page.locator("[data-ai-content-block='discovery']")).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByText("Koopgids")).toBeVisible()

  const realErrors = pageErrors.filter(
    (e) => !e.includes("Hydration failed") && !e.includes("hydration")
  )
  expect(realErrors).toEqual([])
  await browser.close()
})
