/**
 * Doelgroep van een nieuwsbrief of campagne.
 * Alleen kenmerken die op de persoon bestaan. Geen verzending.
 */
import { resolveNewsletterTopics } from "./consumer-rules"
import { marketingPreferenceKey } from "./preference-audit"

export type CampaignAudience = "consumers" | "sellers" | "affiliates"

export type CampaignCriteria = {
  locales: string[]
  product_ids: string[]
  brand_ids: string[]
  category_ids: string[]
}

export type CampaignPerson = {
  id: string
  locale?: string | null
  newsletter_enabled?: boolean
  topics?: unknown
  approved?: boolean
  preferences?: Record<string, boolean> | null
  suppressed?: boolean
  product_ids?: string[]
  brand_ids?: string[]
  category_ids?: string[]
}

export type CampaignDirectory = {
  consumers: Map<string, CampaignPerson>
  sellers: Map<string, CampaignPerson>
  affiliates: Map<string, CampaignPerson>
}

const EMPTY: CampaignCriteria = {
  locales: [],
  product_ids: [],
  brand_ids: [],
  category_ids: [],
}

function textList(value: unknown, locale: boolean): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const rows: string[] = []
  for (const entry of value) {
    if (typeof entry !== "string") continue
    const token = locale ? localeKey(entry) : entry.trim()
    if (!token || token.length > 64 || seen.has(token)) continue
    if (locale && !/^[a-z]{2}$/.test(token)) continue
    if (!locale && !/^[A-Za-z0-9_-]+$/.test(token)) continue
    seen.add(token)
    rows.push(token)
    if (rows.length >= 40) break
  }
  return rows
}

export function localeKey(value: string | null | undefined): string {
  const text = value?.trim().toLowerCase() ?? ""
  if (!text) return ""
  return text.split(/[-_]/)[0] ?? ""
}

export function normalizeCampaignCriteria(input: unknown): CampaignCriteria {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ...EMPTY }
  const row = input as Record<string, unknown>
  return {
    locales: textList(row.locales, true),
    product_ids: textList(row.product_ids, false),
    brand_ids: textList(row.brand_ids, false),
    category_ids: textList(row.category_ids, false),
  }
}

export function storedCampaignCriteria(input: unknown): CampaignCriteria | null {
  const criteria = normalizeCampaignCriteria(input)
  if (
    criteria.locales.length === 0 &&
    criteria.product_ids.length === 0 &&
    criteria.brand_ids.length === 0 &&
    criteria.category_ids.length === 0
  ) {
    return null
  }
  return criteria
}

export function marketingPreferenceAllows(
  audience: CampaignAudience,
  preferences: Record<string, boolean> | null | undefined,
  key: string
): boolean {
  if (audience === "consumers") {
    return resolveNewsletterTopics(preferences, true)[key as "news" | "brands" | "offers"] === true
  }
  return preferences?.[key] === true
}

function overlaps(wanted: string[], owned: string[] | undefined): boolean {
  if (wanted.length === 0) return true
  const have = new Set(owned ?? [])
  return wanted.some((id) => have.has(id))
}

export function matchesCampaignRecipient(
  audience: CampaignAudience,
  person: CampaignPerson | undefined,
  criteriaInput: unknown,
  preferenceKey?: string
): boolean {
  if (!person) return false
  if (person.suppressed) return false
  if (audience === "consumers" && person.newsletter_enabled !== true) return false
  if (audience === "affiliates" && person.approved === false) return false
  const key =
    preferenceKey ??
    marketingPreferenceKey(audience, "newsletter", null)
  const allowed =
    audience === "consumers"
      ? marketingPreferenceAllows(
          "consumers",
          resolveNewsletterTopics(person.topics, true),
          key
        )
      : marketingPreferenceAllows(audience, person.preferences, key)
  if (!allowed) return false
  const criteria = normalizeCampaignCriteria(criteriaInput)
  if (criteria.locales.length > 0 && !criteria.locales.includes(localeKey(person.locale))) {
    return false
  }
  if (audience === "consumers") return true
  return (
    overlaps(criteria.product_ids, person.product_ids) &&
    overlaps(criteria.brand_ids, person.brand_ids) &&
    overlaps(criteria.category_ids, person.category_ids)
  )
}

export function describeCampaignCriteria(
  audience: string | null | undefined,
  criteriaInput: unknown
): string {
  const criteria = normalizeCampaignCriteria(criteriaInput)
  const who =
    audience === "sellers"
      ? "Verkopers"
      : audience === "affiliates"
        ? "Affiliatepartners"
        : audience === "consumers"
          ? "Consumenten met nieuwsbrief"
          : "Geen doelgroep"
  const parts = [who]
  if (criteria.locales.length > 0) parts.push(`taal ${criteria.locales.join(", ")}`)
  if (audience === "consumers") {
    if (criteria.product_ids.length || criteria.brand_ids.length || criteria.category_ids.length) {
      parts.push("product, merk en categorie staan vast maar filteren geen consumenten")
    }
  } else {
    if (criteria.product_ids.length > 0) parts.push(`product ${criteria.product_ids.join(", ")}`)
    if (criteria.brand_ids.length > 0) parts.push(`merk ${criteria.brand_ids.join(", ")}`)
    if (criteria.category_ids.length > 0) parts.push(`categorie ${criteria.category_ids.join(", ")}`)
  }
  return `${parts.join(" · ")}. Uitschrijvingen, voorkeuren en suppressies blijven gelden. Er wordt niets verzonden.`
}

type CatalogLink = {
  seller_id?: string | null
  affiliate_id?: string | null
  product_id?: string | null
  brand_id?: string | null
  category_ids?: string[]
}

function pushUnique(list: string[], value: string | null | undefined) {
  const token = value?.trim()
  if (token && !list.includes(token)) list.push(token)
}

export function buildCampaignDirectory(input: {
  consumers?: Array<{
    id: string
    locale?: string | null
    newsletter_enabled?: boolean
    newsletter_topics?: unknown
  }>
  sellers?: Array<{
    id: string
    locale?: string | null
    communication_preferences?: Record<string, boolean> | null
  }>
  affiliates?: Array<{
    id: string
    locale?: string | null
    onboarding_status?: string | null
    communication_preferences?: Record<string, boolean> | null
  }>
  links?: CatalogLink[]
  organizations?: Array<{ id: string; converted_seller_id?: string | null }>
  contacts?: Array<{ id: string; organization_id: string }>
  suppressions?: Array<{ contact_id?: string | null; category?: string | null; active?: boolean }>
}): CampaignDirectory {
  const suppressedContacts = new Set(
    (input.suppressions ?? [])
      .filter((row) => row.active !== false && row.category === "marketing" && row.contact_id)
      .map((row) => row.contact_id as string)
  )
  const contactsByOrg = new Map<string, string[]>()
  for (const contact of input.contacts ?? []) {
    const list = contactsByOrg.get(contact.organization_id) ?? []
    list.push(contact.id)
    contactsByOrg.set(contact.organization_id, list)
  }
  const orgsBySeller = new Map<string, string[]>()
  for (const organization of input.organizations ?? []) {
    const sellerId = organization.converted_seller_id?.trim()
    if (!sellerId) continue
    const list = orgsBySeller.get(sellerId) ?? []
    list.push(organization.id)
    orgsBySeller.set(sellerId, list)
  }
  const catalog = new Map<string, { products: string[]; brands: string[]; categories: string[] }>()
  function catalogFor(ownerId: string) {
    const current = catalog.get(ownerId) ?? { products: [], brands: [], categories: [] }
    catalog.set(ownerId, current)
    return current
  }
  for (const link of input.links ?? []) {
    const owner = link.seller_id?.trim() || link.affiliate_id?.trim()
    if (!owner) continue
    const row = catalogFor(owner)
    pushUnique(row.products, link.product_id)
    pushUnique(row.brands, link.brand_id)
    for (const categoryId of link.category_ids ?? []) pushUnique(row.categories, categoryId)
  }
  const consumers = new Map<string, CampaignPerson>()
  for (const consumer of input.consumers ?? []) {
    consumers.set(consumer.id, {
      id: consumer.id,
      locale: consumer.locale,
      newsletter_enabled: consumer.newsletter_enabled === true,
      topics: consumer.newsletter_topics,
    })
  }
  const sellers = new Map<string, CampaignPerson>()
  for (const seller of input.sellers ?? []) {
    const contactIds = (orgsBySeller.get(seller.id) ?? []).flatMap(
      (organizationId) => contactsByOrg.get(organizationId) ?? []
    )
    const owned = catalog.get(seller.id)
    sellers.set(seller.id, {
      id: seller.id,
      locale: seller.locale,
      preferences: seller.communication_preferences ?? null,
      suppressed: contactIds.length > 0 && contactIds.every((id) => suppressedContacts.has(id)),
      product_ids: owned?.products ?? [],
      brand_ids: owned?.brands ?? [],
      category_ids: owned?.categories ?? [],
    })
  }
  const affiliates = new Map<string, CampaignPerson>()
  for (const affiliate of input.affiliates ?? []) {
    const owned = catalog.get(affiliate.id)
    affiliates.set(affiliate.id, {
      id: affiliate.id,
      locale: affiliate.locale,
      approved: affiliate.onboarding_status === "Goedgekeurd",
      preferences: affiliate.communication_preferences ?? null,
      product_ids: owned?.products ?? [],
      brand_ids: owned?.brands ?? [],
      category_ids: owned?.categories ?? [],
    })
  }
  return { consumers, sellers, affiliates }
}

export function catalogLinks(input: {
  versions?: Array<{
    product_id?: string | null
    created_by_seller_id?: string | null
    publication_status?: string | null
  }>
  products?: Array<{ id: string; brand_id?: string | null }>
  product_categories?: Array<{ product_id: string; category_id: string }>
  affiliate_links?: Array<{ affiliate_id?: string | null; product_id?: string | null }>
}): CatalogLink[] {
  const brandByProduct = new Map(
    (input.products ?? []).flatMap((product) => {
      const brandId = product.brand_id?.trim()
      return brandId ? [[product.id, brandId] as const] : []
    })
  )
  const categoriesByProduct = new Map<string, string[]>()
  for (const link of input.product_categories ?? []) {
    const productId = link.product_id?.trim()
    const categoryId = link.category_id?.trim()
    if (!productId || !categoryId) continue
    const list = categoriesByProduct.get(productId) ?? []
    pushUnique(list, categoryId)
    categoriesByProduct.set(productId, list)
  }
  const rows: CatalogLink[] = []
  for (const version of input.versions ?? []) {
    if (version.publication_status !== "Gepubliceerd") continue
    const productId = version.product_id?.trim()
    const sellerId = version.created_by_seller_id?.trim()
    if (!productId || !sellerId) continue
    rows.push({
      seller_id: sellerId,
      product_id: productId,
      brand_id: brandByProduct.get(productId) ?? null,
      category_ids: categoriesByProduct.get(productId) ?? [],
    })
  }
  for (const link of input.affiliate_links ?? []) {
    const productId = link.product_id?.trim()
    const affiliateId = link.affiliate_id?.trim()
    if (!productId || !affiliateId) continue
    rows.push({
      affiliate_id: affiliateId,
      product_id: productId,
      brand_id: brandByProduct.get(productId) ?? null,
      category_ids: categoriesByProduct.get(productId) ?? [],
    })
  }
  return rows
}

export function filterCampaignCalls<
  T extends {
    program_id: string
    consumer_id?: string
    seller_id?: string
    affiliate_id?: string
  },
>(
  programs: Array<{
    id: string
    program_type?: string | null
    audience?: string | null
    start_trigger?: string | null
    selection_criteria?: unknown
  }>,
  calls: T[],
  directory: CampaignDirectory
): T[] {
  const byId = new Map(programs.map((program) => [program.id, program]))
  return calls.filter((call) => {
    const program = byId.get(call.program_id)
    if (!program) return true
    if (program.program_type !== "newsletter" && program.program_type !== "campaign") return true
    const audience = program.audience
    if (audience !== "consumers" && audience !== "sellers" && audience !== "affiliates") return false
    const id =
      audience === "consumers"
        ? call.consumer_id
        : audience === "sellers"
          ? call.seller_id
          : call.affiliate_id
    const person = id ? directory[audience].get(id) : undefined
    return matchesCampaignRecipient(
      audience,
      person,
      program.selection_criteria,
      marketingPreferenceKey(audience, program.program_type, program.start_trigger)
    )
  })
}
