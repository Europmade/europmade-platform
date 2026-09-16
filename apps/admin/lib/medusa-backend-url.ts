/**
 * Backend-URL for browser calls: same hostname as the Admin tab, port 9000.
 * Keep localhost vs 127.0.0.1 identical to the tab — rewriting hosts breaks
 * same-site session cookies and CORS for connect.sid.
 */
export function medusaBackendUrl(): string {
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location
    return `${protocol}//${hostname}:9000`
  }
  return process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
}

/** Storefront origin for CMS preview iframes (port 3000, same hostname). */
export function storefrontOrigin(): string {
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location
    return `${protocol}//${hostname}:3000`
  }
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_STOREFRONT_URL ??
    "http://localhost:3000"
  )
}
