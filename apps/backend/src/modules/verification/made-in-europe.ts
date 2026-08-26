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

/**
 * Berekent de EuropMade Made in Europe-score.
 * <50% assemblage (eu_below_50) → geen Made in Europe.
 */
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
