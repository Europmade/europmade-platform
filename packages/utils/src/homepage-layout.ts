/**
 * Shared homepage content inset and section-title defaults.
 * Horizontal gutter is the same for every homepage block, including titles.
 */

export const HOMEPAGE_CONTENT_GUTTER = "px-4 tablet:px-8"

/** Homepage banner frame. Its visible height matches one Acties & thema's card. */
export const HOMEPAGE_BANNER_SLOT_CLASS = "em-home-banner-slot"
export const HOMEPAGE_BANNER_FRAME_CLASS = "em-home-banner"

/**
 * Card widths are 78%, 46% and (100% - 1.5rem) / 3. Media is 2.4:1.
 * Mobile and tablet use aspect-ratio so the banner height equals that card.
 * Desktop subtracts the two 12px gaps, so it uses the container width.
 */
export const HOMEPAGE_BANNER_HEIGHT_CSS = {
  mobile: "aspect-ratio: 2.4 / 0.78",
  tablet: "aspect-ratio: 2.4 / 0.46",
  desktop: "height: calc((100cqi - 1.5rem) / 3 / 2.4)",
} as const

const CAMPAIGN_CARD_ASPECT = 2.4
const ROOT_FONT_PX = 16

export type HomepageViewport = "mobile" | "tablet" | "desktop"

/** Visible height of one campaign card inside the shared content width. */
export function homepageCampaignCardHeight(
  contentWidthPx: number,
  viewport: HomepageViewport
): number {
  const cardWidth =
    viewport === "mobile"
      ? contentWidthPx * 0.78
      : viewport === "tablet"
        ? contentWidthPx * 0.46
        : (contentWidthPx - 1.5 * ROOT_FONT_PX) / 3
  return cardWidth / CAMPAIGN_CARD_ASPECT
}

/** Visible height of the homepage banner in the same content width. */
export function homepageBannerHeight(
  contentWidthPx: number,
  viewport: HomepageViewport
): number {
  if (viewport === "desktop") {
    return (contentWidthPx - 1.5 * ROOT_FONT_PX) / 3 / CAMPAIGN_CARD_ASPECT
  }
  if (viewport === "tablet") return contentWidthPx / (CAMPAIGN_CARD_ASPECT / 0.46)
  return contentWidthPx / (CAMPAIGN_CARD_ASPECT / 0.78)
}

/** A visible section keeps its heading when it has no cards yet. */
export function homepageSectionBody(itemCount: number): "cards" | "placeholder" {
  return itemCount > 0 ? "cards" : "placeholder"
}

export const SECTION_TITLE_COLOR = "#10396B"
/** Current mobile section title size (text-base). */
export const SECTION_TITLE_SIZE = 16
/** Current desktop section title size (tablet:text-lg). Used when no custom size is stored. */
export const SECTION_TITLE_SIZE_DESKTOP = 18

export type SectionTitleStyle = {
  color: string
  /** Exact pixel size. Null keeps the current 16px / 18px responsive titles. */
  fontSize: number | null
}

function hexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback
  const color = value.trim()
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : fallback
}

export function parseSectionTitleStyle(raw: unknown): SectionTitleStyle {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const size = Number(source.titleSize)
  return {
    color: hexColor(source.titleColor, SECTION_TITLE_COLOR),
    fontSize:
      Number.isFinite(size) && size > 0
        ? Math.min(40, Math.max(12, Math.round(size)))
        : null,
  }
}
