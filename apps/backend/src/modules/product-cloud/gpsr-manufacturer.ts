import { isEuMarketCode } from "@europmade/types"

export const GPSR_MANUFACTURER_ATTRIBUTE_CODES = [
  "gpsr_manufacturer_name",
  "gpsr_manufacturer_address",
  "gpsr_manufacturer_postal_city",
  "gpsr_manufacturer_country",
  "gpsr_manufacturer_email",
] as const

export const GPSR_EU_RESPONSIBLE_ATTRIBUTE_CODES = [
  "gpsr_eu_responsible_name",
  "gpsr_eu_responsible_address",
  "gpsr_eu_responsible_postal_city",
  "gpsr_eu_responsible_country",
  "gpsr_eu_responsible_contact",
] as const

export type GpsrManufacturerAttributeCode =
  (typeof GPSR_MANUFACTURER_ATTRIBUTE_CODES)[number]

export type GpsrEuResponsibleAttributeCode =
  (typeof GPSR_EU_RESPONSIBLE_ATTRIBUTE_CODES)[number]

export type ManufacturerGpsrSource = {
  name?: string | null
  street?: string | null
  house_number?: string | null
  postal_code?: string | null
  city?: string | null
  country_code?: string | null
  contact_email?: string | null
}

export function isGpsrManufacturerAttributeCode(
  code: string | null | undefined
): code is GpsrManufacturerAttributeCode {
  return (
    !!code &&
    (GPSR_MANUFACTURER_ATTRIBUTE_CODES as readonly string[]).includes(code)
  )
}

export function isGpsrEuResponsibleAttributeCode(
  code: string | null | undefined
): code is GpsrEuResponsibleAttributeCode {
  return (
    !!code &&
    (GPSR_EU_RESPONSIBLE_ATTRIBUTE_CODES as readonly string[]).includes(code)
  )
}

/**
 * GPSR Art. 16/19: een afzonderlijke EU-verantwoordelijke persoon is alleen
 * nodig wanneer de fabrikant niet in de Unie is gevestigd.
 */
export function manufacturerNeedsSeparateEuOperator(
  manufacturer: ManufacturerGpsrSource | null | undefined
): boolean {
  if (!manufacturer?.country_code) return false
  return !isEuMarketCode(manufacturer.country_code)
}

export function manufacturerToGpsrValues(
  manufacturer: ManufacturerGpsrSource
): Record<GpsrManufacturerAttributeCode, string> {
  const street = [manufacturer.street, manufacturer.house_number]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")
  const postalCity = [manufacturer.postal_code, manufacturer.city]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")
  return {
    gpsr_manufacturer_name: manufacturer.name?.trim() || "",
    gpsr_manufacturer_address: street,
    gpsr_manufacturer_postal_city: postalCity,
    gpsr_manufacturer_country: (manufacturer.country_code || "")
      .trim()
      .toUpperCase(),
    gpsr_manufacturer_email: manufacturer.contact_email?.trim() || "",
  }
}

export function overlayGpsrManufacturerAttributes<
  T extends { code: string; value?: string | null },
>(
  attributes: T[],
  manufacturer: ManufacturerGpsrSource | null | undefined
): T[] {
  if (!manufacturer) return attributes
  const values = manufacturerToGpsrValues(manufacturer)
  return attributes.map((row) => {
    if (!isGpsrManufacturerAttributeCode(row.code)) return row
    return { ...row, value: values[row.code] }
  })
}

export function applyGpsrComplianceAttributes<
  T extends {
    code: string
    value?: string | null
    tier?: string
    requirement_tier?: string
  },
>(
  attributes: T[],
  manufacturer: ManufacturerGpsrSource | null | undefined
): T[] {
  const withManufacturer = overlayGpsrManufacturerAttributes(
    attributes,
    manufacturer
  )
  if (manufacturerNeedsSeparateEuOperator(manufacturer)) {
    return withManufacturer
  }
  return withManufacturer.map((row) => {
    if (!isGpsrEuResponsibleAttributeCode(row.code)) return row
    return {
      ...row,
      ...(row.tier != null ? { tier: "not_applicable" } : {}),
      ...(row.requirement_tier != null
        ? { requirement_tier: "not_applicable" }
        : {}),
    }
  })
}
