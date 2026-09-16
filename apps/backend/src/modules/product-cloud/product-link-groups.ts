import { MedusaError } from "@medusajs/framework/utils"

/**
 * Allowed link dimensions. Reuses Product Cloud variant_type labels
 * plus Afmeting. Does not create pc_product_variant rows.
 */
export const PRODUCT_LINK_DIMENSIONS = [
  "Kleur",
  "Maat",
  "Inhoud",
  "Vermogen",
  "Spanning",
  "Materiaal",
  "Uitvoering",
  "Bundel",
  "Afmeting",
] as const

export type ProductLinkDimension = (typeof PRODUCT_LINK_DIMENSIONS)[number]

export const PRODUCT_LINK_GROUP_STATUSES = [
  "proposed",
  "active",
  "rejected",
] as const

export type ProductLinkGroupStatus =
  (typeof PRODUCT_LINK_GROUP_STATUSES)[number]

/**
 * Admin list filter. Medusa/qs may pass status as a string, array, or object.
 * Unknown values fall back to the proposed review queue — never an empty
 * unmatchable filter.
 */
export function adminProductLinkGroupListFilter(
  raw: unknown
): { status: ProductLinkGroupStatus } | Record<string, never> {
  let value: unknown = raw
  if (Array.isArray(value)) value = value[0]
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>
    value = obj.$eq ?? obj.value ?? obj.status ?? undefined
    if (Array.isArray(value)) value = value[0]
  }
  const status = typeof value === "string" ? value.trim() : ""
  if (!status || status === "proposed") return { status: "proposed" }
  if (status === "all") return {}
  if (status === "active" || status === "rejected") return { status }
  return { status: "proposed" }
}

export type ProductLinkMemberInput = {
  product_id: string
  values: Record<string, string>
}

export type ProductLinkProposalInput = {
  name: string
  dimensions: string[]
  members: ProductLinkMemberInput[]
  note?: string | null
  status?: string | null
  submitter_seller_id?: string | null
}

export type NormalizedProductLinkProposal = {
  name: string
  dimensions: ProductLinkDimension[]
  members: Array<{
    product_id: string
    values: Record<string, string>
    values_key: string
    sort_order: number
  }>
  note: string | null
  status: "proposed"
  submitter_seller_id: string
}

const DIMENSION_SET = new Set<string>(PRODUCT_LINK_DIMENSIONS)

export function isProductLinkDimension(
  value: string
): value is ProductLinkDimension {
  return DIMENSION_SET.has(value)
}

export function canonicalValuesKey(
  dimensions: string[],
  values: Record<string, string>
): string {
  return dimensions.map((dim) => `${dim}=${values[dim]}`).join("|")
}

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function fail(message: string): never {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
}

/**
 * Normalize + validate a seller proposal. Always forces status `proposed`
 * and submitter from auth — never from the client body.
 */
export function normalizeProductLinkProposal(
  input: ProductLinkProposalInput,
  submitterSellerId: string,
  existingProductIds: Set<string>
): NormalizedProductLinkProposal {
  const sellerId = trimText(submitterSellerId)
  if (!sellerId) {
    fail("Geen geauthenticeerde seller.")
  }
  if (input.status && trimText(input.status) !== "proposed") {
    fail("Een seller mag alleen een koppelvoorstel indienen (status proposed).")
  }

  const name = trimText(input.name)
  if (!name) {
    fail("name is verplicht.")
  }

  const rawDimensions = Array.isArray(input.dimensions) ? input.dimensions : []
  const dimensions = rawDimensions.map((d) => trimText(d)).filter(Boolean)
  if (dimensions.length === 0) {
    fail("Minimaal één dimensie is verplicht.")
  }
  if (new Set(dimensions).size !== dimensions.length) {
    fail("Dimensies mogen niet dubbel voorkomen.")
  }
  for (const dim of dimensions) {
    if (!isProductLinkDimension(dim)) {
      fail(`Ongeldige dimensie: ${dim}`)
    }
  }

  const membersIn = Array.isArray(input.members) ? input.members : []
  if (membersIn.length < 1) {
    fail("Minimaal één product is verplicht.")
  }

  const productIds: string[] = []
  const members: NormalizedProductLinkProposal["members"] = []
  const valueKeys = new Set<string>()

  membersIn.forEach((member, index) => {
    const productId = trimText(member?.product_id)
    if (!productId) {
      fail("Ieder lid heeft een product_id nodig.")
    }
    if (!productId.startsWith("prod_")) {
      fail("Alleen zelfstandige Product Cloud-producten kunnen worden gekoppeld.")
    }
    if (!existingProductIds.has(productId)) {
      fail(`Product bestaat niet: ${productId}`)
    }
    productIds.push(productId)

    const rawValues =
      member?.values && typeof member.values === "object" && !Array.isArray(member.values)
        ? member.values
        : {}
    const values: Record<string, string> = {}
    for (const dim of dimensions) {
      const value = trimText(rawValues[dim])
      if (!value) {
        fail(`Ontbrekende waarde voor dimensie ${dim} bij ${productId}`)
      }
      values[dim] = value
    }
    const extraKeys = Object.keys(rawValues).filter(
      (key) => !dimensions.includes(trimText(key)) && trimText(key)
    )
    if (extraKeys.length) {
      fail(`Onbekende dimensiewaarde(n): ${extraKeys.join(", ")}`)
    }

    const valuesKey = canonicalValuesKey(dimensions, values)
    if (valueKeys.has(valuesKey)) {
      fail("Dezelfde waardetupel mag niet twee keer in één groep voorkomen.")
    }
    valueKeys.add(valuesKey)

    members.push({
      product_id: productId,
      values,
      values_key: valuesKey,
      sort_order: index,
    })
  })

  if (new Set(productIds).size !== productIds.length) {
    fail("Een product mag niet twee keer in dezelfde groep staan.")
  }

  const note = trimText(input.note)
  return {
    name,
    dimensions: dimensions as ProductLinkDimension[],
    members,
    note: note || null,
    status: "proposed",
    submitter_seller_id: sellerId,
  }
}

/** Used when activating a group (next step). Seller submit never sets active. */
export function productIdsBlockingActivation(
  candidateProductIds: string[],
  productIdsAlreadyInActiveGroup: string[]
): string[] {
  const taken = new Set(productIdsAlreadyInActiveGroup)
  return candidateProductIds.filter((id) => taken.has(id))
}

export type ActiveLinkConflict = {
  product_id: string
  product_title?: string | null
  group_id: string
  group_name?: string | null
}

/** Admin-facing block copy: product + existing active group name. */
export function formatActiveLinkBlockMessage(
  conflicts: ActiveLinkConflict[]
): string {
  const parts = conflicts.map((conflict) => {
    const product = trimText(conflict.product_title) || conflict.product_id
    const groupName = trimText(conflict.group_name)
    const group = groupName
      ? `${groupName} (${conflict.group_id})`
      : conflict.group_id
    return `${product} in ${group}`
  })
  return `Product(en) zitten al in een actieve koppelgroep: ${parts.join("; ")}`
}

export function assertProductsFreeForActivation(
  candidateProductIds: string[],
  productIdsAlreadyInActiveGroup: string[],
  conflictDetails: ActiveLinkConflict[] = []
): void {
  const blocking = productIdsBlockingActivation(
    candidateProductIds,
    productIdsAlreadyInActiveGroup
  )
  if (!blocking.length) return
  const byProduct = new Map(
    conflictDetails.map((row) => [row.product_id, row] as const)
  )
  fail(
    formatActiveLinkBlockMessage(
      blocking.map(
        (productId) =>
          byProduct.get(productId) ?? {
            product_id: productId,
            group_id: "",
          }
      )
    )
  )
}

export function assertAdminCanDecideProductLink(
  actorType: string | undefined
): void {
  if (actorType !== "user") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Alleen een beheerder mag een koppelgroep goedkeuren of afwijzen."
    )
  }
}

export function applyProductLinkGroupDecision(input: {
  currentStatus: string
  decision: string
  decision_reason?: string | null
  decided_by: string
  now?: Date
}): {
  status: "active" | "rejected"
  decision_reason: string | null
  decided_by: string
  decided_at: Date
  members_active_slot: boolean
} {
  const decidedBy = trimText(input.decided_by)
  if (!decidedBy) {
    fail("Geen beslissende beheerder.")
  }
  if (input.currentStatus !== "proposed") {
    fail("Alleen een voorstel met status proposed kan worden beslist.")
  }
  const decision = trimText(input.decision)
  if (decision !== "approve" && decision !== "reject") {
    fail("decision moet approve of reject zijn.")
  }
  const reason = trimText(input.decision_reason)
  return {
    status: decision === "approve" ? "active" : "rejected",
    decision_reason: reason || null,
    decided_by: decidedBy,
    decided_at: input.now ?? new Date(),
    members_active_slot: decision === "approve",
  }
}

export function assertMembersReadyForActivation(
  members: Array<{
    product_id: string
    values_key: string
  }>,
  existingProductIds: Set<string>
): void {
  if (members.length < 1) {
    fail("Een koppelgroep heeft minimaal één product nodig.")
  }
  const productIds = members.map((m) => m.product_id)
  if (new Set(productIds).size !== productIds.length) {
    fail("Een product mag niet twee keer in dezelfde groep staan.")
  }
  const keys = members.map((m) => m.values_key)
  if (new Set(keys).size !== keys.length) {
    fail("Dezelfde waardetupel mag niet twee keer in één groep voorkomen.")
  }
  for (const member of members) {
    if (!existingProductIds.has(member.product_id)) {
      fail(`Product bestaat niet: ${member.product_id}`)
    }
  }
}

export function isActiveConsumableLinkGroup(
  group: { status: string },
  members: Array<{ is_active_slot?: boolean }>
): boolean {
  return (
    group.status === "active" &&
    members.length > 0 &&
    members.every((m) => m.is_active_slot === true)
  )
}

export type PublicProductLinkMember = {
  product_id: string
  product_title: string | null
  values: Record<string, string>
  image_url?: string | null
}

export type PublicProductLinkGroup = {
  id: string
  name: string
  dimensions: string[]
  members: PublicProductLinkMember[]
}

export function toPublicProductLinkGroup(
  group:
    | {
        id: string
        name: string
        dimensions: unknown
        status: string
        members: Array<{
          product_id: string
          product_title?: string | null
          values: unknown
          is_active_slot?: boolean
          image_url?: string | null
        }>
      }
    | null
    | undefined
): PublicProductLinkGroup | null {
  if (!group) return null
  if (!isActiveConsumableLinkGroup(group, group.members)) return null
  const dimensions = Array.isArray(group.dimensions)
    ? group.dimensions.filter((d): d is string => typeof d === "string" && d.trim().length > 0)
    : []
  if (!dimensions.length) return null
  return {
    id: group.id,
    name: group.name,
    dimensions,
    members: group.members.map((m) => ({
      product_id: m.product_id,
      product_title: m.product_title ?? null,
      values:
        m.values && typeof m.values === "object" && !Array.isArray(m.values)
          ? (m.values as Record<string, string>)
          : {},
      image_url: m.image_url ?? null,
    })),
  }
}

export type ProductLinkMutations = {
  updateProducts?: unknown
  updateOffers?: unknown
  createProductVariants?: unknown
}

/** Seller proposal persistence may only create link group + members. */
export function proposalPersistenceTouchesCatalogOrOffers(
  mutations: ProductLinkMutations
): boolean {
  return Boolean(
    mutations.updateProducts ||
      mutations.updateOffers ||
      mutations.createProductVariants
  )
}

export function serializeProductLinkGroup(
  group: {
    id: string
    name: string
    dimensions: unknown
    status: string
    submitter_seller_id: string
    note?: string | null
    decision_reason?: string | null
    decided_by?: string | null
    decided_at?: Date | string | null
    created_at?: Date | string
    updated_at?: Date | string
  },
  members: Array<{
    id: string
    product_id: string
    values: unknown
    values_key: string
    sort_order?: number
    is_active_slot?: boolean
  }>
) {
  return {
    id: group.id,
    name: group.name,
    dimensions: group.dimensions,
    status: group.status,
    submitter_seller_id: group.submitter_seller_id,
    note: group.note ?? null,
    decision_reason: group.decision_reason ?? null,
    decided_by: group.decided_by ?? null,
    decided_at: group.decided_at ?? null,
    created_at: group.created_at,
    updated_at: group.updated_at,
    members: members.map((m) => ({
      id: m.id,
      product_id: m.product_id,
      values: m.values,
      values_key: m.values_key,
      sort_order: m.sort_order ?? 0,
      is_active_slot: m.is_active_slot ?? false,
    })),
  }
}
