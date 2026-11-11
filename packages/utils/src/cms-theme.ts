/**
 * Central CMS theme/design document (stored on cms_homepage document_key = "theme").
 * No free-form CSS — only safe, enumerated settings.
 */

import type { CategoryPreviewConceptProduct } from "./category-preview-concepts.ts"

export type CmsThemePreset = "standard" | "compact" | "modern" | "soft"

export type CmsButtonShape = "square" | "rounded" | "pill"

export type CmsThemeColors = {
  primary: string
  secondary: string
  accent: string
  background: string
  card: string
  text: string
  muted: string
  border: string
  cta: string
  link: string
  hover: string
}

/** Sitewide storefront header chrome (CMP-001). */
export type CmsThemeHeader = {
  /** Media URL or storage ref; null = default text wordmark. */
  logo: string | null
  /** Header bar background (hex). */
  backgroundColor: string
  logoHeight: number
  textColor: string
  navFontSize: number
  categoryColor: string
  categoryFontSize: number
  searchBackground: string
  searchText: string
  searchBorder: string
  searchHeight: number
  localeColor: string
  localeFontSize: number
  currencyColor: string
  currencyFontSize: number
  iconColor: string
  iconSize: number
}

export const HEADER_NAVY = "#10396B"
export const HEADER_WHITE = "#ffffff"

const LIGHT_HEADER_INK = {
  textColor: "#2c2c2c",
  categoryColor: "#4a4a4a",
  localeColor: "#4a4a4a",
  currencyColor: "#4a4a4a",
  iconColor: "#4a4a4a",
}

export type CmsThemeDocument = {
  preset: CmsThemePreset
  colors: CmsThemeColors
  buttons: {
    shape: CmsButtonShape
    radius: number
    style: "filled" | "outline"
  }
  cards: {
    border: boolean
    shadow: boolean
    radius: number
  }
  spacing: {
    section: "compact" | "normal" | "relaxed"
    contentWidth: "standard" | "wide"
  }
  typography: {
    headingWeight: "semibold" | "bold"
  }
  header: CmsThemeHeader
}

export const DEFAULT_CMS_HEADER: CmsThemeHeader = {
  logo: null,
  backgroundColor: HEADER_NAVY,
  logoHeight: 32,
  textColor: HEADER_WHITE,
  navFontSize: 13,
  categoryColor: HEADER_WHITE,
  categoryFontSize: 13,
  searchBackground: HEADER_WHITE,
  searchText: HEADER_NAVY,
  searchBorder: HEADER_WHITE,
  searchHeight: 40,
  localeColor: HEADER_WHITE,
  localeFontSize: 11,
  currencyColor: HEADER_WHITE,
  currencyFontSize: 11,
  iconColor: HEADER_WHITE,
  iconSize: 22,
}

export const CMS_THEME_PRESETS: Record<CmsThemePreset, Partial<CmsThemeDocument>> = {
  standard: {
    colors: {
      primary: "#151515",
      secondary: "#2c2c2c",
      accent: "#151515",
      background: "#f2f2f2",
      card: "#ffffff",
      text: "#2c2c2c",
      muted: "#666666",
      border: "#e4e4e4",
      cta: "#151515",
      link: "#0f2a4a",
      hover: "#2563eb",
    },
    buttons: { shape: "rounded", radius: 12, style: "filled" },
    cards: { border: true, shadow: true, radius: 12 },
    spacing: { section: "normal", contentWidth: "standard" },
    typography: { headingWeight: "bold" },
  },
  compact: {
    colors: {
      primary: "#151515",
      secondary: "#2c2c2c",
      accent: "#151515",
      background: "#f2f2f2",
      card: "#ffffff",
      text: "#2c2c2c",
      muted: "#666666",
      border: "#e4e4e4",
      cta: "#151515",
      link: "#151515",
      hover: "#2c2c2c",
    },
    buttons: { shape: "square", radius: 4, style: "filled" },
    cards: { border: true, shadow: false, radius: 4 },
    spacing: { section: "compact", contentWidth: "standard" },
    typography: { headingWeight: "semibold" },
  },
  modern: {
    colors: {
      primary: "#0f2a4a",
      secondary: "#1e3a5f",
      accent: "#2563eb",
      background: "#f3f5f8",
      card: "#ffffff",
      text: "#0f172a",
      muted: "#475569",
      border: "#dbe3ee",
      cta: "#0f2a4a",
      link: "#2563eb",
      hover: "#1d4ed8",
    },
    buttons: { shape: "rounded", radius: 8, style: "filled" },
    cards: { border: false, shadow: true, radius: 16 },
    spacing: { section: "relaxed", contentWidth: "wide" },
    typography: { headingWeight: "bold" },
  },
  soft: {
    colors: {
      primary: "#3f3a36",
      secondary: "#5c564f",
      accent: "#8b7355",
      background: "#f7f4ef",
      card: "#fffdfb",
      text: "#3f3a36",
      muted: "#6b645c",
      border: "#e8e2d9",
      cta: "#3f3a36",
      link: "#5c564f",
      hover: "#8b7355",
    },
    buttons: { shape: "pill", radius: 999, style: "filled" },
    cards: { border: true, shadow: false, radius: 20 },
    spacing: { section: "relaxed", contentWidth: "standard" },
    typography: { headingWeight: "semibold" },
  },
}

export function defaultCmsTheme(): CmsThemeDocument {
  return {
    preset: "standard",
    ...(CMS_THEME_PRESETS.standard as Omit<CmsThemeDocument, "preset" | "header">),
    header: { ...DEFAULT_CMS_HEADER },
  }
}

export function parseCmsTheme(raw: unknown): CmsThemeDocument {
  const base = defaultCmsTheme()
  if (!raw || typeof raw !== "object") return base
  const d = raw as Record<string, unknown>
  const colors = (d.colors ?? {}) as Record<string, unknown>
  const buttons = (d.buttons ?? {}) as Record<string, unknown>
  const cards = (d.cards ?? {}) as Record<string, unknown>
  const spacing = (d.spacing ?? {}) as Record<string, unknown>
  const typography = (d.typography ?? {}) as Record<string, unknown>
  const headerIn =
    d.header && typeof d.header === "object"
      ? (d.header as Record<string, unknown>)
      : {}
  const hex = (v: unknown, fallback: string) =>
    typeof v === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)
      ? v
      : fallback
  const shape = buttons.shape
  return {
    preset:
      d.preset === "compact" || d.preset === "modern" || d.preset === "soft"
        ? d.preset
        : "standard",
    colors: {
      primary: hex(colors.primary, base.colors.primary),
      secondary: hex(colors.secondary, base.colors.secondary),
      accent: hex(colors.accent, base.colors.accent),
      background: hex(colors.background, base.colors.background),
      card: hex(colors.card, base.colors.card),
      text: hex(colors.text, base.colors.text),
      muted: hex(colors.muted, base.colors.muted),
      border: hex(colors.border, base.colors.border),
      cta: hex(colors.cta, base.colors.cta),
      link: hex(colors.link, base.colors.link),
      hover: hex(colors.hover, base.colors.hover),
    },
    buttons: {
      shape:
        shape === "square" || shape === "pill" || shape === "rounded"
          ? shape
          : base.buttons.shape,
      radius: Number.isFinite(Number(buttons.radius))
        ? Math.min(48, Math.max(0, Number(buttons.radius)))
        : base.buttons.radius,
      style: buttons.style === "outline" ? "outline" : "filled",
    },
    cards: {
      border: cards.border !== false,
      shadow: cards.shadow !== false,
      radius: Number.isFinite(Number(cards.radius))
        ? Math.min(32, Math.max(0, Number(cards.radius)))
        : base.cards.radius,
    },
    spacing: {
      section:
        spacing.section === "compact" || spacing.section === "relaxed"
          ? spacing.section
          : "normal",
      contentWidth: spacing.contentWidth === "wide" ? "wide" : "standard",
    },
    typography: {
      headingWeight: typography.headingWeight === "semibold" ? "semibold" : "bold",
    },
    header: parseCmsHeader(headerIn, base.header, hex),
  }
}

function isDarkHex(color: string): boolean {
  const raw = color.replace("#", "")
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw
  const red = Number.parseInt(full.slice(0, 2), 16)
  const green = Number.parseInt(full.slice(2, 4), 16)
  const blue = Number.parseInt(full.slice(4, 6), 16)
  if (![red, green, blue].every(Number.isFinite)) return false
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255 < 0.55
}

function px(value: unknown, fallback: number, min: number, max: number): number {
  const next = Number(value)
  if (!Number.isFinite(next)) return fallback
  return Math.min(max, Math.max(min, Math.round(next)))
}

export function parseCmsHeader(
  headerIn: Record<string, unknown>,
  base: CmsThemeHeader = DEFAULT_CMS_HEADER,
  hex: (value: unknown, fallback: string) => string = (value, fallback) =>
    typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
      ? value
      : fallback
): CmsThemeHeader {
  const backgroundColor = hex(headerIn.backgroundColor, base.backgroundColor)
  const ink = isDarkHex(backgroundColor) ? null : LIGHT_HEADER_INK
  return {
    logo:
      typeof headerIn.logo === "string" && headerIn.logo.trim()
        ? headerIn.logo.trim()
        : null,
    backgroundColor,
    logoHeight: px(headerIn.logoHeight, base.logoHeight, 20, 72),
    textColor: hex(headerIn.textColor, ink?.textColor ?? base.textColor),
    navFontSize: px(headerIn.navFontSize, base.navFontSize, 10, 24),
    categoryColor: hex(
      headerIn.categoryColor,
      ink?.categoryColor ?? base.categoryColor
    ),
    categoryFontSize: px(headerIn.categoryFontSize, base.categoryFontSize, 10, 24),
    searchBackground: hex(headerIn.searchBackground, base.searchBackground),
    searchText: hex(headerIn.searchText, base.searchText),
    searchBorder: hex(
      headerIn.searchBorder,
      isDarkHex(backgroundColor) ? base.searchBorder : "#4a4a4a"
    ),
    searchHeight: px(headerIn.searchHeight, base.searchHeight, 32, 64),
    localeColor: hex(headerIn.localeColor, ink?.localeColor ?? base.localeColor),
    localeFontSize: px(headerIn.localeFontSize, base.localeFontSize, 10, 20),
    currencyColor: hex(
      headerIn.currencyColor,
      ink?.currencyColor ?? base.currencyColor
    ),
    currencyFontSize: px(
      headerIn.currencyFontSize,
      base.currencyFontSize,
      10,
      20
    ),
    iconColor: hex(headerIn.iconColor, ink?.iconColor ?? base.iconColor),
    iconSize: px(headerIn.iconSize, base.iconSize, 16, 40),
  }
}

const LIGHT_INK_COLORS = new Set([
  LIGHT_HEADER_INK.textColor,
  LIGHT_HEADER_INK.categoryColor,
  LIGHT_HEADER_INK.localeColor,
  LIGHT_HEADER_INK.currencyColor,
  LIGHT_HEADER_INK.iconColor,
])

function sameHex(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/**
 * When the editor switches the bar between light and dark, flip only the
 * ink colors that still match the previous default. Custom colors stay.
 * Search-field colors are independent and are not changed.
 */
export function headerWithBackground(
  header: CmsThemeHeader,
  backgroundColor: string
): CmsThemeHeader {
  const next = { ...header, backgroundColor }
  const wasDark = isDarkHex(header.backgroundColor)
  const nowDark = isDarkHex(backgroundColor)
  if (wasDark === nowDark) return next
  const flip = (
    current: string,
    light: string,
    dark: string
  ): string => {
    if (nowDark && (sameHex(current, light) || LIGHT_INK_COLORS.has(current.toLowerCase()))) {
      return dark
    }
    if (!nowDark && sameHex(current, dark)) return light
    return current
  }
  next.textColor = flip(header.textColor, LIGHT_HEADER_INK.textColor, HEADER_WHITE)
  next.categoryColor = flip(
    header.categoryColor,
    LIGHT_HEADER_INK.categoryColor,
    HEADER_WHITE
  )
  next.localeColor = flip(
    header.localeColor,
    LIGHT_HEADER_INK.localeColor,
    HEADER_WHITE
  )
  next.currencyColor = flip(
    header.currencyColor,
    LIGHT_HEADER_INK.currencyColor,
    HEADER_WHITE
  )
  next.iconColor = flip(header.iconColor, LIGHT_HEADER_INK.iconColor, HEADER_WHITE)
  return next
}

export function applyCmsThemePreset(
  preset: CmsThemePreset,
  current: CmsThemeDocument
): CmsThemeDocument {
  const patch = CMS_THEME_PRESETS[preset]
  return parseCmsTheme({
    ...current,
    ...patch,
    preset,
    colors: { ...current.colors, ...patch.colors },
    buttons: { ...current.buttons, ...patch.buttons },
    cards: { ...current.cards, ...patch.cards },
    spacing: { ...current.spacing, ...patch.spacing },
    typography: { ...current.typography, ...patch.typography },
    header: current.header,
  })
}

export function cmsThemeToCss(theme: CmsThemeDocument): string {
  const radius =
    theme.buttons.shape === "pill"
      ? "999px"
      : theme.buttons.shape === "square"
        ? "0px"
        : `${theme.buttons.radius}px`
  const cardShadow = theme.cards.shadow
    ? "0 8px 24px rgba(15,23,42,0.06)"
    : "none"
  const cardBorder = theme.cards.border
    ? `1px solid ${theme.colors.border}`
    : "1px solid transparent"
  const sectionPadY =
    theme.spacing.section === "compact"
      ? "0.65rem"
      : theme.spacing.section === "relaxed"
        ? "1.35rem"
        : "0.9rem"
  const maxW = theme.spacing.contentWidth === "wide" ? "1280px" : "1160px"
  const headingW = theme.typography.headingWeight === "semibold" ? "600" : "700"
  return `
.em-cms-theme {
  --wf-900: ${theme.colors.primary};
  --wf-800: ${theme.colors.secondary};
  --wf-100: ${theme.colors.background};
  --wf-200: ${theme.colors.border};
  --em-cta: ${theme.colors.cta};
  --em-accent: ${theme.colors.accent};
  --em-text: ${theme.colors.text};
  --em-muted: ${theme.colors.muted};
  --em-card: ${theme.colors.card};
  --em-link: ${theme.colors.link};
  --em-hover: ${theme.colors.hover};
  --em-header-bg: ${theme.header.backgroundColor};
  --em-header-text: ${theme.header.textColor};
  --em-header-icon: ${theme.header.iconColor};
  --em-header-icon-size: ${theme.header.iconSize}px;
  --em-header-nav-size: ${theme.header.navFontSize}px;
  --em-header-category: ${theme.header.categoryColor};
  --em-header-category-size: ${theme.header.categoryFontSize}px;
  --em-header-search-bg: ${theme.header.searchBackground};
  --em-header-search-text: ${theme.header.searchText};
  --em-header-search-border: ${theme.header.searchBorder};
  --em-header-search-h: ${theme.header.searchHeight}px;
  --em-header-locale: ${theme.header.localeColor};
  --em-header-locale-size: ${theme.header.localeFontSize}px;
  --em-header-currency: ${theme.header.currencyColor};
  --em-header-currency-size: ${theme.header.currencyFontSize}px;
  --em-header-logo-h: ${theme.header.logoHeight}px;
  --em-radius: ${radius};
  --em-card-radius: ${theme.cards.radius}px;
  color: ${theme.colors.text};
  background: ${theme.colors.background};
}
.em-cms-theme [data-em-header="chrome"] {
  background-color: ${theme.header.backgroundColor};
  color: ${theme.header.textColor};
}
.em-cms-theme [data-em-header="chrome"] a.em-header-logo {
  color: var(--em-header-text);
}
.em-cms-theme [data-em-header="chrome"] .em-header-nav,
.em-cms-theme [data-em-header="chrome"] .em-header-nav a {
  color: var(--em-header-text);
  font-size: var(--em-header-nav-size);
}
.em-cms-theme [data-em-header="chrome"] .em-header-icon {
  color: var(--em-header-icon);
  border-color: var(--em-header-icon);
  width: var(--em-header-icon-size);
  height: var(--em-header-icon-size);
}
.em-cms-theme [data-em-header="chrome"] a.em-header-category,
.em-cms-theme [data-em-header="chrome"] .em-header-category {
  color: var(--em-header-category);
  font-size: var(--em-header-category-size);
}
.em-cms-theme [data-em-header="chrome"] .em-header-locale {
  color: var(--em-header-locale);
  font-size: var(--em-header-locale-size);
}
.em-cms-theme [data-em-header="chrome"] .em-header-currency {
  color: var(--em-header-currency);
  font-size: var(--em-header-currency-size);
}
.em-cms-theme [data-em-header="chrome"] [data-em-header-menu],
.em-cms-theme [data-em-header="chrome"] [data-em-header-menu] a,
.em-cms-theme [data-em-header="chrome"] [data-em-category-panel],
.em-cms-theme [data-em-header="chrome"] [data-em-category-panel] a,
.em-cms-theme [data-em-header="chrome"] [data-em-category-panel] button {
  color: #151515;
  font-size: 13px;
}
.em-cms-theme a:not(.bg-wf-900) {
  color: ${theme.colors.link};
}
.em-cms-theme a:not(.bg-wf-900):hover {
  color: ${theme.colors.hover};
}
.em-cms-theme .em-cms-frame {
  max-width: ${maxW};
  background: ${theme.colors.card};
  border-color: ${theme.colors.border};
}
.em-cms-theme h1, .em-cms-theme h2, .em-cms-theme h3 {
  font-weight: ${headingW};
  color: ${theme.colors.primary};
}
.em-cms-theme .bg-wf-900,
.em-cms-theme a.bg-wf-900,
.em-cms-theme button.bg-wf-900 {
  background-color: ${theme.colors.cta} !important;
  border-radius: ${radius} !important;
}
.em-cms-theme a.rounded-xl,
.em-cms-theme button.rounded-xl,
.em-cms-theme a.rounded-2xl {
  border-radius: ${radius} !important;
}
.em-cms-theme article.rounded-xl,
.em-cms-theme .rounded-xl.border {
  border-radius: var(--em-card-radius) !important;
  box-shadow: ${cardShadow};
  border: ${cardBorder};
  background: ${theme.colors.card};
}
.em-cms-theme .em-home-section {
  padding-top: ${sectionPadY};
  padding-bottom: ${sectionPadY};
}
`
}

export const CMS_PREVIEW_SOURCE = "europmade-cms-preview"

export type CmsPreviewKind =
  | "homepage"
  | "category"
  | "product"
  | "page"
  | "theme"

export type CmsPreviewDraftMessage = {
  source: typeof CMS_PREVIEW_SOURCE
  type: "draft"
  kind: CmsPreviewKind
  locale: "nl" | "en" | "de" | "fr"
  selectedId: string
  theme: CmsThemeDocument | null
  document?: unknown
  /** Global product template document (for product override preview). */
  templateDocument?: unknown
  banners?: unknown[]
  paidSlots?: unknown[]
  slug?: string
  /** Present only on the admin draft preview message. Never a public catalog. */
  previewProducts?: CategoryPreviewConceptProduct[]
}

export type CmsPreviewSelectMessage = {
  source: typeof CMS_PREVIEW_SOURCE
  type: "select"
  selectedId: string
}

export type CmsPreviewReadyMessage = {
  source: typeof CMS_PREVIEW_SOURCE
  type: "ready"
}
