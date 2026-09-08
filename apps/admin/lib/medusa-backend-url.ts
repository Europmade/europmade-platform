/**
 * Backend-URL for browser calls: same hostname as the Admin tab, port 9000.
 * Calling a LAN IP from localhost:3001 is cross-site and session cookies fail.
 */
export function medusaBackendUrl(): string {
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//localhost:9000`
    }
    return `${protocol}//${hostname}:9000`
  }
  return process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
}

/** Storefront origin for CMS preview iframes (port 3000, same hostname). */
export function storefrontOrigin(): string {
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//localhost:3000`
    }
    return `${protocol}//${hostname}:3000`
  }
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_STOREFRONT_URL ??
    "http://localhost:3000"
  )
}
