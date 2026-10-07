/**
 * Orchestrator-beslissingen. Geen verzending, geen provider, geen queue.
 * Seller-milestones horen bij het onboarding-programma (architectuur §5).
 */
import { isSendableVersion } from "./communication-cms-rules"
import { programTypeToPreferenceCategory } from "./participation-rules"
import type { ProgramType } from "./sequence-rules"

export const ONBOARDING_MILESTONE_PROGRAM = "onboarding" as const satisfies ProgramType

export type OrchestratorStep = {
  id: string
  sequence_id: string
  step_order: number
  delay_minutes: number
  template_id: string
  variant_id: string
}

export type OrchestratorVersion = {
  id: string
  variant_id: string
  version_number: number
  approval_status: string
  activation_status: string
}

export type DueEnrollmentState = {
  id: string
  status: string
  contact_id: string
  program_id: string
  program_type: string
  sequence_id: string
  sequence_step_id: string
  next_step_at: Date | string | null
}

export type DueStepPlan =
  | { action: "skip"; reason: "not-active" | "not-due" | "already-stopped" }
  | {
      action: "stopped"
      reason: "suppressed" | "no_sendable_version"
      event: HistoryWrite
      enrollment_update: EnrollmentWrite | null
    }
  | {
      action: "queued"
      event: HistoryWrite
      enrollment_update: EnrollmentWrite
    }

export type HistoryWrite = {
  contact_id: string
  enrollment_id: string
  program_id: string
  sequence_id: string
  sequence_step_id: string
  template_id: string
  variant_id: string
  template_version_id: string | null
  status: "queued" | "stopped"
}

export type EnrollmentWrite = {
  id: string
  status: "active" | "completed" | "suppressed"
  sequence_step_id: string
  next_step_at: Date | null
}

export type SellerRef = {
  id: string
  customer_id: string | null
}

export type OrganizationRef = {
  id: string
  converted_seller_id: string | null
}

export type ContactRef = {
  id: string
  organization_id: string
}

export type RecipientPlan =
  | { ok: false; reason: string }
  | { ok: true; organization_id: string; contact_ids: string[] }

export type MilestoneCandidate = {
  seller_id: string
  trigger_key: string
  entry_source: string
  program_type: typeof ONBOARDING_MILESTONE_PROGRAM
}

export function addDelayMinutes(now: Date, delayMinutes: number): Date {
  return new Date(now.getTime() + delayMinutes * 60_000)
}

export function isEnrollmentDue(input: {
  status: string
  next_step_at: Date | string | null
  now: Date
}): boolean {
  if (input.status !== "active") return false
  if (input.next_step_at == null || input.next_step_at === "") return false
  const at =
    input.next_step_at instanceof Date
      ? input.next_step_at
      : new Date(input.next_step_at)
  if (Number.isNaN(at.getTime())) return false
  return at.getTime() <= input.now.getTime()
}

export function pickFirstStep(steps: OrchestratorStep[]): OrchestratorStep | null {
  const ordered = [...steps].sort(
    (a, b) => Number(a.step_order) - Number(b.step_order)
  )
  return ordered[0] ?? null
}

export function pickNextStep(
  steps: OrchestratorStep[],
  currentStepId: string
): OrchestratorStep | null {
  const current = steps.find((step) => step.id === currentStepId)
  if (!current) return null
  const later = steps
    .filter((step) => Number(step.step_order) > Number(current.step_order))
    .sort((a, b) => Number(a.step_order) - Number(b.step_order))
  return later[0] ?? null
}

/** Hoogste version_number met approved + active. Geen andere versie. */
export function pickSendableVersion(
  versions: OrchestratorVersion[],
  variantId: string
): OrchestratorVersion | null {
  const sendable = versions.filter(
    (version) =>
      version.variant_id === variantId && isSendableVersion(version)
  )
  if (sendable.length === 0) return null
  return sendable.reduce((best, version) =>
    Number(version.version_number) > Number(best.version_number) ? version : best
  )
}

export function planDueStep(input: {
  enrollment: DueEnrollmentState
  steps: OrchestratorStep[]
  versions: OrchestratorVersion[]
  variantMatchesTemplate: boolean
  suppressedCategories: string[]
  priorStoppedForStep: boolean
  now: Date
}): DueStepPlan {
  const enrollment = input.enrollment
  if (enrollment.status !== "active") {
    return { action: "skip", reason: "not-active" }
  }
  if (
    !isEnrollmentDue({
      status: enrollment.status,
      next_step_at: enrollment.next_step_at,
      now: input.now,
    })
  ) {
    return { action: "skip", reason: "not-due" }
  }

  const step = input.steps.find((row) => row.id === enrollment.sequence_step_id)
  const category = programTypeToPreferenceCategory(enrollment.program_type)
  const base = {
    contact_id: enrollment.contact_id,
    enrollment_id: enrollment.id,
    program_id: enrollment.program_id,
    sequence_id: enrollment.sequence_id,
    sequence_step_id: enrollment.sequence_step_id,
    template_id: step?.template_id ?? "",
    variant_id: step?.variant_id ?? "",
  }

  if (input.suppressedCategories.includes(category)) {
    return {
      action: "stopped",
      reason: "suppressed",
      event: { ...base, template_version_id: null, status: "stopped" },
      enrollment_update: {
        id: enrollment.id,
        status: "suppressed",
        sequence_step_id: enrollment.sequence_step_id,
        next_step_at: null,
      },
    }
  }

  const version =
    step && input.variantMatchesTemplate
      ? pickSendableVersion(input.versions, step.variant_id)
      : null
  if (!version) {
    if (input.priorStoppedForStep) {
      return { action: "skip", reason: "already-stopped" }
    }
    return {
      action: "stopped",
      reason: "no_sendable_version",
      event: { ...base, template_version_id: null, status: "stopped" },
      enrollment_update: null,
    }
  }

  const event: HistoryWrite = {
    ...base,
    template_id: step!.template_id,
    variant_id: step!.variant_id,
    template_version_id: version.id,
    status: "queued",
  }
  const next = pickNextStep(input.steps, step!.id)
  if (!next) {
    return {
      action: "queued",
      event,
      enrollment_update: {
        id: enrollment.id,
        status: "completed",
        sequence_step_id: step!.id,
        next_step_at: null,
      },
    }
  }
  return {
    action: "queued",
    event,
    enrollment_update: {
      id: enrollment.id,
      status: "active",
      sequence_step_id: next.id,
      next_step_at: addDelayMinutes(input.now, Number(next.delay_minutes)),
    },
  }
}

export function planSellerRecipient(input: {
  seller: SellerRef | null
  organizations: OrganizationRef[]
  contacts: ContactRef[]
}): RecipientPlan {
  if (!input.seller) {
    return { ok: false, reason: "SellerOnboarded-seller bestaat niet." }
  }
  if (!input.seller.customer_id?.trim()) {
    return {
      ok: false,
      reason: `Seller ${input.seller.id} heeft geen customer-koppeling.`,
    }
  }
  const organizations = input.organizations.filter(
    (organization) => organization.converted_seller_id === input.seller!.id
  )
  if (organizations.length === 0) {
    return {
      ok: false,
      reason: `Geen organization met converted_seller_id ${input.seller.id}. Geen enrollment.`,
    }
  }
  if (organizations.length > 1) {
    return {
      ok: false,
      reason: `Meer dan één organization voor seller ${input.seller.id}. Geen enrollment.`,
    }
  }
  const organization = organizations[0]
  const contact_ids = input.contacts
    .filter((contact) => contact.organization_id === organization.id)
    .map((contact) => contact.id)
  if (contact_ids.length === 0) {
    return {
      ok: false,
      reason: `Organization ${organization.id} heeft geen contact. Geen enrollment.`,
    }
  }
  return { ok: true, organization_id: organization.id, contact_ids }
}

function milestone(
  seller_id: string,
  trigger_key: string,
  entry_source: string
): MilestoneCandidate {
  return {
    seller_id,
    trigger_key,
    entry_source,
    program_type: "onboarding",
  }
}

export function accountCreatedCandidates(
  sellers: { id: string; onboarding_status: string }[]
): MilestoneCandidate[] {
  return sellers
    .filter((seller) => seller.onboarding_status === "Concept")
    .map((seller) =>
      milestone(seller.id, `account_created:${seller.id}`, "account_created")
    )
}

export function onboardingSubmittedCandidates(
  sellers: { id: string; onboarding_status: string }[]
): MilestoneCandidate[] {
  return sellers
    .filter(
      (seller) =>
        seller.onboarding_status === "Ingediend" ||
        seller.onboarding_status === "In beoordeling"
    )
    .map((seller) =>
      milestone(
        seller.id,
        `onboarding_submitted:${seller.id}`,
        "onboarding_submitted"
      )
    )
}

export function onboardingApprovedCandidates(
  sellers: { id: string; onboarding_status: string }[]
): MilestoneCandidate[] {
  return sellers
    .filter((seller) => seller.onboarding_status === "Goedgekeurd")
    .map((seller) =>
      milestone(
        seller.id,
        `onboarding_approved:${seller.id}`,
        "onboarding_approved"
      )
    )
}

export function firstProductCandidates(
  versions: {
    id: string
    created_by_seller_id: string
    created_at: string | Date
  }[]
): MilestoneCandidate[] {
  const earliest = new Map<string, { at: number }>()
  for (const version of versions) {
    const seller_id = version.created_by_seller_id?.trim()
    if (!seller_id) continue
    const at = new Date(version.created_at).getTime()
    const current = earliest.get(seller_id)
    if (!current || at < current.at) earliest.set(seller_id, { at })
  }
  return [...earliest.keys()].map((seller_id) =>
    milestone(seller_id, `first_product:${seller_id}`, "first_product")
  )
}

export function publishedCandidates(
  versions: { id: string; publication_status: string; created_by_seller_id: string }[]
): MilestoneCandidate[] {
  return versions
    .filter(
      (version) =>
        version.publication_status === "Gepubliceerd" &&
        version.created_by_seller_id?.trim()
    )
    .map((version) =>
      milestone(
        version.created_by_seller_id,
        `product_published:${version.id}`,
        "product_published"
      )
    )
}

export function verificationCandidates(
  origins: { id: string; seller_id: string; status: string }[]
): MilestoneCandidate[] {
  return origins
    .filter(
      (origin) => origin.status === "Geverifieerd" && origin.seller_id?.trim()
    )
    .map((origin) =>
      milestone(origin.seller_id, `verification:${origin.id}`, "verification")
    )
}

export function incompleteCandidates(
  versions: { id: string; created_by_seller_id: string; information_quality: string }[]
): MilestoneCandidate[] {
  return versions
    .filter(
      (version) =>
        version.information_quality === "insufficient" &&
        version.created_by_seller_id?.trim()
    )
    .map((version) =>
      milestone(
        version.created_by_seller_id,
        `product_incomplete:${version.id}`,
        "product_incomplete"
      )
    )
}

/**
 * Eerste em_order per seller_id. Rijen zonder seller_id (OrderPlaced) tellen niet.
 */
export function firstSaleCandidates(
  orders: { id: string; seller_id?: string | null; created_at: string | Date }[]
): MilestoneCandidate[] {
  const earliest = new Map<string, number>()
  for (const order of orders) {
    const seller_id = order.seller_id?.trim()
    if (!seller_id) continue
    const at = new Date(order.created_at).getTime()
    const current = earliest.get(seller_id)
    if (current == null || at < current) earliest.set(seller_id, at)
  }
  return [...earliest.keys()].map((seller_id) =>
    milestone(seller_id, `first_sale:${seller_id}`, "first_sale")
  )
}
