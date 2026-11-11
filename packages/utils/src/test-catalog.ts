/**
 * Tijdelijke EuropMade-testcatalogus.
 *
 * Alleen development, of staging wanneer EUROPMADE_ENV=staging én
 * EUROPMADE_TEST_CATALOG=1. Production blijft uit, ook als het vlaggetje aanstaat.
 * EUROPMADE_TEST_CATALOG=0 zet de modus overal uit. Een storefront-query kan hem niet aanzetten.
 *
 * De allowlist is de geïmporteerde Bosch- en Miele-set van ons eigen seller-account.
 * Publicatie en productidentiteit blijven onaangeroerd. In de lokale testmodus
 * horen bij deze producten vaste demo-aanbiedingen; die prijzen staan hier.
 */

export const TEST_CATALOG_SELLER_ID = "sell_01KZ6CRDV9MS9WAJSTR9NT695C"

export const TEST_CATALOG_GTINS = [
  "4242005437351",
  "4242005531530",
  "4242005382347",
  "4242005498635",
  "4242005441501",
  "4242005535040",
  "4242005433117",
  "4242005601394",
  "4242005469161",
  "4242005520930",
  "4242005522118",
  "4242005526413",
  "4002516629290",
  "4002516915669",
  "4002516896531",
  "4002516896067",
  "4002516896548",
  "4002516896456",
  "4002516900719",
  "4002516865841",
  "4002516900726",
  "4002516866640",
] as const

const TEST_CATALOG_GTIN_SET = new Set<string>(TEST_CATALOG_GTINS)

type Env = Record<string, string | undefined>

function flagValue(env: Env): string {
  return (env.EUROPMADE_TEST_CATALOG ?? "").trim().toLowerCase()
}

function flagOn(env: Env): boolean {
  const flag = flagValue(env)
  return flag === "1" || flag === "true" || flag === "on"
}

function flagOff(env: Env): boolean {
  const flag = flagValue(env)
  return flag === "0" || flag === "false" || flag === "off"
}

/** Server-side gate. Nooit af te leiden uit een frontendparameter. */
export function isTestCatalogEnabled(env: Env = process.env): boolean {
  const nodeEnv = (env.NODE_ENV ?? "").trim().toLowerCase()
  const stage = (env.EUROPMADE_ENV ?? "").trim().toLowerCase()
  if (stage === "production" || flagOff(env)) return false
  if (stage === "staging") return flagOn(env)
  if (nodeEnv === "production") return false
  if (nodeEnv !== "development") return false
  return flagValue(env) === "" || flagOn(env)
}

export function isTestCatalogGtin(value: string | null | undefined): boolean {
  return TEST_CATALOG_GTIN_SET.has((value ?? "").trim())
}

/** Vaste lokale demo-lijstprijs, voorraad en levering. Geen actieprijs en geen review. */
export const TEST_CATALOG_DEMO_STOCK = 8
export const TEST_CATALOG_DEMO_DELIVERY_DAYS = 5
export const TEST_CATALOG_DEMO_SHIPPING_EUR = 0
export const TEST_CATALOG_DEMO_VAT_RATE = 0.21

const TEST_CATALOG_DEMO_PRICE_EUR = {
  combinatie: 899,
  vaatwasser: 629,
  wasmachine: 749,
  droger: 699,
  fallback: 549,
} as const

/**
 * Demo-basisprijs in euro voor een allowlisted testproduct.
 * De categorieketen bepaalt de groep; een was-droogcombinatie gaat voor op wasmachine of droger.
 */
export function testCatalogDemoBasePrice(categorySlugs: string[]): number {
  const slugs = categorySlugs.map((slug) => slug.trim().toLowerCase()).filter(Boolean)
  if (slugs.some((slug) => slug.includes("combinatie"))) return TEST_CATALOG_DEMO_PRICE_EUR.combinatie
  if (slugs.some((slug) => slug.includes("vaatwasser"))) return TEST_CATALOG_DEMO_PRICE_EUR.vaatwasser
  if (slugs.some((slug) => slug.includes("wasmachine"))) return TEST_CATALOG_DEMO_PRICE_EUR.wasmachine
  if (slugs.some((slug) => slug.includes("droger"))) return TEST_CATALOG_DEMO_PRICE_EUR.droger
  return TEST_CATALOG_DEMO_PRICE_EUR.fallback
}

/**
 * Checkout van een ongepubliceerd testproduct mag alleen in de testmodus,
 * voor de allowlist en het vaste demo-selleraccount.
 */
export function testCatalogDemoCheckoutAllowed(input: {
  gtin: string
  sellerId: string
  env?: Env
}): boolean {
  if (!isTestCatalogEnabled(input.env)) return false
  if (!isTestCatalogGtin(input.gtin)) return false
  return input.sellerId.trim() === TEST_CATALOG_SELLER_ID
}

/**
 * Een rij mag alleen mee als hij op de allowlist staat, van onze seller is
 * en niet gearchiveerd of gepubliceerd is. Een lokale demo-aanbieding verbergt de rij niet.
 */
export function testCatalogRowAllowed(input: {
  gtin: string
  sellerId: string
  lifecycleStatus: string
  publicationStatus: string
  offerCount: number
}): boolean {
  if (!isTestCatalogGtin(input.gtin)) return false
  if (input.sellerId.trim() !== TEST_CATALOG_SELLER_ID) return false
  const lifecycle = input.lifecycleStatus.trim().toLowerCase()
  if (!lifecycle || lifecycle === "gearchiveerd") return false
  if (input.publicationStatus.trim().toLowerCase() === "gepubliceerd") return false
  void input.offerCount
  return true
}

export function testCatalogProductInCategory(
  categorySlugs: string[],
  categoryFilter: string
): boolean {
  const allowed = new Set(
    categoryFilter
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean)
  )
  if (allowed.size === 0) return false
  return categorySlugs.some((slug) => allowed.has(slug.trim().toLowerCase()))
}

/** Gepubliceerde kaarten blijven leidend. Een testproduct vervangt ze niet. */
export function mergeTestCatalogProducts<T extends { slug: string }>(
  published: T[],
  extra: T[]
): T[] {
  const seen = new Set(published.map((product) => product.slug))
  return [...published, ...extra.filter((product) => product.slug && !seen.has(product.slug))]
}
