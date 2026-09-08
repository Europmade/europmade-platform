import { resolveMediaUrl } from "@europmade/utils"
import { medusaBackendUrl } from "./medusa-backend-url"

/** Browser-loadable media URL for the current Admin hostname. */
export function displayMediaUrl(raw: string | null | undefined): string | null {
  return resolveMediaUrl(raw, medusaBackendUrl())
}
