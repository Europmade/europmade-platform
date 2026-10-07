/**
 * Prospect-CRM-regels (architectuur §3). Geen outreach, geen events.
 * DTC uit de opdracht is het locked token `direct_to_consumer`.
 */

export const SALES_MODELS = [
  "direct_to_consumer",
  "reseller_only",
  "mixed",
  "brand_seeking_partners",
  "unknown",
] as const

export type SalesModel = (typeof SALES_MODELS)[number]

export const ORGANIZATION_ROLES = [
  "brand",
  "seller",
  "manufacturer",
  "distributor",
  "retailer",
  "other",
  "unknown",
] as const

export type OrganizationRoleValue = (typeof ORGANIZATION_ROLES)[number]

export const DEFAULT_SALES_MODEL: SalesModel = "unknown"
/** P0-default. Blijft geldig voor bestaande rijen en wordt niet herschreven. */
export const DEFAULT_OUTREACH_STATUS = "new"
export const DEFAULT_ORGANIZATION_SOURCE = "excel_import"
export const DEFAULT_ORGANIZATION_ROLE: OrganizationRoleValue = "unknown"

/**
 * Vaste prospectstatussen voor de Admin.
 * `new` is de oude default en hoort niet in deze set.
 */
export const OUTREACH_STATUSES = [
  "nieuw",
  "te_benaderen",
  "benaderd",
  "in_gesprek",
  "opvolging_nodig",
  "gekwalificeerd",
  "geen_interesse",
  "niet_geschikt",
  "geconverteerd",
] as const

export type OutreachStatus = (typeof OUTREACH_STATUSES)[number]

export function isOutreachStatus(value: string): value is OutreachStatus {
  return (OUTREACH_STATUSES as readonly string[]).includes(value)
}

/**
 * Leeg blijft de P0-default `new`.
 * Een onbekende bestaande waarde mag ongewijzigd blijven.
 * Een nieuwe vrije tekst wordt geweigerd.
 */
export function planOutreachStatus(
  requested: string | null | undefined,
  current?: string | null
): string {
  const value = requested?.trim() || ""
  if (!value) return current?.trim() || DEFAULT_OUTREACH_STATUS
  if (isOutreachStatus(value) || value === DEFAULT_OUTREACH_STATUS) return value
  if (current && value === current.trim()) return value
  throw new Error(`Onbekende prospectstatus "${requested}".`)
}

export function isSalesModel(value: string): value is SalesModel {
  return (SALES_MODELS as readonly string[]).includes(value)
}

export function isOrganizationRole(value: string): value is OrganizationRoleValue {
  return (ORGANIZATION_ROLES as readonly string[]).includes(value)
}

/** Rollen zijn een set. Leeg betekent het locked default `[unknown]`. */
export function normalizeOrganizationRoles(
  roles: string[] | undefined
): OrganizationRoleValue[] {
  if (!roles || roles.length === 0) return [DEFAULT_ORGANIZATION_ROLE]
  const unique: OrganizationRoleValue[] = []
  for (const role of roles) {
    const value = role.trim()
    if (!isOrganizationRole(value)) {
      throw new Error(`Onbekende organization-rol "${role}".`)
    }
    if (!unique.includes(value)) unique.push(value)
  }
  return unique
}

export function normalizeContactEmail(email: string): string {
  const value = email.trim().toLowerCase()
  if (!value || !value.includes("@")) {
    throw new Error("Contact vereist een e-mailadres.")
  }
  return value
}

/** Conversierefs horen alleen bij convertOrganization. */
export function refuseManualConversionChange(input: {
  converted_customer_id?: unknown
  converted_seller_id?: unknown
}): void {
  if (
    input.converted_customer_id !== undefined ||
    input.converted_seller_id !== undefined
  ) {
    throw new Error(
      "Conversie-verwijzingen wijzigen alleen via convertOrganization."
    )
  }
}

export function normalizeSelfClassification(
  value: unknown
): Record<string, unknown> | null {
  if (value === null) return null
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("self_classification_payload moet een object zijn.")
  }
  return value as Record<string, unknown>
}

function optionalText(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed || null
}

/**
 * Identiteit van een Organization. Geen conversierefs en geen rollen.
 * Lege sales_model, outreach_status en source krijgen de bestaande defaults.
 */
export function planOrganizationIdentity(input: {
  company_name: string
  website?: string | null
  category?: string | null
  sales_model?: string | null
  outreach_status?: string | null
  current_outreach_status?: string | null
  source?: string | null
  outreach_purpose?: string | null
  self_classification_payload?: unknown
}) {
  const company_name = input.company_name.trim()
  if (!company_name) throw new Error("Organization vereist company_name.")
  const sales_model = input.sales_model?.trim() || DEFAULT_SALES_MODEL
  if (!isSalesModel(sales_model)) {
    throw new Error(
      `Onbekend sales_model "${input.sales_model}". DTC is direct_to_consumer.`
    )
  }
  const outreach_status = planOutreachStatus(
    input.outreach_status,
    input.current_outreach_status
  )
  const source = input.source?.trim() || DEFAULT_ORGANIZATION_SOURCE
  return {
    company_name,
    website: optionalText(input.website),
    category: optionalText(input.category),
    sales_model,
    outreach_status,
    source,
    outreach_purpose: optionalText(input.outreach_purpose),
    self_classification_payload:
      input.self_classification_payload === undefined
        ? null
        : normalizeSelfClassification(input.self_classification_payload),
  }
}

/** Geen tweede keer dezelfde rol op één organisatie. */
export function assertRoleAvailable(
  existingRoles: string[],
  role: string
): void {
  if (existingRoles.includes(role)) {
    throw new Error(`Rol "${role}" bestaat al op deze organisatie.`)
  }
}

/**
 * Verwijderen uit de set. Een lege set valt terug op `[unknown]`.
 * De enige rol `unknown` blijft staan.
 */
export function planRoleRemoval(
  existingRoles: string[],
  role: string
): { remove: OrganizationRoleValue; restoreUnknown: boolean } {
  if (!isOrganizationRole(role)) {
    throw new Error(`Onbekende organization-rol "${role}".`)
  }
  if (!existingRoles.includes(role)) {
    throw new Error(`Rol "${role}" staat niet op deze organisatie.`)
  }
  const remaining = existingRoles.filter((item) => item !== role)
  if (remaining.length === 0) {
    if (role === DEFAULT_ORGANIZATION_ROLE) {
      throw new Error(
        "unknown blijft staan zolang de organisatie geen andere rol heeft."
      )
    }
    return { remove: role, restoreUnknown: true }
  }
  return { remove: role, restoreUnknown: false }
}

export function planContactIdentity(input: {
  organization_id: string
  email: string
  name?: string | null
}) {
  const organization_id = input.organization_id.trim()
  if (!organization_id) throw new Error("Contact vereist organization_id.")
  return {
    organization_id,
    email: normalizeContactEmail(input.email),
    name: optionalText(input.name),
  }
}

/** Unieke e-mail binnen één organisatie. */
export function assertContactEmailAvailable(
  existingEmails: string[],
  email: string
): void {
  if (existingEmails.includes(email)) {
    throw new Error(`E-mail "${email}" bestaat al op deze organisatie.`)
  }
}
