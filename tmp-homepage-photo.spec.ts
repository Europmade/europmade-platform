/**
 * Smoke: Homepage photoreal product polish — no regressions.
 */
import { chromium, expect, test } from "playwright/test"

const BASE = process.env.EM_WEB_BASE ?? "http://localhost:3002"

test.describe.configure({ timeout: 180_000 })

test("homepage photoreal placeholders smoke", async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const pageErrors: string[] = []
  page.on("pageerror", (e) => pageErrors.push(String(e)))

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120_000 })

  await expect(
    page.getByRole("heading", {
      name: "De grootste marketplace voor Europese producten.",
    })
  ).toBeVisible({ timeout: 60_000 })

  // Photoreal PNG placeholders (not SVG cartoons)
  const coffee = page.locator('img[src*="/placeholders/products/coffee.png"]').first()
  await expect(coffee).toBeVisible()
  await expect(
    page.locator('img[src*="/placeholders/products/"]').first()
  ).toBeVisible()

  // No cartoon SVG product assets on homepage
  await expect(page.locator('img[src*="/placeholders/products/"][src$=".svg"]')).toHaveCount(0)

  await expect(page.getByRole("heading", { name: "Populaire categorieën" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Acties & thema’s" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Shop nu" }).first()).toBeVisible()

  const ad1 = page.locator("[data-ad-position='1']")
  await expect(ad1).toBeVisible()
  await expect(ad1.locator('img[src*="/placeholders/products/"]').first()).toBeVisible()

  await page.setViewportSize({ width: 834, height: 900 })
  await expect(
    page.getByRole("heading", {
      name: "De grootste marketplace voor Europese producten.",
    })
  ).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole("heading", { name: "Acties & thema’s" })).toBeVisible()

  const realErrors = pageErrors.filter(
    (e) => !e.includes("Hydration failed") && !e.includes("hydration")
  )
  expect(realErrors).toEqual([])
  await browser.close()
})
