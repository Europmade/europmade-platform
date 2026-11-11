/**
 * Canonical central Product Cloud fields shared by Seller UI, Admin UI,
 * Seller import template and Admin import template.
 *
 * Commerce-only seller fields and Admin-only workflow fields are listed separately.
 */

import {
  EXTRA_IMAGE_SLOT_LABELS,
  IMPORT_FIELDS,
  importDisplayHeader,
} from "./import-columns"
import { BRAND_COMMERCIAL_FIELDS, brandImportTargets } from "./brand-import"
import { brandTemplateHeaders } from "./brand-import-template"

export type FieldSurface = "seller_ui" | "admin_ui" | "seller_xlsx" | "admin_xlsx"

export type CanonicalCentralField = {
  code: string
  nl_name: string
  group: "identity" | "content" | "catalog" | "media" | "compliance" | "origin"
  surfaces: FieldSurface[]
  notes?: string
}

const COMMERCIAL = new Set<string>(BRAND_COMMERCIAL_FIELDS)

/** Shared central product columns from the seller import catalog (minus commerce). */
export function sellerCentralImportFields() {
  return IMPORT_FIELDS.filter((f) => !COMMERCIAL.has(f.column))
}

/** Admin template headers (canonical NL labels, no requirement suffix). */
export function adminCentralImportLabels(): string[] {
  return brandTemplateHeaders()
}

/**
 * Strip "(Verplicht)" / requirement suffix from seller Excel display headers
 * so they can be compared to Admin labels.
 */
export function stripRequirementSuffix(header: string): string {
  return header.replace(/\s*\([^)]*\)\s*$/, "").trim()
}

export function sharedCentralNlNames(): string[] {
  const seller = sellerCentralImportFields().map((f) => f.nl_name)
  const admin = new Set(adminCentralImportLabels())
  // Admin omits GPSR-fabrikantnaam column: entity "Fabrikant" is the catalog link;
  // address/contact GPSR fields remain. That is an intentional Admin difference.
  return seller.filter((name) => admin.has(name) || name.startsWith("GPSR-fabrikantnaam"))
}

export function intentionalAdminOnlyLabels(): string[] {
  // Afbeelding 2–10 are shared (OB-05 / IMPL-05), not Admin-only.
  return adminCentralImportLabels().filter(
    (label) =>
      label === "EuropMade-bewijs / bewijs van EU-productie" ||
      label === "Handleiding" ||
      label === "CE-certificaat" ||
      label === "Veiligheidsinformatieblad" ||
      label === "Conformiteitsverklaring" ||
      label === "Garantiebewijs"
  )
}

export function intentionalSellerOnlyCommerceNl(): string[] {
  return IMPORT_FIELDS.filter((f) => COMMERCIAL.has(f.column)).map((f) => f.nl_name)
}

export function sellerDisplayHeaders(): string[] {
  const headers: string[] = []
  for (const field of IMPORT_FIELDS) {
    headers.push(importDisplayHeader(field))
    if (field.column === "primary_image_url") {
      for (const label of EXTRA_IMAGE_SLOT_LABELS) {
        headers.push(`${label} (Optioneel)`)
      }
    }
  }
  return headers
}

export function brandImportFieldCodes(): string[] {
  return brandImportTargets().map((t) => t.field)
}
