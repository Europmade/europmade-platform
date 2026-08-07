/**
 * Smoke: Premium category page polish — desktop / tablet / mobile.
 */
import { chromium, expect, test } from "playwright/test"

const BASE = process.env.EM_WEB_BASE ?? "http://localhost:3002"

test.describe.configure({ timeout: 180_000 })

test("category page polish smoke", async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const pageErrors: string[] = []
  page.on("pageerror", (e) => pageErrors.push(String(e)))

  await page.goto(`${BASE}/categorie/elektronica`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  })

  await expect(
    page.getByRole("heading", { level: 1, name: /Elektronica/i })
  ).toBeVisible({ timeout: 60_000 })

  // Category-specific filters (not robot-vacuum facets)
  await expect(page.getByText("Merk", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("Producttype")).toBeVisible()
  await expect(page.getByText("Draadloos")).toBeVisible()
  await expect(page.getByText("Zuigkracht")).toHaveCount(0)

  // Verified filter deferred for MVP
  await expect(page.getByText("Alleen Verified™ producten")).toHaveCount(0)
  await expect(
    page.locator("aside[data-verified-filter='deferred']")
  ).toBeVisible()

  // Productieland select
  await expect(page.getByLabel("Productieland")).toBeVisible()
  await expect(page.locator("#category-production-country")).toBeVisible()

  // Results copy
  await expect(page.getByText(/producten gevonden/i).first()).toBeVisible()

  // Banner + related cards
  await expect(page.locator("[data-ad-position='1']")).toBeVisible()
  await expect(page.getByText("Gerelateerde categorieën")).toBeVisible()
  await expect(
    page.locator("[data-related-image-source='seller-first-photo-ready']").first()
  ).toBeVisible()

  // FAQ accordion closed by default
  await expect(page.getByText("Veelgestelde vragen")).toBeVisible()
  const faqBtn = page.getByRole("button", { name: /Verified™/i }).first()
  await expect(faqBtn).toHaveAttribute("aria-expanded", "false")
  await faqBtn.click()
  await expect(faqBtn).toHaveAttribute("aria-expanded", "true")

  // Desktop sidebar
  await expect(page.locator("aside[data-filter-architecture='cms-ai']")).toBeVisible()

  await page.setViewportSize({ width: 834, height: 900 })
  await expect(
    page.getByRole("heading", { level: 1, name: /Elektronica/i })
  ).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole("button", { name: /Filters/i })).toBeVisible()

  const realErrors = pageErrors.filter(
    (e) => !e.includes("Hydration failed") && !e.includes("hydration")
  )
  expect(realErrors).toEqual([])
  await browser.close()
})
