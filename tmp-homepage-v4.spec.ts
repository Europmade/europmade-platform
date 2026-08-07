/**
 * Smoke: Homepage polish v4 — hero, CMS sections, banners, responsive.
 */
import { chromium, expect, test } from "playwright/test"

const BASE = process.env.EM_WEB_BASE ?? "http://localhost:3000"

test.describe.configure({ timeout: 180_000 })

test("homepage polish v4 smoke", async () => {
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
  await expect(
    page.getByText(
      "Koop rechtstreeks bij Europese producenten én officiële retailers."
    )
  ).toBeVisible()
  await expect(page.getByRole("link", { name: "Bekijk producten" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Word verkoper" })).toBeVisible()
  await expect(page.getByText("Verified™").first()).toBeVisible()

  await expect(page.getByRole("heading", { name: "Populaire categorieën" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Acties & thema’s" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Back to School" })).toBeVisible()

  await expect(
    page.getByRole("heading", { name: "Uitgelicht deze week" })
  ).toBeVisible()
  await expect(page.getByRole("heading", { name: "Nieuw binnen" })).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByRole("heading", { name: "Best verkocht" })).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Waarom kiezen voor EuropMade?" })
  ).toBeVisible()

  const ad1 = page.locator("[data-ad-position='1']")
  await expect(ad1).toBeVisible()
  await expect(ad1.getByText("Advertentie").first()).toBeVisible()
  const ad1Box = await ad1.boundingBox()
  expect(ad1Box?.height).toBeGreaterThanOrEqual(200)

  // Currency selector: Euro only (no PLN) — desktop/tablet switcher with selects
  const localeBar = page
    .locator('div[aria-label="Taal en valuta"]')
    .filter({ has: page.locator("select") })
  await expect(localeBar).toBeVisible()
  const currencyOptions = await localeBar
    .locator("select")
    .nth(1)
    .locator("option")
    .allTextContents()
  expect(currencyOptions.some((txt) => txt.includes("EUR"))).toBeTruthy()
  expect(currencyOptions.some((txt) => txt.includes("PLN"))).toBeFalsy()
  expect(page.getByText("zł")).toHaveCount(0)

  // Tablet
  await page.setViewportSize({ width: 834, height: 900 })
  await expect(
    page.getByRole("heading", {
      name: "De grootste marketplace voor Europese producten.",
    })
  ).toBeVisible()

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole("heading", { name: "Acties & thema’s" })).toBeVisible()
  await expect(page.locator("[data-ad-position='1']")).toBeVisible()

  // Desktop again
  await page.setViewportSize({ width: 1280, height: 900 })

  const realErrors = pageErrors.filter(
    (e) => !e.includes("Hydration failed") && !e.includes("hydration")
  )
  expect(realErrors).toEqual([])
  await browser.close()
})
