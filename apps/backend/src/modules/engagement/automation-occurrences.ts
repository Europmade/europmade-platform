/**
 * Verzamelt startmomenten uit bestaande gegevens.
 * Een beschikbaar startmoment heeft hier één verzamelaar.
 * Ontbrekende startmomenten hebben er geen en enrollen niemand.
 */
import {
  AUTOMATION_START_TRIGGERS,
  DAY_MS,
  findStartTrigger,
  type TriggerAudience,
} from "./automation-start"
import {
  accountCreatedCandidates,
  firstProductCandidates,
  firstSaleCandidates,
  incompleteCandidates,
  onboardingApprovedCandidates,
  onboardingSubmittedCandidates,
  publishedCandidates,
  verificationCandidates,
} from "./orchestrator-rules"

export type AutomationSnapshot = {
  now: Date
  sellers: {
    id: string
    onboarding_status: string
    locale?: string | null
    communication_preferences?: Record<string, boolean> | null
  }[]
  versions: {
    id: string
    product_id?: string
    title?: string | null
    created_by_seller_id: string
    publication_status: string
    created_at: string
    information_quality?: string
  }[]
  origins: { id: string; seller_id: string; status: string }[]
  orders: { id: string; seller_id?: string | null; customer_id?: string | null; created_at: string }[]
  consumers: {
    id: string
    customer_id?: string | null
    newsletter_enabled: boolean
    locale?: string | null
    created_at: string
  }[]
  brands: { id: string; public_page_status: string }[]
  affiliates: {
    id: string
    onboarding_status: string
    locale?: string | null
    communication_preferences?: Record<string, boolean> | null
  }[]
  affiliate_links: { affiliate_id?: string | null; product_id?: string | null }[]
  organizations: { id: string; converted_seller_id?: string | null }[]
  contacts: { id: string; organization_id: string }[]
  suppressions: { contact_id?: string | null; category?: string | null; active?: boolean }[]
  conversions: { id: string; affiliate_id: string; created_at: string }[]
  shipments: {
    id: string
    order_id: string
    status?: string | null
    delivered_at?: string | Date | null
  }[]
  products: { id: string; brand_id?: string | null }[]
  product_categories: { product_id: string; category_id: string }[]
  prices: {
    offer_id: string
    promo_price?: unknown
    promo_starts_at?: string | Date | null
    promo_ends_at?: string | Date | null
  }[]
}

export type AutomationOccurrence = {
  trigger: string
  occurrence_key: string
  audience: TriggerAudience
  seller_id?: string
  consumer_id?: string
  affiliate_id?: string
  broadcast?: boolean
}

type Collector = (snapshot: AutomationSnapshot) => AutomationOccurrence[]

function sellerRows(
  trigger: string,
  rows: { seller_id: string; trigger_key: string }[]
): AutomationOccurrence[] {
  return rows.map((row) => ({
    trigger,
    occurrence_key: row.trigger_key,
    audience: "sellers" as const,
    seller_id: row.seller_id,
  }))
}

function consumerByCustomer(snapshot: AutomationSnapshot): Map<string, string> {
  const map = new Map<string, string>()
  for (const consumer of snapshot.consumers) {
    const customerId = consumer.customer_id?.trim()
    if (customerId) map.set(customerId, consumer.id)
  }
  return map
}

function ordersByCustomer(snapshot: AutomationSnapshot) {
  const grouped = new Map<string, { id: string; created_at: string }[]>()
  for (const order of snapshot.orders) {
    const customerId = order.customer_id?.trim()
    if (!customerId) continue
    const list = grouped.get(customerId) ?? []
    list.push({ id: order.id, created_at: order.created_at })
    grouped.set(customerId, list)
  }
  return grouped
}

function inactive(
  snapshot: AutomationSnapshot,
  trigger: string,
  days: number
): AutomationOccurrence[] {
  const orders = ordersByCustomer(snapshot)
  const rows: AutomationOccurrence[] = []
  for (const consumer of snapshot.consumers) {
    const customerId = consumer.customer_id?.trim()
    const own = customerId ? orders.get(customerId) ?? [] : []
    const reference =
      own.length > 0
        ? own.reduce((latest, order) =>
            new Date(order.created_at).getTime() > new Date(latest.created_at).getTime()
              ? order
              : latest
          ).created_at
        : consumer.created_at
    const elapsed = snapshot.now.getTime() - new Date(reference).getTime()
    if (!Number.isFinite(elapsed) || elapsed < days * DAY_MS) continue
    rows.push({
      trigger,
      occurrence_key: `${trigger}:${consumer.id}:${new Date(reference).toISOString()}`,
      audience: "consumers",
      consumer_id: consumer.id,
    })
  }
  return rows
}

function publishedBrands(snapshot: AutomationSnapshot): AutomationOccurrence[] {
  return snapshot.brands
    .filter((brand) => brand.public_page_status === "published" && brand.id.trim())
    .map((brand) => ({
      trigger: "brand_published",
      occurrence_key: `brand_published:${brand.id}`,
      audience: "consumers" as const,
      broadcast: true,
    }))
}

function isDelivered(shipment: AutomationSnapshot["shipments"][number]): boolean {
  return shipment.status === "delivered" || Boolean(shipment.delivered_at)
}

function firstDeliveredOrders(snapshot: AutomationSnapshot): AutomationOccurrence[] {
  const consumers = consumerByCustomer(snapshot)
  const orderCustomer = new Map(
    snapshot.orders.flatMap((order) => {
      const customerId = order.customer_id?.trim()
      return customerId ? [[order.id, customerId] as const] : []
    })
  )
  const earliest = new Map<string, number>()
  for (const shipment of snapshot.shipments ?? []) {
    if (!isDelivered(shipment)) continue
    const customerId = orderCustomer.get(shipment.order_id)
    const consumerId = customerId ? consumers.get(customerId) : undefined
    if (!consumerId) continue
    const at = shipment.delivered_at ? new Date(shipment.delivered_at).getTime() : 0
    const current = earliest.get(consumerId)
    if (current == null || at < current) earliest.set(consumerId, at)
  }
  return [...earliest.keys()].map((consumerId) => ({
    trigger: "consumer_first_order_received",
    occurrence_key: `consumer_first_order_received:${consumerId}`,
    audience: "consumers" as const,
    consumer_id: consumerId,
  }))
}

function promoLive(
  price: AutomationSnapshot["prices"][number],
  now: Date
): boolean {
  const amount = Number(price.promo_price)
  if (!Number.isFinite(amount) || amount <= 0) return false
  if (!price.promo_starts_at) return false
  const start = new Date(price.promo_starts_at).getTime()
  if (Number.isNaN(start) || start > now.getTime()) return false
  if (price.promo_ends_at) {
    const end = new Date(price.promo_ends_at).getTime()
    if (Number.isNaN(end) || end < now.getTime()) return false
  }
  const offerId = price.offer_id?.trim()
  return Boolean(offerId)
}

function livePromotions(snapshot: AutomationSnapshot): AutomationOccurrence[] {
  return (snapshot.prices ?? []).flatMap((price) => {
    if (!promoLive(price, snapshot.now)) return []
    return [
      {
        trigger: "offer_published",
        occurrence_key: `offer_published:${price.offer_id.trim()}`,
        audience: "consumers" as const,
        broadcast: true,
      },
    ]
  })
}

function categoriesWithThreeBrands(snapshot: AutomationSnapshot): AutomationOccurrence[] {
  const published = new Set(
    snapshot.versions
      .filter((version) => version.publication_status === "Gepubliceerd" && version.product_id?.trim())
      .map((version) => version.product_id!.trim())
  )
  const brandByProduct = new Map(
    (snapshot.products ?? []).flatMap((product) => {
      const brandId = product.brand_id?.trim()
      return brandId ? [[product.id, brandId] as const] : []
    })
  )
  const brandsByCategory = new Map<string, Set<string>>()
  for (const link of snapshot.product_categories ?? []) {
    const productId = link.product_id?.trim()
    const categoryId = link.category_id?.trim()
    if (!productId || !categoryId || !published.has(productId)) continue
    const brandId = brandByProduct.get(productId)
    if (!brandId) continue
    const brands = brandsByCategory.get(categoryId) ?? new Set<string>()
    brands.add(brandId)
    brandsByCategory.set(categoryId, brands)
  }
  return [...brandsByCategory.entries()].flatMap(([categoryId, brands]) => {
    if (brands.size < 3) return []
    return [
      {
        trigger: "category_three_brands",
        occurrence_key: `category_three_brands:${categoryId}`,
        audience: "consumers" as const,
        broadcast: true,
      },
    ]
  })
}

function publishedProducts(snapshot: AutomationSnapshot, trigger: string, audience: TriggerAudience) {
  return snapshot.versions
    .filter((version) => version.publication_status === "Gepubliceerd" && version.id.trim())
    .map((version) => ({
      trigger,
      occurrence_key: `${trigger}:${version.id}`,
      audience,
      broadcast: true,
    }))
}

const COLLECTORS: Record<string, Collector> = {
  account_created: (snapshot) =>
    sellerRows("account_created", accountCreatedCandidates(snapshot.sellers)),
  onboarding_submitted: (snapshot) =>
    sellerRows("onboarding_submitted", onboardingSubmittedCandidates(snapshot.sellers)),
  onboarding_approved: (snapshot) =>
    sellerRows("onboarding_approved", onboardingApprovedCandidates(snapshot.sellers)),
  first_product: (snapshot) =>
    sellerRows("first_product", firstProductCandidates(snapshot.versions)),
  product_incomplete: (snapshot) =>
    sellerRows(
      "product_incomplete",
      incompleteCandidates(
        snapshot.versions.filter(
          (version): version is typeof version & { information_quality: string } =>
            typeof version.information_quality === "string"
        )
      )
    ),
  product_published: (snapshot) =>
    sellerRows("product_published", publishedCandidates(snapshot.versions)),
  verification: (snapshot) =>
    sellerRows("verification", verificationCandidates(snapshot.origins)),
  first_sale: (snapshot) => sellerRows("first_sale", firstSaleCandidates(snapshot.orders)),
  consumer_newsletter_subscribed: (snapshot) =>
    snapshot.consumers
      .filter((consumer) => consumer.newsletter_enabled)
      .map((consumer) => ({
        trigger: "consumer_newsletter_subscribed",
        occurrence_key: `consumer_newsletter_subscribed:${consumer.id}`,
        audience: "consumers" as const,
        consumer_id: consumer.id,
      })),
  consumer_account_created: (snapshot) =>
    snapshot.consumers
      .filter((consumer) => consumer.customer_id?.trim())
      .map((consumer) => ({
        trigger: "consumer_account_created",
        occurrence_key: `consumer_account_created:${consumer.id}`,
        audience: "consumers" as const,
        consumer_id: consumer.id,
      })),
  consumer_first_order: (snapshot) => {
    const consumers = consumerByCustomer(snapshot)
    const orders = ordersByCustomer(snapshot)
    const rows: AutomationOccurrence[] = []
    for (const [customerId, own] of orders) {
      const consumerId = consumers.get(customerId)
      if (!consumerId || own.length === 0) continue
      rows.push({
        trigger: "consumer_first_order",
        occurrence_key: `consumer_first_order:${consumerId}`,
        audience: "consumers",
        consumer_id: consumerId,
      })
    }
    return rows
  },
  consumer_order_placed: (snapshot) => {
    const consumers = consumerByCustomer(snapshot)
    return snapshot.orders.flatMap((order) => {
      const customerId = order.customer_id?.trim()
      const consumerId = customerId ? consumers.get(customerId) : undefined
      if (!consumerId) return []
      return [
        {
          trigger: "consumer_order_placed",
          occurrence_key: `consumer_order_placed:${order.id}`,
          audience: "consumers" as const,
          consumer_id: consumerId,
        },
      ]
    })
  },
  consumer_repeat_order: (snapshot) => {
    const consumers = consumerByCustomer(snapshot)
    const orders = ordersByCustomer(snapshot)
    const rows: AutomationOccurrence[] = []
    for (const [customerId, own] of orders) {
      const consumerId = consumers.get(customerId)
      if (!consumerId || own.length < 2) continue
      rows.push({
        trigger: "consumer_repeat_order",
        occurrence_key: `consumer_repeat_order:${consumerId}`,
        audience: "consumers",
        consumer_id: consumerId,
      })
    }
    return rows
  },
  consumer_inactive_30d: (snapshot) => inactive(snapshot, "consumer_inactive_30d", 30),
  consumer_inactive_60d: (snapshot) => inactive(snapshot, "consumer_inactive_60d", 60),
  consumer_inactive_90d: (snapshot) => inactive(snapshot, "consumer_inactive_90d", 90),
  consumer_subscribed_no_order: (snapshot) => {
    const orders = ordersByCustomer(snapshot)
    return snapshot.consumers.flatMap((consumer) => {
      if (!consumer.newsletter_enabled) return []
      const customerId = consumer.customer_id?.trim()
      if (customerId && (orders.get(customerId)?.length ?? 0) > 0) return []
      return [
        {
          trigger: "consumer_subscribed_no_order",
          occurrence_key: `consumer_subscribed_no_order:${consumer.id}`,
          audience: "consumers" as const,
          consumer_id: consumer.id,
        },
      ]
    })
  },
  brand_published: publishedBrands,
  consumer_product_published: (snapshot) =>
    publishedProducts(snapshot, "consumer_product_published", "consumers"),
  affiliate_created: (snapshot) =>
    snapshot.affiliates
      .filter((affiliate) => affiliate.onboarding_status === "Ingediend")
      .map((affiliate) => ({
        trigger: "affiliate_created",
        occurrence_key: `affiliate_created:${affiliate.id}`,
        audience: "affiliates" as const,
        affiliate_id: affiliate.id,
      })),
  affiliate_approved: (snapshot) =>
    snapshot.affiliates
      .filter((affiliate) => affiliate.onboarding_status === "Goedgekeurd")
      .map((affiliate) => ({
        trigger: "affiliate_approved",
        occurrence_key: `affiliate_approved:${affiliate.id}`,
        audience: "affiliates" as const,
        affiliate_id: affiliate.id,
      })),
  affiliate_first_sale: (snapshot) => {
    const seen = new Set<string>()
    const rows: AutomationOccurrence[] = []
    const ordered = [...snapshot.conversions].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    for (const conversion of ordered) {
      const affiliateId = conversion.affiliate_id?.trim()
      if (!affiliateId || seen.has(affiliateId)) continue
      seen.add(affiliateId)
      rows.push({
        trigger: "affiliate_first_sale",
        occurrence_key: `affiliate_first_sale:${affiliateId}`,
        audience: "affiliates",
        affiliate_id: affiliateId,
      })
    }
    return rows
  },
  affiliate_brand_published: (snapshot) =>
    snapshot.brands
      .filter((brand) => brand.public_page_status === "published")
      .map((brand) => ({
        trigger: "affiliate_brand_published",
        occurrence_key: `affiliate_brand_published:${brand.id}`,
        audience: "affiliates" as const,
        broadcast: true,
      })),
  affiliate_product_published: (snapshot) =>
    publishedProducts(snapshot, "affiliate_product_published", "affiliates"),
  consumer_first_order_received: firstDeliveredOrders,
  offer_published: livePromotions,
  category_three_brands: categoriesWithThreeBrands,
}

export function collectorFor(trigger: string): Collector | null {
  return COLLECTORS[trigger] ?? null
}

export function availableTriggersMissingCollector(): string[] {
  return AUTOMATION_START_TRIGGERS.filter(
    (item) => item.available && item.key !== "seller_onboarded" && !COLLECTORS[item.key]
  ).map((item) => item.key)
}

export function collectOccurrences(
  snapshot: AutomationSnapshot,
  triggerKeys: string[]
): AutomationOccurrence[] {
  const rows: AutomationOccurrence[] = []
  for (const key of triggerKeys) {
    const item = findStartTrigger(key)
    if (!item?.available) continue
    const collect = COLLECTORS[key]
    if (!collect) continue
    rows.push(...collect(snapshot))
  }
  return rows
}

export function sellerOnboardedOccurrence(sellerId: string): AutomationOccurrence {
  return {
    trigger: "seller_onboarded",
    occurrence_key: `seller_onboarded:${sellerId}`,
    audience: "sellers",
    seller_id: sellerId,
  }
}

export function expandBroadcasts(
  occurrences: AutomationOccurrence[],
  snapshot: AutomationSnapshot
): AutomationOccurrence[] {
  const rows: AutomationOccurrence[] = []
  for (const occurrence of occurrences) {
    if (!occurrence.broadcast) {
      rows.push(occurrence)
      continue
    }
    if (occurrence.audience === "consumers") {
      for (const consumer of snapshot.consumers) {
        if (!consumer.newsletter_enabled) continue
        rows.push({
          ...occurrence,
          broadcast: false,
          occurrence_key: `${occurrence.occurrence_key}:${consumer.id}`,
          consumer_id: consumer.id,
        })
      }
      continue
    }
    if (occurrence.audience === "affiliates") {
      for (const affiliate of snapshot.affiliates) {
        if (affiliate.onboarding_status !== "Goedgekeurd") continue
        rows.push({
          ...occurrence,
          broadcast: false,
          occurrence_key: `${occurrence.occurrence_key}:${affiliate.id}`,
          affiliate_id: affiliate.id,
        })
      }
    }
  }
  return rows
}
