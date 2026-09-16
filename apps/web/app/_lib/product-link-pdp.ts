/**
 * Storefront PDP helpers for active Product Link Groups.
 * Members are standalone products; navigation uses real /product/{id} URLs.
 */

export type PdpProductLinkMember = {
  product_id: string
  product_title: string | null
  values: Record<string, string>
  image_url?: string | null
}

export type PdpProductLinkGroup = {
  id: string
  name: string
  dimensions: string[]
  members: PdpProductLinkMember[]
}

export function storefrontProductHref(productId: string): string {
  return `/product/${encodeURIComponent(productId)}`
}

export function shouldShowProductLinkSelector(
  group: PdpProductLinkGroup | null | undefined
): boolean {
  return Boolean(group && group.dimensions.length > 0 && group.members.length > 1)
}

export function currentLinkMember(
  group: PdpProductLinkGroup,
  productId: string
): PdpProductLinkMember | null {
  return group.members.find((m) => m.product_id === productId) ?? null
}

export function uniqueDimensionValues(
  group: PdpProductLinkGroup
): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const dim of group.dimensions) {
    const seen = new Set<string>()
    const values: string[] = []
    for (const member of group.members) {
      const value = (member.values[dim] || "").trim()
      if (!value || seen.has(value)) continue
      seen.add(value)
      values.push(value)
    }
    out[dim] = values
  }
  return out
}

export function memberMatchingValues(
  group: PdpProductLinkGroup,
  values: Record<string, string>
): PdpProductLinkMember | null {
  return (
    group.members.find((member) =>
      group.dimensions.every(
        (dim) => (member.values[dim] || "").trim() === (values[dim] || "").trim()
      )
    ) ?? null
  )
}

export type LinkDimensionOption = {
  dimension: string
  value: string
  selected: boolean
  available: boolean
  href: string | null
  product_id: string | null
  product_title: string | null
  image_url: string | null
}

export function optionsForDimension(
  group: PdpProductLinkGroup,
  currentProductId: string,
  dimension: string
): LinkDimensionOption[] {
  const current = currentLinkMember(group, currentProductId)
  const currentValues = current?.values || {}
  const unique = uniqueDimensionValues(group)[dimension] || []
  return unique.map((value) => {
    const candidate = { ...currentValues, [dimension]: value }
    const match = memberMatchingValues(group, candidate)
    const selected = (currentValues[dimension] || "").trim() === value
    return {
      dimension,
      value,
      selected,
      available: Boolean(match),
      href: match ? storefrontProductHref(match.product_id) : null,
      product_id: match?.product_id ?? null,
      product_title: match?.product_title ?? null,
      image_url: match?.image_url ?? null,
    }
  })
}
