import { MedusaError } from "@medusajs/framework/utils"

/**
 * Partner Onboarding — validaties conform
 * `docs/03-functional-specs/partner-onboarding/spec.md` §2.10.
 *
 * Scope-afbakening (expliciet, zie implementatierapport S3-02-02): de
 * functionele spec somt voor "Bedrijfsgegevens" (§2.3) een aantal velden op
 * (Rechtsvorm, Bedrijfsadres, Contactpersoon, Rekeninghouder-naam) die géén
 * kolom hebben in het bevroren datamodel `02-database-model.md` Deel A.2
 * (`company`, S3-02-01). Dit ticket wijzigt dat bevroren schema niet ("geen
 * wijzigingen buiten dit ticket", "gebruik de Partner-module uit S3-02-01") —
 * validaties hieronder zijn daarom beperkt tot de velden die daadwerkelijk op
 * `company`/`seller` bestaan. De rekeninghouder-naam-vergelijking (§2.10) kan
 * hierdoor niet worden geïmplementeerd zonder een nieuwe kolom en is bewust
 * uitgesloten — zie het rapport voor de aanbeveling (ADR/vervolgticket).
 */

/**
 * IBAN-checksumvalidatie (MOD-97-10, ISO 7064), land-onafhankelijk —
 * spec §2.10: "standaard IBAN-checksumvalidatie (land-onafhankelijk,
 * ondersteunt alle EU-landen)".
 */
export function isValidIban(rawIban: string): boolean {
  const iban = rawIban.replace(/\s+/g, "").toUpperCase()

  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) {
    return false
  }

  const rearranged = iban.slice(4) + iban.slice(0, 4)
  const numeric = rearranged.replace(
    /[A-Z]/g,
    (letter) => (letter.charCodeAt(0) - 55).toString()
  )

  let remainder = numeric
  while (remainder.length > 2) {
    const chunk = remainder.slice(0, 9)
    remainder = (parseInt(chunk, 10) % 97).toString() + remainder.slice(chunk.length)
  }

  return parseInt(remainder, 10) % 97 === 1
}

/**
 * BTW-nummer — "formaatvalidatie, geen live registerkoppeling" (spec §2.10).
 * Algemeen EU-BTW-formaat: landcode (2 letters) + 2-12 alfanumerieke tekens.
 * Geen land-specifieke sub-validatie verzonnen (Blueprint noemt geen exact
 * per-land-formaat).
 */
export function isValidVatNumberFormat(rawVat: string): boolean {
  const vat = rawVat.replace(/[\s.-]/g, "").toUpperCase()
  return /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(vat)
}

/**
 * KvK-/bedrijfsregistratienummer — "formaatvalidatie, geen live
 * registerkoppeling" (spec §2.10). Geen vast, per-land-formaat vastgelegd in
 * de Blueprint (het veld is cross-EU, niet uitsluitend Nederlandse KvK) —
 * daarom een algemene, redelijke formaatcontrole (alfanumeriek, 4–20 tekens).
 */
export function isValidChamberOfCommerceNumberFormat(raw: string): boolean {
  const value = raw.trim()
  return /^[A-Za-z0-9\-\s]{4,20}$/.test(value)
}

/** ISO 3166-1 alpha-2 formaatcontrole (geen vaste EU-landenlijst verzonnen). */
export function isValidCountryCodeFormat(raw: string): boolean {
  return /^[A-Z]{2}$/.test(raw.trim().toUpperCase())
}

export interface OnboardingRoleSelection {
  is_retailer: boolean
  is_producer_or_brand_owner: boolean
  is_distributor: boolean
  is_brand_owner?: boolean
  is_producer?: boolean
}

/**
 * "Partner kiezen" is een meervoudige selectie, nooit een exclusieve
 * of/of-keuze — maar minimaal één rol is verplicht (spec §1.1, §2.12).
 */
export function assertAtLeastOneRoleSelected(
  roles: OnboardingRoleSelection
): void {
  if (
    !roles.is_retailer &&
    !roles.is_producer_or_brand_owner &&
    !roles.is_distributor &&
    !roles.is_brand_owner &&
    !roles.is_producer
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Kies ten minste één rol (Retailer, Merkeigenaar, Producent en/of Distributeur)."
    )
  }
}

export interface CompanyDraftInput {
  legal_name?: string | null
  chamber_of_commerce_number?: string | null
  vat_number?: string | null
  country_code?: string | null
  iban?: string | null
}

/**
 * Volledige validatie bij *indienen* (spec §2.10, §2.12: "indienen is
 * geblokkeerd totdat alle verplichte velden ... compleet zijn"). Bij
 * tussentijds opslaan (Concept) worden deze regels niet afgedwongen — de
 * spec staat expliciet toe dat een Concept onvolledig is (§1.2).
 */
export function validateCompanyForSubmission(company: CompanyDraftInput): string[] {
  const errors: string[] = []

  if (!company.legal_name?.trim()) {
    errors.push("Bedrijfsnaam is verplicht.")
  }

  if (!company.chamber_of_commerce_number?.trim()) {
    errors.push("KvK-/bedrijfsregistratienummer is verplicht.")
  } else if (
    !isValidChamberOfCommerceNumberFormat(company.chamber_of_commerce_number)
  ) {
    errors.push("KvK-/bedrijfsregistratienummer heeft een ongeldig formaat.")
  }

  if (!company.vat_number?.trim()) {
    errors.push("BTW-nummer is verplicht.")
  } else if (!isValidVatNumberFormat(company.vat_number)) {
    errors.push("BTW-nummer heeft een ongeldig formaat.")
  }

  if (!company.country_code?.trim()) {
    errors.push("Land is verplicht.")
  } else if (!isValidCountryCodeFormat(company.country_code)) {
    errors.push("Land moet een geldige ISO 3166-1 alpha-2-landcode zijn.")
  }

  if (!company.iban?.trim()) {
    errors.push("IBAN is verplicht.")
  } else if (!isValidIban(company.iban)) {
    errors.push("IBAN is ongeldig (checksumcontrole mislukt).")
  }

  return errors
}
