import type { MedusaContainer } from "@medusajs/framework/types"
import { parseCmsTheme } from "@europmade/utils"
import { CMS_MODULE } from "../../../../modules/cms"
import { COMMERCE_CLOUD_MODULE } from "../../../../modules/commerce-cloud"
import { draftProductSummary } from "../../../../modules/engagement/content-provider"
import type { NewsletterCatalog, NewsletterCatalogProduct } from "../../../../modules/engagement/newsletter-fill"
import { PARTNER_MODULE } from "../../../../modules/partner"
import { listPublishedCatalogProducts } from "../../../store/catalog/catalog-helpers"

const imageCache = new Map<string, { ok: boolean; at: number }>()

async function reachableImage(url: string): Promise<boolean> {
  if (!/^https?:\/\//i.test(url)) return false
  const cached = imageCache.get(url)
  if (cached && Date.now() - cached.at < 60_000) return cached.ok
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)
  const isImage = (type: string) => type.startsWith("image/") || type.includes("octet-stream")
  let ok = false
  try {
    const head = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" })
    const headType = head.headers.get("content-type") || ""
    if (head.ok && isImage(headType)) ok = true
    else {
      const response = await fetch(url, { method: "GET", signal: controller.signal, redirect: "follow" })
      const type = response.headers.get("content-type") || ""
      ok = response.ok && (isImage(type) || type === "")
      await response.body?.cancel()
    }
  } catch {
    ok = false
  } finally {
    clearTimeout(timer)
  }
  imageCache.set(url, { ok, at: Date.now() })
  return ok
}

function absolute(base: string, value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return `${base}${trimmed}`
  return ""
}

function money(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return ""
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value)
}

function promoLive(row: {
  promo_price?: unknown
  promo_starts_at?: string | Date | null
  promo_ends_at?: string | Date | null
}, now: Date): boolean {
  const amount = Number(row.promo_price)
  if (!Number.isFinite(amount) || amount <= 0) return false
  if (!row.promo_starts_at) return false
  const start = new Date(row.promo_starts_at).getTime()
  if (Number.isNaN(start) || start > now.getTime()) return false
  if (row.promo_ends_at) {
    const end = new Date(row.promo_ends_at).getTime()
    if (Number.isNaN(end) || end < now.getTime()) return false
  }
  return true
}

function when(value: string | Date | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(date)
}

export async function loadNewsletterCatalog(
  scope: MedusaContainer,
  origin: { backend: string; storefront: string }
): Promise<NewsletterCatalog> {
  const listed = await listPublishedCatalogProducts(scope, {
    region_code: "NL",
    limit: 80,
    sort: "newest",
  })
  const products: NewsletterCatalogProduct[] = listed.products.map((product) => ({
    id: product.id,
    name: product.title?.trim() || "",
    brand: product.brand_name?.trim() || "",
    categories: product.category_names ?? [],
    text: draftProductSummary(product.description ?? ""),
    imageUrl: absolute(origin.backend, product.image_url),
    href: absolute(origin.storefront, `/product/${encodeURIComponent(product.id)}`),
    priceLabel: money(product.from_price) ? `Vanaf ${money(product.from_price)}` : "",
    commissionLabel: product.affiliate_commission_label?.trim() || "",
    promoLabel: "",
    promoText: "",
    offerId: "",
  }))
  const byId = new Map(products.map((product) => [product.id, product]))
  try {
    const commerce = scope.resolve(COMMERCE_CLOUD_MODULE) as {
      listOfferPrices: (
        filters: Record<string, unknown>,
        config: { take: number }
      ) => Promise<Array<{
        offer_id?: string
        promo_price?: unknown
        promo_starts_at?: string | Date | null
        promo_ends_at?: string | Date | null
      }>>
      retrieveOffer: (id: string) => Promise<{ identifier_id?: string | null; sales_status?: string | null }>
    }
    const now = new Date()
    const prices = await commerce.listOfferPrices({}, { take: 200 })
    for (const price of prices) {
      if (!promoLive(price, now) || !price.offer_id) continue
      const offer = await commerce.retrieveOffer(price.offer_id)
      if (offer.sales_status === "paused") continue
      const product = byId.get(offer.identifier_id?.trim() || "")
      if (!product || product.promoLabel) continue
      const start = when(price.promo_starts_at)
      const end = when(price.promo_ends_at)
      product.promoLabel = `Actieprijs ${money(Number(price.promo_price))}`
      product.promoText = end ? `Geldig van ${start} tot ${end}.` : `Geldig vanaf ${start}.`
      product.offerId = price.offer_id
    }
  } catch {
    // Geen actie tonen als de offergegevens niet leesbaar zijn.
  }
  let brands: NewsletterCatalog["brands"] = []
  try {
    const partner = scope.resolve(PARTNER_MODULE) as {
      listBrands: (
        filters: { public_page_status?: string },
        config: { take: number }
      ) => Promise<Array<{
        id: string
        name?: string | null
        slug?: string | null
        intro?: string | null
        logo_url?: string | null
        hero_image_url?: string | null
        story_image_url?: string | null
      }>>
    }
    const rows = await partner.listBrands({ public_page_status: "published" }, { take: 200 })
    brands = rows.flatMap((brand) => {
      const name = brand.name?.trim() || ""
      if (!name) return []
      const image = brand.logo_url?.trim() || brand.hero_image_url?.trim() || brand.story_image_url?.trim() || ""
      const slug = brand.slug?.trim() || ""
      return [{
        id: brand.id,
        name,
        slug,
        text: draftProductSummary(brand.intro ?? ""),
        imageUrl: absolute(origin.backend, image),
        href: slug ? absolute(origin.storefront, `/merk/${encodeURIComponent(slug)}`) : "",
      }]
    })
    brands.sort((left, right) => {
      const score = (brand: { name: string; imageUrl: string }) => {
        const sample = /e2e|brandflow|brandpage|flowfix|imgflow|ownclaim|p210|normale naam/i.test(brand.name)
        return (brand.imageUrl ? 2 : 0) + (sample ? 0 : 1)
      }
      return score(right) - score(left)
    })
  } catch {
    brands = []
  }
  let logoUrl = ""
  const imageWarnings: string[] = []
  try {
    const cms = scope.resolve(CMS_MODULE) as {
      listCmsHomepages: (
        filters: { document_key: string; published: boolean },
        config: { take: number }
      ) => Promise<Array<{ document?: unknown }>>
    }
    const rows = await cms.listCmsHomepages({ document_key: "theme", published: true }, { take: 1 })
    const theme = rows[0]?.document ? parseCmsTheme(rows[0].document) : null
    const candidate = absolute(origin.backend, theme?.header.logo)
    if (candidate && (await reachableImage(candidate))) logoUrl = candidate
    else if (theme?.header.logo) {
      imageWarnings.push("Het gepubliceerde websitelogo is niet bereikbaar. De header gebruikt het woordmerk van de website.")
    }
  } catch {
    logoUrl = ""
  }
  const urls = [...new Set([
    ...products.map((product) => product.imageUrl),
    ...brands.map((brand) => brand.imageUrl),
  ].filter(Boolean))]
  const broken = new Set<string>()
  for (let index = 0; index < urls.length; index += 6) {
    const slice = urls.slice(index, index + 6)
    const checked = await Promise.all(slice.map(async (url) => [url, await reachableImage(url)] as const))
    for (const [url, ok] of checked) if (!ok) broken.add(url)
  }
  const droppedProducts = products.flatMap((product) => {
    if (!product.imageUrl || !broken.has(product.imageUrl)) return []
    const name = product.name || product.id
    product.imageUrl = ""
    return [name]
  })
  if (droppedProducts.length > 0) {
    imageWarnings.push(
      `Deze productafbeeldingen zijn niet bereikbaar en worden niet getoond: ${droppedProducts.slice(0, 5).join(", ")}.`
    )
  }
  let droppedBrands = 0
  for (const brand of brands) {
    if (!brand.imageUrl || !broken.has(brand.imageUrl)) continue
    brand.imageUrl = ""
    droppedBrands += 1
  }
  if (droppedBrands > 0) {
    imageWarnings.push("Een merkafbeelding is niet bereikbaar en wordt niet getoond.")
  }
  return { products, brands, logoUrl, imageWarnings }
}
