/**
 * Smoke: Homepage V2 compressie-ronde.
 * Run: pnpm dlx playwright@1.49.0 test tmp-homepage-v2.spec.ts --reporter=line
 */
import { chromium, expect, test } from "playwright/test"

const BASE = process.env.EM_WEB_BASE ?? "http://localhost:3000"

test.describe.configure({ timeout: 180_000 })

test("homepage V2 compact layout, hero CMS structure and footer partners", async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const pageErrors: string[] = []
  page.on("pageerror", (e) => pageErrors.push(String(e)))

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 90_000 })

  await expect(
    page.getByRole("heading", {
      name: "Ontdek Europese producten, rechtstreeks van de makers",
    })
  ).toBeVisible({ timeout: 45_000 })

  await expect(page.getByRole("link", { name: "Bekijk producten" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Word verkoper" })).toBeVisible()

  // Alleen header-zoek — geen tweede hero-zoekbalk
  await expect(page.getByRole("search")).toHaveCount(1)

  await expect(page.getByText("Geproduceerd in Europa")).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Populaire categorieën" })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Uitgelicht deze week" })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Populaire Europese producenten" })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Bekijk producent" }).first()
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Waarom kiezen voor EuropMade?" })
  ).toBeVisible()
  await expect(page.getByRole("heading", { name: "Nieuw binnen" })).toBeVisible({
    timeout: 45_000,
  })
  await expect(page.getByRole("heading", { name: "Best verkocht" })).toBeVisible()

  await expect(page.getByRole("heading", { name: "Partners", exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "Affiliateprogramma" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Tarieven" })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Handleidingen" })).toHaveCount(0)
  await expect(page.getByText("© EuropMade")).toBeVisible()

  await expect(page.locator("[data-ad-position='1']")).toBeVisible()
  await expect(page.locator("[data-ad-position='2']")).toBeVisible()

  // Geen hover ATC op homepage-productkaarten
  await expect(page.getByRole("button", { name: "In winkelwagen" })).toHaveCount(0)

  const realErrors = pageErrors.filter(
    (e) => !e.includes("Hydration failed") && !e.includes("hydration")
  )
  expect(realErrors).toEqual([])
  await browser.close()
})
