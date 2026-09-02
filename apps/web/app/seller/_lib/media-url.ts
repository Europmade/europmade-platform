import { resolveMediaUrl } from "@europmade/utils"
import { medusaBackendUrl } from "../../_lib/medusa-backend-url"

/** Resolve Product Cloud storage references for seller UI img/src/href. */
export function resolveSellerMediaUrl(
  ref: string | null | undefined
): string {
  if (!ref) return ""
  return resolveMediaUrl(ref, medusaBackendUrl()) || ref
}
