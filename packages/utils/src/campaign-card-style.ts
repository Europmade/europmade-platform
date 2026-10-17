/**
 * Homepage campaign card overlay.
 * Missing fields keep the current images, copy and a readable left-aligned layout.
 */

import { parseHeroCtaStyle, type HeroCtaStyle } from "./hero-banner-style"
import { parseBrandCardPresentation } from "./storefront-presentation"

export type CampaignAlign = "left" | "center" | "right"
export type CampaignVertical = "top" | "center" | "bottom"
export type CampaignOverlay = "none" | "light" | "dark"

export type CampaignCardStyle = {
  logo: string | null
  logoWidth: number
  horizontal: CampaignAlign
  vertical: CampaignVertical
  textAlign: CampaignAlign
  titleColor: string
  descriptionColor: string
  cta: HeroCtaStyle
  overlay: CampaignOverlay
  /** When false the button is hidden and the whole card is the only link. */
  showCta: boolean
}

/** Campaign slider frame. Widths and 2.4:1 ratio stay fixed. */
export const CAMPAIGN_CARD_FRAME_CLASS =
  "group/card relative w-[78%] shrink-0 overflow-hidden rounded-2xl border border-wf-200 bg-wf-100 shadow-sm transition hover:-translate-y-0.5 hover:border-wf-300 hover:shadow-md tablet:w-[46%] desktop:w-[calc((100%-1.5rem)/3)]"

export const CAMPAIGN_CARD_MEDIA_CLASS = "relative aspect-[2.4/1] w-full"

/** Featured-brand grid. Columns and 3.4:1 ratio stay fixed. */
export const BRAND_SPOTLIGHT_GRID_CLASS =
  "grid grid-cols-1 gap-3 tablet:grid-cols-2 desktop:grid-cols-3"

export const BRAND_SPOTLIGHT_FRAME_CLASS =
  "group relative aspect-[3.4/1] overflow-hidden rounded-2xl border border-wf-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"

const TITLE = "#151515"
const DESCRIPTION = "#4a4a4a"

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function hexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback
  const color = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(color) || /^#[0-9a-fA-F]{3}$/.test(color)) {
    return color
  }
  return fallback
}

function align(value: unknown, fallback: CampaignAlign): CampaignAlign {
  return value === "left" || value === "center" || value === "right" ? value : fallback
}

function vertical(value: unknown): CampaignVertical {
  return value === "top" || value === "center" || value === "bottom" ? value : "center"
}

function overlay(value: unknown): CampaignOverlay {
  return value === "none" || value === "light" || value === "dark" ? value : "light"
}

export function defaultCampaignCardStyle(): CampaignCardStyle {
  return {
    logo: null,
    logoWidth: 120,
    horizontal: "left",
    vertical: "center",
    textAlign: "left",
    titleColor: TITLE,
    descriptionColor: DESCRIPTION,
    cta: parseHeroCtaStyle(undefined, "primary", "black"),
    overlay: "light",
    showCta: true,
  }
}

/** One destination for the card. A blank value is not a link. */
export function singleCardHref(href: string | null | undefined): string | null {
  const value = typeof href === "string" ? href.trim() : ""
  return value || null
}

/**
 * Brand cards open the explicit link, or /merk/{slug} when that link is empty.
 * Without either, the card is not clickable.
 */
export function brandSpotlightHref(input: {
  href?: string | null
  slug?: string | null
}): string | null {
  const explicit = singleCardHref(input.href)
  if (explicit) return explicit
  const slug = typeof input.slug === "string" ? input.slug.trim() : ""
  return slug ? `/merk/${slug}` : null
}

/** The visible button is optional. The card itself stays the only link. */
export function cardShowsButton(
  card: Pick<CampaignCardStyle, "showCta">,
  label: string | null | undefined
): boolean {
  return card.showCta !== false && Boolean(label && label.trim())
}

/**
 * Editor defaults for a brand card that has no saved overlay yet.
 * The button stays hidden so the current full-card link remains the only control.
 */
export function brandCardStyleFromLegacy(raw: unknown): CampaignCardStyle {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  if (source.card && typeof source.card === "object") {
    return parseCampaignCardStyle(source.card)
  }
  const presentation = parseBrandCardPresentation(source)
  const logo =
    typeof source.logo === "string" && source.logo.trim() ? source.logo : null
  return parseCampaignCardStyle({
    logo,
    logoWidth: presentation.logoSize,
    horizontal: presentation.logoPosition,
    vertical: "center",
    textAlign: presentation.logoPosition,
    titleColor: presentation.textColor,
    descriptionColor: presentation.textColor,
    overlay: presentation.overlayStrength <= 8 ? "none" : "light",
    showCta: false,
  })
}

export function parseCampaignCardStyle(raw: unknown): CampaignCardStyle {
  const base = defaultCampaignCardStyle()
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null
  if (!source) return base
  const logo = typeof source.logo === "string" && source.logo.trim() ? source.logo : null
  return {
    logo,
    logoWidth: clamp(Number(source.logoWidth ?? base.logoWidth), 48, 220),
    horizontal: align(source.horizontal, "left"),
    vertical: vertical(source.vertical),
    textAlign: align(source.textAlign, "left"),
    titleColor: hexColor(source.titleColor, TITLE),
    descriptionColor: hexColor(source.descriptionColor, DESCRIPTION),
    cta: parseHeroCtaStyle(source.cta, "primary", "black"),
    overlay: overlay(source.overlay),
    showCta: source.showCta === false ? false : base.showCta,
  }
}
