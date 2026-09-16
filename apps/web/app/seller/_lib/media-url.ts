import {
  resolveMediaUrl,
  resolveOptimizedImageUrl,
} from "@europmade/utils"
import { medusaBackendUrl } from "../../_lib/medusa-backend-url"

/**
 * Resolve Product Cloud storage references for seller UI img/src/href.
 * When metadata with variants is present, prefer the optimized delivery URL.
 */
export function resolveSellerMediaUrl(
  ref: string | null | undefined,
  metadata?: unknown
): string {
  if (!ref && !metadata) return ""
  const origin = medusaBackendUrl()
  if (metadata != null) {
    return resolveOptimizedImageUrl(ref, metadata, origin) || ""
  }
  if (!ref) return ""
  return resolveMediaUrl(ref, origin) || ref
}
