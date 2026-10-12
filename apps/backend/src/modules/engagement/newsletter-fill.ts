/**
 * Vult een nieuwsbrief met catalogusfeiten die de aanroeper al heeft opgehaald.
 * Verstuurt niets en verzint geen prijs, actie of commissie.
 */
import {
  composeNewsletterEmail,
  type NewsletterBrandBlock,
  type NewsletterCard,
  type NewsletterEmailResult,
  type NewsletterOfferBanner,
  type NewsletterStory,
} from "@europmade/utils"

export type NewsletterCatalogProduct = {
  id: string
  name: string
  brand: string
  categories: string[]
  text: string
  imageUrl: string
  href: string
  priceLabel: string
  commissionLabel: string
  promoLabel: string
  promoText: string
  offerId?: string
}

export type NewsletterCatalogBrand = {
  id: string
  name: string
  slug: string
  text: string
  imageUrl: string
  href: string
}

export type NewsletterCatalog = {
  products: NewsletterCatalogProduct[]
  brands: NewsletterCatalogBrand[]
  /** Bereikbaar gepubliceerd websitelogo. Leeg betekent het woordmerk van de site. */
  logoUrl?: string
  imageWarnings?: string[]
}

export type NewsletterFillContext = {
  productId?: string | null
  brandId?: string | null
  offerId?: string | null
  categorySlug?: string | null
  /** Templatepreview: de actuele catalogus, niet een vast voorbeeldproduct. */
  currentCatalog?: boolean
  previewStandIn?: boolean
  trackingByProduct?: Record<string, string> | null
}

const PRODUCT_TRIGGERS = new Set(["consumer_product_published", "affiliate_product_published"])
const BRAND_TRIGGERS = new Set(["brand_published", "affiliate_brand_published"])

/** Het startmoment wijst naar het product, merk, de actie of de categorie. */
export function contextFromTrigger(
  trigger: string | null | undefined,
  key: string | null | undefined,
  maps?: { versionProducts?: Record<string, string>; categoryNames?: Record<string, string> }
): NewsletterFillContext {
  const source = trigger?.trim() || ""
  const raw = key?.trim() || ""
  if (!source || !raw.startsWith(`${source}:`)) return {}
  const id = raw.slice(source.length + 1).trim()
  if (!id) return {}
  if (PRODUCT_TRIGGERS.has(source)) {
    return { productId: maps?.versionProducts?.[id]?.trim() || id }
  }
  if (BRAND_TRIGGERS.has(source)) return { brandId: id }
  if (source === "offer_published") return { offerId: id }
  if (source === "category_three_brands") {
    return { categorySlug: maps?.categoryNames?.[id]?.trim() || id }
  }
  return {}
}

function trackingHref(value: string | undefined): string {
  const href = value?.trim() ?? ""
  if (!/^https?:\/\//i.test(href) || !/[?&]ref=/.test(href)) return ""
  return href
}

function decode(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ")
    .trim()
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function tagText(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"))
  return match?.[1] ? decode(match[1]) : ""
}

function paragraphs(html: string): string[] {
  return [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => decode(match[1] ?? ""))
    .filter(Boolean)
}

export function parseNewsletterSource(html: string): {
  headline: string
  intro: string[]
  stories: NewsletterStory[]
  binds: string[]
  productIds: string[]
} {
  const source = html || ""
  const hero = source.split(/<!--em-hero-->/i)[1]?.split(/<!--em-/)[0] ?? source
  const stories = [...source.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|<!--em-|$)/gi)].map(
    (match) => ({
      title: decode(match[1] ?? ""),
      text: paragraphs(match[2] ?? "").join(" "),
    })
  )
  const binds = [...source.matchAll(/<!--em-bind:([a-z0-9:,_-]+)-->/gi)].map((match) =>
    (match[1] ?? "").toLowerCase()
  )
  const productIds = [...source.matchAll(/data-em-product="([^"]+)"/gi)].map((match) =>
    decode(match[1] ?? "")
  )
  return {
    headline: tagText(hero, "h2") || tagText(source, "h2") || tagText(source, "h1"),
    intro: paragraphs(hero).filter((line) => !stories.some((story) => story.text === line)),
    stories: stories.filter((story) => story.title || story.text),
    binds,
    productIds: productIds.filter(Boolean),
  }
}

function cardFrom(product: NewsletterCatalogProduct): NewsletterCard {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    text: product.text,
    imageUrl: product.imageUrl,
    href: product.href,
    priceLabel: product.priceLabel,
    commissionLabel: product.commissionLabel,
  }
}

function withImage(products: NewsletterCatalogProduct[]): NewsletterCatalogProduct[] {
  return products.filter((product) => product.name.trim() && product.imageUrl.trim() && product.href.trim())
}

export function fillNewsletter(input: {
  body: string
  preheader: string
  ctaLabel: string
  ctaUrl: string
  unsubscribeUrl: string
  locale: string
  audience: "consumers" | "affiliates" | "sellers" | "prospects"
  catalog: NewsletterCatalog
  context?: NewsletterFillContext
}): NewsletterEmailResult & { standIn: boolean } {
  const parsed = parseNewsletterSource(input.body)
  const warnings: string[] = [...(input.catalog.imageWarnings ?? [])]
  const problems: string[] = []
  let standIn = false
  const context = input.context ?? {}
  const current = Boolean(context.currentCatalog || context.previewStandIn)
  const products = input.catalog.products
  const chosen: NewsletterCatalogProduct[] = []
  const seen = new Set<string>()
  const take = (rows: NewsletterCatalogProduct[], limit: number) => {
    for (const row of withImage(rows)) {
      if (seen.has(row.id) || chosen.length >= limit) continue
      seen.add(row.id)
      chosen.push(row)
    }
  }
  for (const id of parsed.productIds) {
    const found = products.find((product) => product.id === id)
    if (!found) {
        problems.push(`Product ${id} staat niet in de gepubliceerde catalogus.`)
      continue
    }
    take([found], chosen.length + 1)
  }
  let brand: NewsletterBrandBlock | null = null
  let offer: NewsletterOfferBanner | null = null
  let requireProducts = parsed.productIds.length > 0
  let requireBrand = false
  let requireOffer = false
  let requireCommission = false
  for (const bind of parsed.binds) {
    if (bind === "product") {
      requireProducts = true
      const id = context.productId?.trim()
      if (id) {
        const match = products.find((product) => product.id === id)
        if (!match) problems.push(`Product ${id} staat niet in de gepubliceerde catalogus.`)
        else take([match], 1)
      } else if (current) {
        const first = withImage(products)[0]
        if (first) {
          take([first], 1)
          standIn = true
          warnings.push("De kaart is het nieuwste gepubliceerde product. Een verzending gebruikt het product van het startmoment.")
        }
      } else {
        problems.push("Er is geen product aan dit startmoment gekoppeld.")
      }
    } else if (bind === "selection" || bind === "commission") {
      requireProducts = true
      if (bind === "commission") requireCommission = true
      take(products, 4)
    } else if (bind.startsWith("category:")) {
      requireProducts = true
      const slugs = bind.slice("category:".length).split(",").map((item) => item.trim()).filter(Boolean)
      take(
        products.filter((product) =>
          product.categories.some((name) => slugs.includes(slugify(name)))
        ),
        4
      )
    } else if (bind === "category-live") {
      requireProducts = true
      const slug = context.categorySlug?.trim() ? slugify(context.categorySlug) : ""
      if (slug) {
        const rows = products.filter((product) =>
          product.categories.some((name) => slugify(name) === slug)
        )
        const brandNames = new Set(rows.map((product) => product.brand.trim()).filter(Boolean))
        if (brandNames.size < 3) {
          problems.push("Deze categorie heeft geen gepubliceerde producten van minstens drie merken.")
        } else {
          take(rows, 4)
        }
      } else if (current) {
        const groups = new Map<string, Set<string>>()
        for (const product of products) {
          for (const name of product.categories) {
            const key = slugify(name)
            const brands = groups.get(key) ?? new Set<string>()
            if (product.brand.trim()) brands.add(product.brand.trim())
            groups.set(key, brands)
          }
        }
        const ready = [...groups.entries()].find(([, brands]) => brands.size >= 3)?.[0]
        if (ready) {
          take(
            products.filter((product) => product.categories.some((name) => slugify(name) === ready)),
            4
          )
          standIn = true
          warnings.push("De kaarten komen uit een categorie die nu producten van minstens drie merken heeft.")
        }
      } else {
        problems.push("Er is geen categorie aan dit startmoment gekoppeld.")
      }
    } else if (bind === "brand") {
      requireBrand = true
      const id = context.brandId?.trim()
      let match = id ? input.catalog.brands.find((item) => item.id === id) : undefined
      if (id && !match) {
        problems.push(`Merk ${id} staat niet bij de gepubliceerde merken.`)
      } else if (!id && current) {
        const names = new Set(products.map((product) => product.brand.trim()).filter(Boolean))
        match =
          input.catalog.brands.find((item) => item.imageUrl.trim() && names.has(item.name.trim())) ??
          input.catalog.brands.find((item) => names.has(item.name.trim())) ??
          input.catalog.brands.find((item) => item.imageUrl.trim() && item.name.trim()) ??
          input.catalog.brands.find((item) => item.name.trim())
        if (match) {
          standIn = true
          warnings.push("De kaart is een actueel gepubliceerd merk. Een verzending gebruikt het merk van het startmoment.")
        }
      } else if (!id) {
        problems.push("Er is geen merk aan dit startmoment gekoppeld.")
      }
      if (match) {
        brand = {
          name: match.name,
          text: match.text,
          imageUrl: match.imageUrl,
          href: match.href,
        }
        take(
          products.filter((product) => product.brand.trim() && product.brand.trim() === match.name.trim()),
          3
        )
      }
    } else if (bind === "offer") {
      requireOffer = true
      requireProducts = true
      const id = context.offerId?.trim()
      const live = products.filter(
        (product) => product.promoLabel.trim() && (!id || product.offerId === id)
      )
      if (id && live.length === 0) {
        problems.push("Deze actie is niet geldig of hoort niet bij een gepubliceerd product.")
      }
      take(live, 1)
      const first = live.find((product) => product.imageUrl.trim() && product.href.trim())
      if (first) {
        offer = {
          title: first.promoLabel,
          text: first.promoText || first.name,
          href: first.href,
        }
      }
    }
  }
  if (input.audience === "affiliates" && chosen.some((product) => !product.commissionLabel.trim())) {
    warnings.push("Niet elk product heeft een berekende commissie. Een ontbrekend percentage wordt niet ingevuld.")
  }
  const tracked = chosen.map((product) => {
    const href = trackingHref(context.trackingByProduct?.[product.id])
    return href ? { ...product, href } : product
  })
  if (input.audience === "affiliates" && tracked.some((product) => !trackingHref(context.trackingByProduct?.[product.id]))) {
    warnings.push("Er is nog geen trackinglink voor deze partner. De kaart houdt de cataloguslink.")
  }
  const composed = composeNewsletterEmail({
    preheader: input.preheader,
    headline: parsed.headline,
    intro: parsed.intro,
    stories: parsed.stories,
    cards: tracked.map(cardFrom),
    brand,
    offer,
    ctaLabel: input.ctaLabel,
    ctaUrl: input.ctaUrl,
    unsubscribeUrl: input.unsubscribeUrl,
    locale: input.locale,
    audience: input.audience,
    logoUrl: input.catalog.logoUrl,
    requireProducts,
    requireBrand,
    requireOffer,
    requireCommission,
  })
  return {
    ...composed,
    problems: [...problems, ...composed.problems],
    warnings: [...warnings, ...composed.warnings],
    standIn,
  }
}

export function isVisualNewsletter(body: string): boolean {
  return /<!--em-layout:newsletter-->/i.test(body || "")
}
