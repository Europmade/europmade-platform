/** Same-hostname Medusa URL so localhost vs LAN session cookies stay same-site. */
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
