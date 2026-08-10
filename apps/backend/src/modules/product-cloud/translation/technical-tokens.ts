/**
 * Preserve technical tokens (numbers, units, model codes) across MT (ADR-0039).
 */

const TOKEN_RE =
  /\b\d+(?:[.,]\d+)?\s?(?:m²|m2|cm|mm|kg|g|W|kW|V|Ah|mAh|GB|TB|GHz|MHz|%|€|\$)?\b|\b[A-Z]{1,5}-?\d{2,}[A-Z0-9-]*\b|\b\d{8,14}\b/g

export function extractTechnicalTokens(text: string): string[] {
  return text.match(TOKEN_RE) ?? []
}

/**
 * If the translation dropped any technical token from the source, reject it.
 * Returns null when OK, otherwise an error reason.
 */
export function validateTechnicalTokensPreserved(
  source: string,
  translated: string
): string | null {
  const tokens = extractTechnicalTokens(source)
  for (const token of tokens) {
    if (!translated.includes(token)) {
      // Allow minor whitespace differences around units
      const compact = token.replace(/\s+/g, "")
      const translatedCompact = translated.replace(/\s+/g, "")
      if (!translatedCompact.includes(compact)) {
        return `technical_token_missing:${token}`
      }
    }
  }
  return null
}
