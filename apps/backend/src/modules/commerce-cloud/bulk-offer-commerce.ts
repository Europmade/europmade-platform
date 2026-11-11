/**
 * Bulk delivery time and stock for existing Commerce Cloud offers.
 * Preview decides. Confirmation writes only those two offer fields.
 * Product Cloud publication and order reservations are not updated here.
 */

import { evaluateOfferSellability } from "./offer-sellability"

export type BulkOfferSnapshot = {
  offer_id: string
  seller_id: string
  product_id: string | null
  product_title: string | null
  identifier_value: string | null
  region_code: string | null
  identifier_id: string | null
  inventory_id: string | null
  publication_status: string | null
  sales_status: string | null
  base_price?: number | null
  shipping_profile_id?: string | null
  shipping_profile_status?: string | null
  shipping_profile_serves_region?: boolean | null
  current_delivery_days_max: number | null
  current_quantity_available: number | null
  /** True when the selection has no offer row at all. */
  missing?: boolean
  not_found?: boolean
}

export type BulkOfferCommerceRow = {
  offer_id: string
  product_id: string | null
  product_title: string | null
  identifier_value: string | null
  region_code: string | null
  status: "eligible" | "excluded" | "failed"
  reason: string | null
  current_delivery_days_max: number | null
  next_delivery_days_max: number | null
  current_quantity_available: number | null
  next_quantity_available: number | null
  changes_delivery: boolean
  changes_stock: boolean
  inventory_id: string | null
  identifier_id: string | null
  publication_status: string | null
  sellable_before: boolean
  sellable_after: boolean
}

export type BulkOfferCommercePlan = {
  rows: BulkOfferCommerceRow[]
  selected_count: number
  eligible_count: number
  excluded_count: number
  apply_allowed: boolean
  field_error: string | null
}

export type ParsedBulkCommerceInput = {
  delivery: number | undefined
  stock: number | undefined
  /** Number to show as the new value, including a rejected one. */
  delivery_preview: number | undefined
  stock_preview: number | undefined
  error: string | null
}

export function parseBulkCommerceInput(input: {
  delivery_days_max?: unknown
  quantity_available?: unknown
}): ParsedBulkCommerceInput {
  const delivery = parseOptionalInt(input.delivery_days_max, "delivery")
  const stock = parseOptionalInt(input.quantity_available, "stock")
  const base = {
    delivery_preview: delivery.preview,
    stock_preview: stock.preview,
  }
  if (delivery.error) {
    return { delivery: undefined, stock: undefined, ...base, error: delivery.error }
  }
  if (stock.error) {
    return { delivery: undefined, stock: undefined, ...base, error: stock.error }
  }
  if (delivery.value === undefined && stock.value === undefined) {
    return {
      delivery: undefined,
      stock: undefined,
      ...base,
      error: "Vul een levertijd of een voorraad in.",
    }
  }
  if (delivery.value != null && (delivery.value < 0 || delivery.value > 365)) {
    return {
      delivery: undefined,
      stock: undefined,
      ...base,
      error: "Levertijd moet een geheel getal tussen 0 en 365 dagen zijn.",
    }
  }
  if (stock.value != null && stock.value < 0) {
    return {
      delivery: undefined,
      stock: undefined,
      ...base,
      error: "Voorraad mag niet negatief zijn.",
    }
  }
  return { delivery: delivery.value, stock: stock.value, ...base, error: null }
}

function parseOptionalInt(
  raw: unknown,
  kind: "delivery" | "stock"
): { value?: number; preview?: number; error: string | null } {
  if (raw === undefined) return { value: undefined, error: null }
  if (typeof raw === "string" && raw.trim() === "") return { value: undefined, error: null }
  const invalid =
    kind === "delivery"
      ? "Levertijd moet een geheel getal tussen 0 en 365 dagen zijn."
      : "Voorraad moet een geheel getal zijn en mag niet negatief zijn."
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (!Number.isInteger(raw)) return { preview: raw, error: invalid }
    return { value: raw, preview: raw, error: null }
  }
  if (typeof raw === "string" && /^-?\d+$/.test(raw.trim())) {
    const value = Number(raw.trim())
    return { value, preview: value, error: null }
  }
  const asNumber = typeof raw === "string" ? Number(raw.trim()) : Number.NaN
  if (Number.isFinite(asNumber)) return { preview: asNumber, error: invalid }
  return { error: invalid }
}

export function planBulkOfferCommerce(input: {
  actor_seller_id: string
  offers: BulkOfferSnapshot[]
  delivery_days_max?: unknown
  quantity_available?: unknown
}): BulkOfferCommercePlan {
  const parsed = parseBulkCommerceInput(input)
  const rows = input.offers.map((offer) =>
    rowForOffer(offer, input.actor_seller_id, parsed)
  )
  const eligible = rows.filter((row) => row.status === "eligible").length
  return {
    rows,
    selected_count: rows.length,
    eligible_count: eligible,
    excluded_count: rows.length - eligible,
    apply_allowed: parsed.error == null && eligible > 0,
    field_error: parsed.error,
  }
}

function sellabilityFacts(
  offer: BulkOfferSnapshot,
  delivery: number | null,
  stock: number | null
) {
  return {
    has_offer: !offer.missing && !offer.not_found && Boolean(offer.offer_id),
    sales_status: offer.sales_status,
    base_price: offer.base_price ?? null,
    has_inventory: Boolean(offer.inventory_id),
    quantity_available: stock,
    delivery_days_max: delivery,
    shipping_profile_id: offer.shipping_profile_id ?? null,
    shipping_profile_status: offer.shipping_profile_status ?? null,
    shipping_profile_serves_region: offer.shipping_profile_serves_region ?? null,
    publication_status: offer.publication_status,
  }
}

function rowForOffer(
  offer: BulkOfferSnapshot,
  actorSellerId: string,
  parsed: ParsedBulkCommerceInput
): BulkOfferCommerceRow {
  const currentDelivery = offer.current_delivery_days_max
  const currentStock = offer.current_quantity_available
  const nextDelivery =
    parsed.delivery_preview !== undefined ? parsed.delivery_preview : currentDelivery
  const nextStock =
    parsed.stock_preview !== undefined ? parsed.stock_preview : currentStock
  const base = {
    offer_id: offer.offer_id,
    product_id: offer.product_id,
    product_title: offer.product_title,
    identifier_value: offer.identifier_value,
    region_code: offer.region_code,
    current_delivery_days_max: currentDelivery,
    next_delivery_days_max: nextDelivery,
    current_quantity_available: currentStock,
    next_quantity_available: nextStock,
    changes_delivery: false,
    changes_stock: false,
    inventory_id: offer.inventory_id,
    identifier_id: offer.identifier_id,
    publication_status: offer.publication_status,
    sellable_before: evaluateOfferSellability(
      sellabilityFacts(offer, currentDelivery, currentStock)
    ).sellable,
    sellable_after: evaluateOfferSellability(
      sellabilityFacts(offer, nextDelivery, nextStock)
    ).sellable,
  }

  if (parsed.error) {
    return { ...base, status: "excluded", reason: parsed.error }
  }
  if (offer.not_found) {
    return { ...base, status: "excluded", reason: "Aanbod niet gevonden." }
  }
  if (offer.missing || !offer.offer_id) {
    return {
      ...base,
      status: "excluded",
      reason: "Geen eigen aanbod op dit product.",
    }
  }
  if (offer.seller_id !== actorSellerId) {
    return {
      ...base,
      status: "excluded",
      reason: "Dit aanbod hoort bij een andere seller.",
    }
  }
  if (!offer.product_id) {
    return {
      ...base,
      status: "excluded",
      reason: "Dit aanbod is niet gekoppeld aan een product.",
    }
  }
  const changesDelivery =
    parsed.delivery !== undefined && parsed.delivery !== currentDelivery
  const changesStock = parsed.stock !== undefined && parsed.stock !== currentStock
  if (!changesDelivery && !changesStock) {
    return {
      ...base,
      status: "excluded",
      reason: "De nieuwe waarde is gelijk aan de huidige waarde.",
    }
  }
  return {
    ...base,
    status: "eligible",
    reason: null,
    changes_delivery: changesDelivery,
    changes_stock: changesStock,
  }
}

export type BulkOfferAuditRow = {
  product_id: string
  seller_id: string
  actor_customer_id: string | null
  field_code: string
  field_label: string
  old_value: string | null
  new_value: string | null
  status: "current"
  reason: string
}

export async function applyBulkOfferCommerce(
  plan: BulkOfferCommercePlan,
  actor: { seller_id: string; actor_customer_id: string | null },
  deps: {
    updateDelivery: (offerId: string, days: number) => Promise<void>
    updateStock: (inventoryId: string, quantity: number) => Promise<void>
    createStock?: (offerId: string, quantity: number) => Promise<void>
    audit: (row: BulkOfferAuditRow) => Promise<void>
    recompute?: (identifierId: string, regionCode: string) => Promise<void>
  }
): Promise<{ applied_count: number; failed_count: number; rows: BulkOfferCommerceRow[] }> {
  if (!plan.apply_allowed) {
    return { applied_count: 0, failed_count: 0, rows: plan.rows }
  }
  let applied = 0
  let failed = 0
  const rows: BulkOfferCommerceRow[] = []
  for (const row of plan.rows) {
    if (row.status !== "eligible") {
      rows.push(row)
      continue
    }
    try {
      if (row.changes_delivery && row.next_delivery_days_max != null) {
        await deps.updateDelivery(row.offer_id, row.next_delivery_days_max)
        await recordOfferAudit(deps, actor, {
          product_id: row.product_id || "",
          field_code: "offer.delivery_days_max",
          field_label: "Levertijd",
          old_value:
            row.current_delivery_days_max != null
              ? String(row.current_delivery_days_max)
              : null,
          new_value: String(row.next_delivery_days_max),
          offer_id: row.offer_id,
        })
      }
      if (row.changes_stock && row.next_quantity_available != null) {
        if (row.inventory_id) {
          await deps.updateStock(row.inventory_id, row.next_quantity_available)
        } else if (deps.createStock) {
          await deps.createStock(row.offer_id, row.next_quantity_available)
        } else {
          throw new Error("Dit aanbod heeft geen voorraadregel.")
        }
        await recordOfferAudit(deps, actor, {
          product_id: row.product_id || "",
          field_code: "offer.quantity_available",
          field_label: "Voorraad",
          old_value:
            row.current_quantity_available != null
              ? String(row.current_quantity_available)
              : null,
          new_value: String(row.next_quantity_available),
          offer_id: row.offer_id,
        })
      }
      if (deps.recompute && row.identifier_id && row.region_code) {
        try {
          await deps.recompute(row.identifier_id, row.region_code)
        } catch {
          // The offer write stays. Buy box refresh can be retried.
        }
      }
      applied += 1
      rows.push(row)
    } catch (err) {
      failed += 1
      rows.push({
        ...row,
        status: "failed",
        reason: readableOfferError(err),
      })
    }
  }
  return { applied_count: applied, failed_count: failed, rows }
}

async function recordOfferAudit(
  deps: { audit: (row: BulkOfferAuditRow) => Promise<void> },
  actor: { seller_id: string; actor_customer_id: string | null },
  row: {
    product_id: string
    field_code: string
    field_label: string
    old_value: string | null
    new_value: string
    offer_id: string
  }
) {
  if (!row.product_id) return
  try {
    await deps.audit({
      product_id: row.product_id,
      seller_id: actor.seller_id,
      actor_customer_id: actor.actor_customer_id,
      field_code: row.field_code,
      field_label: row.field_label,
      old_value: row.old_value,
      new_value: row.new_value,
      status: "current",
      reason: `offer:${row.offer_id}`,
    })
  } catch {
    // The offer write stands when the history row cannot be stored.
  }
}

function readableOfferError(err: unknown): string {
  const message = err instanceof Error ? err.message.trim() : ""
  if (!message || message.length > 180 || /sql|constraint|violat/i.test(message)) {
    return "Aanbod bijwerken mislukt."
  }
  return message
}
