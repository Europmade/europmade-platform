/**
 * Left homepage-hero text and CTA styles.
 * Missing fields keep the colours the storefront already renders.
 */

export const EUROPMADE_BLUE = "#0f2a4a"

export type HeroTextPreset = "white" | "black" | "custom"

export type HeroTextStyle = {
  preset: HeroTextPreset
  color: string
}

export type HeroCtaPreset = "white" | "transparent" | "black" | "custom"

export type HeroCtaStyle = {
  preset: HeroCtaPreset
  background: string
  text: string
  border: string
  borderWidth: number
  radius: number
  transparent: boolean
}

const TITLE_BLACK = "#151515"
const SUBTITLE_BLACK = "#666666"
const TRUST_BLACK = "#4a4a4a"

export const HERO_CTA_PRESETS: Record<
  Exclude<HeroCtaPreset, "custom">,
  Omit<HeroCtaStyle, "preset">
> = {
  white: {
    background: "#ffffff",
    text: EUROPMADE_BLUE,
    border: "#ffffff",
    borderWidth: 0,
    radius: 8,
    transparent: false,
  },
  transparent: {
    background: "transparent",
    text: "#ffffff",
    border: "#ffffff",
    borderWidth: 1,
    radius: 8,
    transparent: true,
  },
  black: {
    background: "#151515",
    text: "#ffffff",
    border: "#151515",
    borderWidth: 0,
    radius: 8,
    transparent: false,
  },
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function isHeroWhiteColor(color: string): boolean {
  const value = color.trim().toLowerCase()
  return value === "#fff" || value === "#ffffff" || value === "white"
}

function hexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback
  const color = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(color) || /^#[0-9a-fA-F]{3}$/.test(color)) {
    return color
  }
  return fallback
}

function textPreset(value: unknown): HeroTextPreset | null {
  return value === "white" || value === "black" || value === "custom" ? value : null
}

function ctaPreset(value: unknown): HeroCtaPreset | null {
  return value === "white" ||
    value === "transparent" ||
    value === "black" ||
    value === "custom"
    ? value
    : null
}

export function heroTextPresetColor(
  preset: Exclude<HeroTextPreset, "custom">,
  role: "title" | "subtitle"
): string {
  if (preset === "white") return "#ffffff"
  return role === "subtitle" ? SUBTITLE_BLACK : TITLE_BLACK
}

export function parseHeroTextStyle(
  raw: unknown,
  legacyTone: unknown,
  role: "title" | "subtitle"
): HeroTextStyle {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null
  const legacy = legacyHeroTextStyle(legacyTone, role)
  if (!source) return legacy

  const preset = textPreset(source.preset)
  if (preset === "white" || preset === "black") {
    return { preset, color: heroTextPresetColor(preset, role) }
  }
  return {
    preset: "custom",
    color: hexColor(source.color, legacy.color),
  }
}

function legacyHeroTextStyle(
  legacyTone: unknown,
  role: "title" | "subtitle"
): HeroTextStyle {
  if (legacyTone === "white") {
    return { preset: "white", color: "#ffffff" }
  }
  if (role === "subtitle") {
    return { preset: "custom", color: SUBTITLE_BLACK }
  }
  return { preset: "black", color: TITLE_BLACK }
}

export function legacyHeroCtaStyle(
  which: "primary" | "secondary",
  buttonColor: unknown
): HeroCtaStyle {
  const lightButtons = buttonColor === "white"
  if (which === "primary") {
    return lightButtons
      ? { preset: "transparent", ...HERO_CTA_PRESETS.transparent }
      : { preset: "black", ...HERO_CTA_PRESETS.black }
  }
  if (lightButtons) {
    return {
      preset: "custom",
      background: "#ffffff",
      text: TITLE_BLACK,
      border: "#ffffff",
      borderWidth: 0,
      radius: 8,
      transparent: false,
    }
  }
  return {
    preset: "custom",
    background: "#ffffff",
    text: "#2c2c2c",
    border: "#cccccc",
    borderWidth: 1,
    radius: 8,
    transparent: false,
  }
}

export function parseHeroCtaStyle(
  raw: unknown,
  which: "primary" | "secondary",
  buttonColor: unknown
): HeroCtaStyle {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null
  const fallback = legacyHeroCtaStyle(which, buttonColor)
  if (!source) return fallback

  const preset = ctaPreset(source.preset)
  if (preset && preset !== "custom") {
    return { preset, ...HERO_CTA_PRESETS[preset] }
  }

  const transparent = source.transparent === true
  return {
    preset: "custom",
    background: transparent
      ? "transparent"
      : hexColor(source.background, fallback.background),
    text: hexColor(source.text, fallback.text),
    border: hexColor(source.border, fallback.border),
    borderWidth: clamp(Number(source.borderWidth ?? fallback.borderWidth), 0, 8),
    radius: clamp(Number(source.radius ?? fallback.radius), 0, 32),
    transparent,
  }
}

export function heroCtaPreset(preset: Exclude<HeroCtaPreset, "custom">): HeroCtaStyle {
  return { preset, ...HERO_CTA_PRESETS[preset] }
}

export function heroTrustColor(title: HeroTextStyle): string {
  return isHeroWhiteColor(title.color) ? "#ffffff" : TRUST_BLACK
}

export function heroCtaInlineStyle(style: HeroCtaStyle): {
  backgroundColor: string
  color: string
  borderColor: string
  borderStyle: "solid"
  borderWidth: string
  borderRadius: string
} {
  return {
    backgroundColor: style.transparent ? "transparent" : style.background,
    color: style.text,
    borderColor: style.border,
    borderStyle: "solid",
    borderWidth: `${style.borderWidth}px`,
    borderRadius: `${style.radius}px`,
  }
}
