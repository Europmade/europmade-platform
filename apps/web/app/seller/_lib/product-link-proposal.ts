/**
 * Seller Product Link Group proposal helpers.
 * Client-side only: never send status/active/admin decision fields.
 */

export const SELLER_PRODUCT_LINK_DIMENSIONS = [
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

export type SellerProductLinkDimension =
  (typeof SELLER_PRODUCT_LINK_DIMENSIONS)[number]

export function toggleSelectedId(
  selection: ReadonlySet<string>,
  id: string
): Set<string> {
  const next = new Set(selection)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

export function applyVisibleSelection(
  current: ReadonlySet<string>,
  visibleIds: string[],
  selectAll: boolean
): Set<string> {
  const next = new Set(current)
  if (selectAll) {
    for (const id of visibleIds) next.add(id)
  } else {
    for (const id of visibleIds) next.delete(id)
  }
  return next
}

export function isVisibleListFullySelected(
  visibleIds: string[],
  selection: ReadonlySet<string>
): boolean {
  return visibleIds.length > 0 && visibleIds.every((id) => selection.has(id))
}

export function canOpenProductLinkDialog(selectedCount: number): boolean {
  return selectedCount >= 2
}

export function showProductLinkBulkAction(selectedCount: number): boolean {
  return selectedCount > 0
}

export function canonicalLinkValuesKey(
  dimensions: string[],
  values: Record<string, string>
): string {
  return dimensions.map((dim) => `${dim}=${(values[dim] || "").trim()}`).join("|")
}

export function findDuplicateLinkValueKeys(
  dimensions: string[],
  members: Array<{ product_id: string; values: Record<string, string> }>
): string[] {
  const seen = new Map<string, string>()
  const dupes: string[] = []
  for (const member of members) {
    const key = canonicalLinkValuesKey(dimensions, member.values)
    if (seen.has(key)) dupes.push(key)
    else seen.set(key, member.product_id)
  }
  return dupes
}

export function buildProductLinkProposalBody(input: {
  name: string
  dimensions: string[]
  members: Array<{ product_id: string; values: Record<string, string> }>
  note?: string
}): {
  name: string
  dimensions: string[]
  members: Array<{ product_id: string; values: Record<string, string> }>
  note?: string
} {
  const name = input.name.trim()
  if (!name) {
    throw new Error("Geef de koppeling een naam.")
  }
  if (!canOpenProductLinkDialog(input.members.length)) {
    throw new Error("Selecteer minimaal 2 producten.")
  }
  const dimensions = input.dimensions.map((d) => d.trim()).filter(Boolean)
  if (dimensions.length < 1) {
    throw new Error("Kies minimaal één dimensie.")
  }
  if (new Set(dimensions).size !== dimensions.length) {
    throw new Error("Dimensies mogen niet dubbel voorkomen.")
  }
  const productIds = input.members.map((m) => m.product_id)
  if (new Set(productIds).size !== productIds.length) {
    throw new Error("Een product mag niet twee keer in dezelfde groep staan.")
  }
  const members = input.members.map((member) => {
    const values: Record<string, string> = {}
    for (const dim of dimensions) {
      const value = (member.values[dim] || "").trim()
      if (!value) {
        throw new Error(`Vul een waarde in voor ${dim}.`)
      }
      values[dim] = value
    }
    return { product_id: member.product_id, values }
  })
  if (findDuplicateLinkValueKeys(dimensions, members).length) {
    throw new Error("Dezelfde waardetupel mag niet twee keer in één groep voorkomen.")
  }
  const body: {
    name: string
    dimensions: string[]
    members: Array<{ product_id: string; values: Record<string, string> }>
    note?: string
  } = { name, dimensions, members }
  const note = input.note?.trim()
  if (note) body.note = note
  return body
}

export function proposalBodyHasStatus(body: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(body, "status")
}
