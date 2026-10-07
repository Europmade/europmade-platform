/**
 * Conversie en human follow-up (architectuur §2, §23).
 *
 * human_follow_up stopt automatische communicatie. Het is een enrollment-status.
 * Geen Crisp-conversatie, geen mailbox en geen communication event.
 * Crisp is later de externe handover-laag.
 *
 * Conversie schrijft alleen soft refs. Geen Customer- of Seller-record.
 */
export const CONVERSION_STOP_REASON = "conversion" as const

export type ConversionType = "customer" | "seller" | "both"

export type OrganizationConversionState = {
  id: string
  converted_customer_id: string | null
  converted_seller_id: string | null
}

export type ConversionPlan =
  | { ok: false; error: string }
  | {
      ok: true
      organization_id: string
      conversion_type: ConversionType
      converted_customer_id: string | null
      converted_seller_id: string | null
      changed: boolean
    }

export type EnrollmentRef = {
  id: string
  contact_id: string
  program_type: string
  status: string
}

export type ConversionStop = {
  id: string
  status: "stopped"
  next_step_at: null
  reason: typeof CONVERSION_STOP_REASON
}

export type HumanFollowUpUpdate = {
  id: string
  status: "human_follow_up"
  next_step_at: null
}

function cleanId(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  return trimmed || null
}

function conversionType(
  customerId: string | null,
  sellerId: string | null
): ConversionType {
  if (customerId && sellerId) return "both"
  if (sellerId) return "seller"
  return "customer"
}

function mergeRef(
  existing: string | null,
  requested: string | null,
  field: "converted_customer_id" | "converted_seller_id"
): { ok: true; value: string | null } | { ok: false; error: string } {
  const current = cleanId(existing)
  if (!requested) return { ok: true, value: current }
  if (current && current !== requested) {
    return {
      ok: false,
      error: `${field} staat al op ${current} en wordt niet overschreven.`,
    }
  }
  return { ok: true, value: requested }
}

/**
 * Idempotente soft-ref conversie. Een gevulde ref met een andere id is een fout.
 * `null` in de aanroep laat die ref staan.
 */
export function planOrganizationConversion(input: {
  organization: OrganizationConversionState | null
  customer_id?: string | null
  seller_id?: string | null
}): ConversionPlan {
  if (!input.organization?.id?.trim()) {
    return { ok: false, error: "Organization bestaat niet." }
  }
  const customerRequest = cleanId(input.customer_id)
  const sellerRequest = cleanId(input.seller_id)
  if (!customerRequest && !sellerRequest) {
    return {
      ok: false,
      error: "Conversion vereist een customer_id, een seller_id, of beide.",
    }
  }
  const customer = mergeRef(
    input.organization.converted_customer_id,
    customerRequest,
    "converted_customer_id"
  )
  if (!customer.ok) return customer
  const seller = mergeRef(
    input.organization.converted_seller_id,
    sellerRequest,
    "converted_seller_id"
  )
  if (!seller.ok) return seller
  const converted_customer_id = customer.value
  const converted_seller_id = seller.value
  return {
    ok: true,
    organization_id: input.organization.id,
    conversion_type: conversionType(converted_customer_id, converted_seller_id),
    converted_customer_id,
    converted_seller_id,
    changed:
      converted_customer_id !== cleanId(input.organization.converted_customer_id) ||
      converted_seller_id !== cleanId(input.organization.converted_seller_id),
  }
}

/**
 * Registratie/conversie stopt alleen active acquisition.
 * Geen insert. Onboarding en overige programmatypes blijven staan.
 * Het model heeft geen reden-kolom; de reden zit op dit plan.
 */
export function planConversionEnrollmentStops(
  enrollments: EnrollmentRef[]
): ConversionStop[] {
  return enrollments
    .filter(
      (enrollment) =>
        enrollment.status === "active" && enrollment.program_type === "acquisition"
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((enrollment) => ({
      id: enrollment.id,
      status: "stopped" as const,
      next_step_at: null,
      reason: CONVERSION_STOP_REASON,
    }))
}

/** Na de acquisition-stop: geen tweede active onboarding starten. */
export function shouldStartOnboarding(enrollments: EnrollmentRef[]): boolean {
  return !enrollments.some(
    (enrollment) =>
      enrollment.status === "active" && enrollment.program_type === "onboarding"
  )
}

/**
 * Handmatig “mark as replied”.
 * Alleen active acquisition gaat naar human_follow_up.
 * Onboarding blijft active en mag daarnaast bestaan.
 * stopped, completed en suppressed veranderen niet.
 * Geen communication event en geen verzending.
 */
export function planHumanFollowUp(
  enrollments: EnrollmentRef[]
): HumanFollowUpUpdate[] {
  return enrollments
    .filter(
      (enrollment) =>
        enrollment.status === "active" && enrollment.program_type === "acquisition"
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((enrollment) => ({
      id: enrollment.id,
      status: "human_follow_up" as const,
      next_step_at: null,
    }))
}
