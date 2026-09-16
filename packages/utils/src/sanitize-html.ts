/**
 * Minimal HTML sanitizer for CMS editorial description overlays.
 * Allowlist only — no script/style/event handlers.
 */

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "a",
  "h2",
  "h3",
  "h4",
  "blockquote",
])

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function sanitizeHref(href: string): string | null {
  const trimmed = href.trim()
  if (!trimmed) return null
  if (/^(https?:|mailto:|\/|#)/i.test(trimmed) && !/^\s*javascript:/i.test(trimmed)) {
    return trimmed
  }
  return null
}

/**
 * Sanitize a limited HTML subset for safe storefront rendering.
 * Unknown tags are stripped (contents kept). Disallowed attributes removed.
 */
export function sanitizeCmsHtml(html: string): string {
  if (!html || typeof html !== "string") return ""
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, "")
  // Remove script/style blocks entirely
  const withoutDanger = withoutComments
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*\/?\s*>/gi, "")

  return withoutDanger.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g,
    (full, rawName: string, rawAttrs: string) => {
      const name = rawName.toLowerCase()
      const isClose = full.startsWith("</")
      if (!ALLOWED_TAGS.has(name)) {
        return ""
      }
      if (isClose) return `</${name}>`
      if (name === "br") return "<br />"
      if (name === "a") {
        const hrefMatch = rawAttrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i)
        const rawHref = hrefMatch
          ? hrefMatch[2] ?? hrefMatch[3] ?? hrefMatch[4] ?? ""
          : ""
        const safe = sanitizeHref(rawHref)
        if (!safe) return ""
        return `<a href="${escapeText(safe)}" rel="noopener noreferrer">`
      }
      return `<${name}>`
    }
  )
}
