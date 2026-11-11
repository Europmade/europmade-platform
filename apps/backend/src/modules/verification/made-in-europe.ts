/**
 * EuropMade Made in Europe score — vaste criteria (Sprint 8).
 * Stabiele IDs; geen handmatige score-invoer door sellers.
 *
 * EU-landenlijst: één bron in @europmade/types (EU_MARKET_CODES).
 */

import {
  EU_MARKET_CODES,
  isEuMarketCode,
  type EuMarketCode,
} from "@europmade/types"

export const ASSEMBLY_EU_BANDS = [
  "eu_100",
  "eu_75_99",
  "eu_50_74",
  "eu_below_50",
] as const

export const PARTS_EU_LEVELS = [
  "eu_majority",
  "eu_partial",
  "eu_none",
] as const

export const MATERIALS_EU_LEVELS = [
  "eu_majority",
  "eu_partial",
  "eu_none",
] as const

export type AssemblyEuBand = (typeof ASSEMBLY_EU_BANDS)[number]
export type PartsEuLevel = (typeof PARTS_EU_LEVELS)[number]
export type MaterialsEuLevel = (typeof MATERIALS_EU_LEVELS)[number]

/** Alias van centrale EU_MARKET_CODES (CMS + MiE). */
export const EU_COUNTRY_CODES = EU_MARKET_CODES
export type { EuMarketCode }
export type EuCountryCode = EuMarketCode
export { isEuMarketCode }

export function isEuCountryCode(code: string | null | undefined): boolean {
  return isEuMarketCode(code)
}

export type MadeInEuropeInput = {
  assembly_eu_band: AssemblyEuBand
  parts_eu_level: PartsEuLevel
  materials_eu_level: MaterialsEuLevel
  primary_assembly_country?: string | null
}

export type MadeInEuropeScore = {
  is_made_in_europe: boolean
  /** 0–100 when eligible; null when not Made in Europe */
  score: number | null
  assembly_points: number
  parts_points: number
  materials_points: number
  max_assembly: 75
  max_parts: 15
  max_materials: 10
  assembly_eu_band: AssemblyEuBand
  parts_eu_level: PartsEuLevel
  materials_eu_level: MaterialsEuLevel
  primary_assembly_country: string | null
}

const ASSEMBLY_POINTS: Record<AssemblyEuBand, number> = {
  eu_100: 75,
  eu_75_99: 56,
  eu_50_74: 38,
  eu_below_50: 0,
}

const PARTS_POINTS: Record<PartsEuLevel, number> = {
  eu_majority: 15,
  eu_partial: 8,
  eu_none: 0,
}

const MATERIALS_POINTS: Record<MaterialsEuLevel, number> = {
  eu_majority: 10,
  eu_partial: 5,
  eu_none: 0,
}

export function isAssemblyEuBand(value: string): value is AssemblyEuBand {
  return (ASSEMBLY_EU_BANDS as readonly string[]).includes(value)
}

export function isPartsEuLevel(value: string): value is PartsEuLevel {
  return (PARTS_EU_LEVELS as readonly string[]).includes(value)
}

export function isMaterialsEuLevel(value: string): value is MaterialsEuLevel {
  return (MATERIALS_EU_LEVELS as readonly string[]).includes(value)
}

/** Canonical Dutch labels — shared by Seller/Admin UI and Excel dropdowns. */
export const ASSEMBLY_EU_BAND_LABELS: Record<AssemblyEuBand, string> = {
  eu_100: "100% assemblage in EU",
  eu_75_99: "75–99% assemblage in EU",
  eu_50_74: "50–74% assemblage in EU",
  eu_below_50: "Minder dan 50% assemblage in EU",
}

export const PARTS_EU_LEVEL_LABELS: Record<PartsEuLevel, string> = {
  eu_majority: "Overwegend EU",
  eu_partial: "Gedeeltelijk EU",
  eu_none: "Niet of nauwelijks EU",
}

export const MATERIALS_EU_LEVEL_LABELS: Record<MaterialsEuLevel, string> = {
  eu_majority: "Overwegend EU",
  eu_partial: "Gedeeltelijk EU",
  eu_none: "Niet of nauwelijks EU",
}

/** English Seller/Admin Excel dropdown labels (canonical storage labels stay NL). */
const ASSEMBLY_EU_BAND_LABELS_EN: Record<AssemblyEuBand, string> = {
  eu_100: "100% assembly in EU",
  eu_75_99: "75–99% assembly in EU",
  eu_50_74: "50–74% assembly in EU",
  eu_below_50: "Less than 50% assembly in EU",
}

const PARTS_EU_LEVEL_LABELS_EN: Record<PartsEuLevel, string> = {
  eu_majority: "Predominantly EU",
  eu_partial: "Partially EU",
  eu_none: "Not or barely EU",
}

const MATERIALS_EU_LEVEL_LABELS_EN: Record<MaterialsEuLevel, string> = {
  eu_majority: "Predominantly EU",
  eu_partial: "Partially EU",
  eu_none: "Not or barely EU",
}

function matchBandLabel<T extends string>(
  raw: string,
  nl: Record<T, string>,
  en: Record<T, string>
): T | null {
  const v = raw.trim().toLowerCase()
  const entries = Object.entries(nl) as Array<[T, string]>
  for (const [id, label] of entries) {
    if (label.toLowerCase() === v) return id
    if (en[id]?.toLowerCase() === v) return id
  }
  // Accept near-synonym used in an earlier EN template pass.
  if (v === "little or no eu content" && (en as Record<string, string>).eu_none) {
    return "eu_none" as T
  }
  return null
}

export function parseAssemblyEuBandLabel(
  raw: string | null | undefined
): AssemblyEuBand | null {
  const v = String(raw || "").trim()
  if (!v) return null
  if (isAssemblyEuBand(v)) return v
  return matchBandLabel(v, ASSEMBLY_EU_BAND_LABELS, ASSEMBLY_EU_BAND_LABELS_EN)
}

export function parsePartsEuLevelLabel(
  raw: string | null | undefined
): PartsEuLevel | null {
  const v = String(raw || "").trim()
  if (!v) return null
  if (isPartsEuLevel(v)) return v
  return matchBandLabel(v, PARTS_EU_LEVEL_LABELS, PARTS_EU_LEVEL_LABELS_EN)
}

export function parseMaterialsEuLevelLabel(
  raw: string | null | undefined
): MaterialsEuLevel | null {
  const v = String(raw || "").trim()
  if (!v) return null
  if (isMaterialsEuLevel(v)) return v
  return matchBandLabel(v, MATERIALS_EU_LEVEL_LABELS, MATERIALS_EU_LEVEL_LABELS_EN)
}

/**
 * Ontbrekende banden worden niet aangevuld. Een lege invoer is geen score van 100.
 */
export function completeMadeInEuropeBands(
  input: {
    assembly_eu_band?: string | null
    parts_eu_level?: string | null
    materials_eu_level?: string | null
    primary_assembly_country?: string | null
  }
): MadeInEuropeInput | null {
  const assembly = input.assembly_eu_band || ""
  const parts = input.parts_eu_level || ""
  const materials = input.materials_eu_level || ""
  if (!isAssemblyEuBand(assembly) || !isPartsEuLevel(parts) || !isMaterialsEuLevel(materials)) {
    return null
  }
  return {
    assembly_eu_band: assembly,
    parts_eu_level: parts,
    materials_eu_level: materials,
    primary_assembly_country: input.primary_assembly_country ?? null,
  }
}

export function computeMadeInEuropeScore(
  input: MadeInEuropeInput
): MadeInEuropeScore {
  const assembly_eu_band = input.assembly_eu_band
  const parts_eu_level = input.parts_eu_level
  const materials_eu_level = input.materials_eu_level
  const primary_assembly_country = input.primary_assembly_country
    ? input.primary_assembly_country.trim().toUpperCase()
    : null

  const assembly_points = ASSEMBLY_POINTS[assembly_eu_band]
  const parts_points = PARTS_POINTS[parts_eu_level]
  const materials_points = MATERIALS_POINTS[materials_eu_level]

  const eligible =
    assembly_eu_band !== "eu_below_50" &&
    (!primary_assembly_country || isEuCountryCode(primary_assembly_country))

  if (!eligible) {
    return {
      is_made_in_europe: false,
      score: null,
      assembly_points: 0,
      parts_points: 0,
      materials_points: 0,
      max_assembly: 75,
      max_parts: 15,
      max_materials: 10,
      assembly_eu_band,
      parts_eu_level,
      materials_eu_level,
      primary_assembly_country,
    }
  }

  const score = assembly_points + parts_points + materials_points
  return {
    is_made_in_europe: true,
    score,
    assembly_points,
    parts_points,
    materials_points,
    max_assembly: 75,
    max_parts: 15,
    max_materials: 10,
    assembly_eu_band,
    parts_eu_level,
    materials_eu_level,
    primary_assembly_country,
  }
}
