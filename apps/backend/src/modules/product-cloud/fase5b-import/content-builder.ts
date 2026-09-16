import type { Fase5bContentRow } from "./excel-loader"

export function buildProductDescription(
  content: Fase5bContentRow | undefined,
  fallbackTitle: string
): string {
  if (!content) return fallbackTitle

  const parts: string[] = []
  if (content.lange_beschrijving.trim()) {
    parts.push(content.lange_beschrijving.trim())
  } else if (content.korte_beschrijving.trim()) {
    parts.push(content.korte_beschrijving.trim())
  }

  if (content.usps.trim()) {
    parts.push(`\n\nUSP's:\n${content.usps.trim()}`)
  }

  if (content.specificaties.trim()) {
    parts.push(`\n\nSpecificaties:\n${content.specificaties.trim()}`)
  }

  const joined = parts.join("").trim()
  return joined || fallbackTitle
}

export function hasRichContent(content: Fase5bContentRow | undefined): boolean {
  if (!content) return false
  return Boolean(
    content.lange_beschrijving.trim() ||
      content.specificaties.trim() ||
      content.usps.trim()
  )
}
