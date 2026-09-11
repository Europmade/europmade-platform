import type { MedusaRequest } from "@medusajs/framework/http"
import { backendOriginFromPageHost } from "@europmade/utils"

/** Origin of this API process (Host is :9000). Used when rewriting for API clients. */
export function requestBackendOrigin(req: MedusaRequest): string {
  const protoRaw = req.headers["x-forwarded-proto"]
  const proto =
    (Array.isArray(protoRaw) ? protoRaw[0] : protoRaw)?.split(",")[0]?.trim() ||
    "http"
  const hostRaw = req.headers["x-forwarded-host"] ?? req.headers.host
  const host = (Array.isArray(hostRaw) ? hostRaw[0] : hostRaw) ?? "localhost:9000"
  const protocol = proto.includes("://") ? proto : `${proto}:`
  return backendOriginFromPageHost(String(host), protocol.endsWith(":") ? protocol : `${protocol}:`)
}
