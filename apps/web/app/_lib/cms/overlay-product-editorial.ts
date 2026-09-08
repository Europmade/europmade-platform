/**
 * @deprecated Prefer `resolveProductPage` / `resolveProductPresentation`.
 * Thin wrapper kept for any remaining callers.
 */

import type { StorefrontLocale } from "../i18n/locales"
import type { PdpDetail } from "../pdp-seed"
import {
  applyPresentationToDetail,
  resolveProductPresentation,
} from "./resolve-product-page"

/**
 * Overlay published CMS editorial onto Product Cloud PDP data.
 * Uses the same merge/resolve path as the live product page (template = null).
 */
export function overlayProductEditorial(
  detail: PdpDetail,
  editorial: unknown,
  locale: StorefrontLocale
): PdpDetail {
  const presentation = resolveProductPresentation(
    null,
    editorial,
    locale,
    detail
  )
  return applyPresentationToDetail(detail, presentation)
}
