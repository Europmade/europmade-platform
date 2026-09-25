/**
 * Pure helpers: which central Product Cloud fields may be gap-filled by an offer seller
 * without overwriting existing values (those require change proposals).
 */

export function isBlankCatalogText(value: string | null | undefined): boolean {
  if (value == null) return true
  const trimmed = String(value).trim()
  return trimmed.length === 0 || trimmed === "[]"
}

export type InformationGapFields = {
  title?: string
  description?: string
  brand_id?: string
  manufacturer_id?: string
}

export function buildInformationGapFill(input: {
  current: {
    title?: string | null
    description?: string | null
    brand_id?: string | null
    manufacturer_id?: string | null
  }
  proposed: InformationGapFields
}): { fill: InformationGapFields; rejected_occupied: string[] } {
  const fill: InformationGapFields = {}
  const rejected_occupied: string[] = []

  if (input.proposed.title !== undefined) {
    if (isBlankCatalogText(input.current.title)) {
      fill.title = input.proposed.title
    } else {
      rejected_occupied.push("title")
    }
  }
  if (input.proposed.description !== undefined) {
    if (isBlankCatalogText(input.current.description)) {
      fill.description = input.proposed.description
    } else {
      rejected_occupied.push("description")
    }
  }
  if (input.proposed.brand_id !== undefined) {
    if (isBlankCatalogText(input.current.brand_id)) {
      fill.brand_id = input.proposed.brand_id
    } else {
      rejected_occupied.push("brand_id")
    }
  }
  if (input.proposed.manufacturer_id !== undefined) {
    if (isBlankCatalogText(input.current.manufacturer_id)) {
      fill.manufacturer_id = input.proposed.manufacturer_id
    } else {
      rejected_occupied.push("manufacturer_id")
    }
  }

  return { fill, rejected_occupied }
}

export function catalogGapsFromCurrent(current: {
  title?: string | null
  description?: string | null
  brand_id?: string | null
  manufacturer_id?: string | null
}): {
  title: boolean
  description: boolean
  brand_id: boolean
  manufacturer_id: boolean
} {
  return {
    title: isBlankCatalogText(current.title),
    description: isBlankCatalogText(current.description),
    brand_id: isBlankCatalogText(current.brand_id),
    manufacturer_id: isBlankCatalogText(current.manufacturer_id),
  }
}
