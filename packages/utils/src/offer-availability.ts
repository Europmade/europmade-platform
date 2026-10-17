/**
 * Landafhankelijke bestelbaarheid.
 * Hergebruikt het marktaanbod (offer.region_code) en het verzendprofiel
 * (country_rates). Taal van de bezoeker speelt geen rol.
 */

export type ProductAvailability =
  | "orderable"
  | "out_of_stock"
  | "not_deliverable"
  | "not_published"
  | "paused"

export type OfferDestinationInput = {
  salesStatus?: string | null
  quantityAvailable?: number | null
  regionCode?: string | null
  shippingProfileId?: string | null
  profileStatus?: string | null
  /** true wanneer het land in het profiel actief is. */
  countryActive?: boolean | null
}

export function offerShipsToCountry(input: {
  regionCode?: string | null
  destinationCountry?: string | null
  shippingProfileId?: string | null
  profileStatus?: string | null
  countryActive?: boolean | null
}): boolean {
  const destination = (input.destinationCountry ?? "").trim().toUpperCase()
  const region = (input.regionCode ?? "").trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(destination) || region !== destination) return false
  if (!input.shippingProfileId) return true
  if ((input.profileStatus ?? "active") !== "active") return false
  return input.countryActive === true
}

export function classifyProductAvailability(input: {
  published: boolean
  destinationCountry: string
  offers: OfferDestinationInput[]
}): ProductAvailability {
  if (!input.published) return "not_published"
  const shipping = input.offers.filter((offer) =>
    offerShipsToCountry({
      regionCode: offer.regionCode,
      destinationCountry: input.destinationCountry,
      shippingProfileId: offer.shippingProfileId,
      profileStatus: offer.profileStatus,
      countryActive: offer.countryActive,
    })
  )
  if (shipping.length === 0) return "not_deliverable"
  const active = shipping.filter(
    (offer) => (offer.salesStatus ?? "active") === "active"
  )
  if (active.length === 0) return "paused"
  if (active.some((offer) => (offer.quantityAvailable ?? 0) > 0)) {
    return "orderable"
  }
  return "out_of_stock"
}

export type CatalogDestination =
  | { kind: "product"; id: string }
  | { kind: "category"; slug: string }
  | { kind: "action"; slug: string }
  | { kind: "informational" }
  | { kind: "unknown" }

function storefrontPath(href: string): string | null {
  const raw = href.trim()
  if (!/^https?:\/\//i.test(raw)) return raw
  try {
    const url = new URL(raw)
    const host = url.hostname.toLowerCase()
    const internal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "europmade.com" ||
      host.endsWith(".europmade.com") ||
      host === "europmade.eu" ||
      host.endsWith(".europmade.eu")
    return internal ? url.pathname : null
  } catch {
    return null
  }
}

export function catalogDestinationFromHref(href: string): CatalogDestination {
  const path = storefrontPath(href)
  if (path == null) return { kind: "informational" }
  const product = path.match(/^\/product\/([^/?#]+)/)
  if (product) return { kind: "product", id: decodeURIComponent(product[1]) }
  const category = path.match(/^\/categorie\/([^/?#]+)/)
  if (category) return { kind: "category", slug: decodeURIComponent(category[1]) }
  const action = path.match(/^\/acties\/([^/?#]+)/)
  if (action) return { kind: "action", slug: decodeURIComponent(action[1]) }
  return { kind: "unknown" }
}

/**
 * Een commerciële banner blijft weg wanneer de bestemming geen bestelbaar
 * aanbod heeft. Informatieve en internationale bestemmingen blijven staan.
 * null betekent: nog niet gecontroleerd, dus niet verbergen.
 */
export function commercialBannerAllowed(input: {
  informative?: boolean
  international?: boolean
  orderableCount: number | null
}): boolean {
  if (input.informative || input.international) return true
  if (input.orderableCount == null) return true
  return input.orderableCount > 0
}
