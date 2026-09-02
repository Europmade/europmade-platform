import { headers } from "next/headers"
import { backendOriginFromPageHost } from "@europmade/utils"
import { medusaBackendUrl } from "./medusa-backend-url"

/** Backend origin matching the storefront tab (localhost vs LAN). */
export async function getPageBackendOrigin(): Promise<string> {
  if (typeof window !== "undefined") {
    return medusaBackendUrl()
  }
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "http"
  const protocol = proto.includes(":") ? proto : `${proto}:`
  return backendOriginFromPageHost(host, protocol)
}
