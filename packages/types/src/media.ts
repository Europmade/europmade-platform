/**
 * Centrale media-placement types voor uploadrichtlijnen.
 * Exacte pixelwaarden alleen waar codebase/specs die vastleggen.
 */

export type MediaTransparencyPolicy =
  | "required"
  | "recommended"
  | "allowed"
  | "capable"
  | "n/a"

export type MediaSizePx = {
  width: number
  height: number
}

/**
 * Placement keys — gedeeld door Admin CMS, seller, product, brand, banners.
 */
export type MediaPlacement =
  | "product_main"
  | "product_other"
  | "product_video"
  | "brand_logo"
  | "seller_logo"
  | "seller_storefront_banner"
  | "cms_banner"
  | "cms_action_banner"
  | "cms_site_logo"
  | "campaign_logo"
  | "homepage_hero"
  | "facility_photo"
  | "brand_story_photo"
  | "partner_document"
  | "commercial_nav_icon"

export type MediaRequirements = {
  placement: MediaPlacement
  /** Label key / short English label for tooling; UI localizes separately. */
  label: string
  recommendedSize?: MediaSizePx | null
  minSize?: MediaSizePx | null
  maxSize?: MediaSizePx | null
  /** e.g. "1:1", "4:1", "16:9" — null when only responsive/slot height exists */
  aspectRatio?: string | null
  /** Numeric ratio width/height when enforceable; null = do not enforce */
  aspectRatioValue?: number | null
  aspectRatioTolerance?: number
  maxBytes: number
  mimeTypes: string[]
  maxVideoDurationSec?: number | null
  videoResolution?: MediaSizePx | null
  transparency: MediaTransparencyPolicy
  notes?: string | null
  /** When true, width/height must meet minSize (or recommended as floor). */
  enforceDimensions?: boolean
  /** When true and aspectRatioValue set, enforce ratio. */
  enforceAspectRatio?: boolean
}
