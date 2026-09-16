/**
 * Sprint 3B — manufacturer / production location completeness resolution.
 * Accepts manufacturer profile, brand facility, or resolved GPSR manufacturer.
 */
export function resolveEffectiveManufacturerId(input: {
  manufacturer_id?: string | null
  mie_facility_id?: string | null
  resolved_manufacturer_name?: string | null
}): string | null {
  if (input.manufacturer_id?.trim()) return input.manufacturer_id.trim()
  if (input.mie_facility_id?.trim()) return input.mie_facility_id.trim()
  if (input.resolved_manufacturer_name?.trim()) return "manufacturer-resolved"
  return null
}
