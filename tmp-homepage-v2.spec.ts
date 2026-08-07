/**
 * Smoke: Homepage premium hero + campagnes.
 */
import { chromium, expect, test } from "playwright/test"

const BASE = process.env.EM_WEB_BASE ?? "http://localhost:3000"

test.describe.configure({ timeout: 180_000 })

test("homepage premium hero and compact campaigns", async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
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

  await expect(page.getByRole("heading", { name: "Acties & thema’s" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Back to School" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Bekijk actie" }).first()).toBeVisible()

  await expect(
    page.getByRole("heading", { name: "Uitgelicht deze week" })
  ).toBeVisible()
  await expect(page.getByRole("heading", { name: "Nieuw binnen" })).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByRole("heading", { name: "Best verkocht" })).toBeVisible()

  const ad1 = page.locator("[data-ad-position='1']")
  await expect(ad1).toBeVisible()
  await expect(ad1.getByText("Advertentie").first()).toBeVisible()

  // Desktop → tablet → mobile
  await page.setViewportSize({ width: 834, height: 900 })
  await expect(
    page.getByRole("heading", {
      name: "De grootste marketplace voor Europese producten.",
    })
  ).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole("heading", { name: "Acties & thema’s" })).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 900 })

  const realErrors = pageErrors.filter(
    (e) => !e.includes("Hydration failed") && !e.includes("hydration")
  )
  expect(realErrors).toEqual([])
  await browser.close()
})
