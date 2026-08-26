/**
 * Merk = fabrikant/verantwoordelijke fabrikant is de standaard in de seller-flow.
 * Geen extra kolom: matching op naam binnen het partnerbedrijf.
 */

export function manufacturerNameMatchesBrand(
  manufacturerName: string | null | undefined,
  brandName: string | null | undefined
): boolean {
  const left = (manufacturerName || "").trim().toLowerCase()
  const right = (brandName || "").trim().toLowerCase()
  return Boolean(left && right && left === right)
}

export type BrandManufacturerRow = {
  id: string
  name?: string | null
  represented_by_company_id?: string | null
}

export function findManufacturerForBrandName<T extends BrandManufacturerRow>(
  manufacturers: T[],
  brandName: string | null | undefined
): T | null {
  if (!brandName?.trim()) return null
  return (
    manufacturers.find((row) =>
      manufacturerNameMatchesBrand(row.name, brandName)
    ) || null
  )
}
