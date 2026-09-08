/** Max length for CMS product intro (plain text, word-safe truncate). */
export const CMS_PRODUCT_INTRO_MAX_CHARS = 320

/** Strip tags/entities to plain text for CMS intro fields. */
export function stripHtmlToPlainText(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Truncate plain text at the last full word within maxChars.
 * Never cuts mid-word when there is at least one complete word.
 */
export function truncateAtWordBoundary(
  input: string,
  maxChars: number = CMS_PRODUCT_INTRO_MAX_CHARS
): string {
  const text = stripHtmlToPlainText(input)
  if (text.length <= maxChars) return text
  const slice = text.slice(0, maxChars)
  const lastSpace = slice.lastIndexOf(" ")
  if (lastSpace <= 0) return slice.trimEnd()
  return slice.slice(0, lastSpace).trimEnd()
}
