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
  "img",
  "hr",
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

function alignment(rawAttrs: string): string {
  const match = rawAttrs.match(/text-align\s*:\s*(left|center|right)/i)
  return match ? ` style="text-align:${match[1].toLowerCase()}"` : ""
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
        const cta = /\bdata-em-cta\s*=\s*("1"|'1'|1)/i.test(rawAttrs)
        return `<a href="${escapeText(safe)}" rel="noopener noreferrer"${cta ? ' data-em-cta="1"' : ""}>`
      }
      if (name === "img") {
        const srcMatch = rawAttrs.match(/\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i)
        const rawSrc = srcMatch ? srcMatch[2] ?? srcMatch[3] ?? srcMatch[4] ?? "" : ""
        const safeSrc = sanitizeHref(rawSrc)
        if (!safeSrc || safeSrc.startsWith("mailto:") || safeSrc.startsWith("#")) return ""
        const altMatch = rawAttrs.match(/\balt\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i)
        const alt = altMatch ? altMatch[2] ?? altMatch[3] ?? altMatch[4] ?? "" : ""
        return `<img src="${escapeText(safeSrc)}" alt="${escapeText(alt)}" />`
      }
      if (name === "hr") return "<hr />"
      if (name === "p" || name === "h2" || name === "h3" || name === "h4") {
        return `<${name}${alignment(rawAttrs)}>`
      }
      return `<${name}>`
    }
  )
}
