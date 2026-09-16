/**
 * Build a carrier Track & Trace URL when none is stored explicitly.
 */

const TEMPLATES: Record<string, (code: string) => string> = {
  postnl: (code) =>
    `https://jouw.postnl.nl/track-and-trace/${encodeURIComponent(code)}`,
  "post nl": (code) =>
    `https://jouw.postnl.nl/track-and-trace/${encodeURIComponent(code)}`,
  dhl: (code) =>
    `https://www.dhl.com/nl-nl/home/tracking/tracking-parcel.html?submit=1&tracking-id=${encodeURIComponent(code)}`,
  dpd: (code) =>
    `https://tracking.dpd.de/status/nl_NL/parcel/${encodeURIComponent(code)}`,
  ups: (code) =>
    `https://www.ups.com/track?tracknum=${encodeURIComponent(code)}`,
  gls: (code) =>
    `https://gls-group.eu/track/${encodeURIComponent(code)}`,
  bpost: (code) =>
    `https://track.bpost.cloud/btr/web/#/search?itemCode=${encodeURIComponent(code)}`,
}

export function buildTrackingUrl(
  carrier: string | null | undefined,
  trackingCode: string | null | undefined,
  explicitUrl?: string | null
): string | null {
  if (explicitUrl?.trim()) return explicitUrl.trim()
  const code = trackingCode?.trim()
  if (!code) return null
  const key = (carrier ?? "").trim().toLowerCase()
  if (!key) return null
  const builder = TEMPLATES[key]
  if (!builder) {
    // fuzzy: carrier contains known name
    for (const [name, fn] of Object.entries(TEMPLATES)) {
      if (key.includes(name)) return fn(code)
    }
    return null
  }
  return builder(code)
}
