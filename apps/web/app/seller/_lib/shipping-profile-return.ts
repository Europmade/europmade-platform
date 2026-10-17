/** Return to the same seller product and shipping step after creating a profile. */
export function shippingProfileReturnPath(
  returnTo: string | null | undefined,
  profileId: string
): string | null {
  if (!returnTo || !profileId) return null
  let url: URL
  try {
    url = new URL(returnTo, "http://localhost")
  } catch {
    return null
  }
  if (url.origin !== "http://localhost") return null
  if (!url.pathname.startsWith("/seller/products/")) return null
  if (url.pathname.includes("..")) return null
  url.searchParams.set("step", "shipping")
  url.searchParams.set("resume", "1")
  url.searchParams.set("profile", profileId)
  return `${url.pathname}${url.search}`
}
