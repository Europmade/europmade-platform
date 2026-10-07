/**
 * Deelname-regels (architectuur §2, §11, §13).
 * Geen verzending, geen subscriber, geen job.
 * `growth` blijft `lifecycle` op het programma; preference gebruikt de consentcategorieën.
 */
import { isCommunicationType, type CommunicationType } from "./communication-cms-rules"

export const ENROLLMENT_STATUSES = [
  "active",
  "stopped",
  "completed",
  "human_follow_up",
  "suppressed",
] as const

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export const COMMUNICATION_EVENT_STATUSES = [
  "queued",
  "sent",
  "failed",
  "bounced",
  "stopped",
] as const

export type CommunicationEventStatus =
  (typeof COMMUNICATION_EVENT_STATUSES)[number]

/** Consentcategorieën uit §13. Geen aparte Unsubscribe- of MarketingConsent-tabel. */
export const PREFERENCE_CATEGORIES = [
  "acquisition",
  "operational",
  "marketing",
] as const

export type PreferenceCategory = (typeof PREFERENCE_CATEGORIES)[number]

/** P0-kanaal van Engagement. Crisp is geen preference-kanaal. */
export const PREFERENCE_CHANNELS = ["email"] as const

export type PreferenceChannel = (typeof PREFERENCE_CHANNELS)[number]

export const SUPPRESSION_REASONS = ["unsubscribe", "bounce", "manual"] as const

export type SuppressionReason = (typeof SUPPRESSION_REASONS)[number]

const EXCLUSIVE_ACTIVE_TYPES = new Set<CommunicationType>([
  "acquisition",
  "onboarding",
])

export function isActiveEnrollmentStatus(status: string): boolean {
  return status === "active"
}

export function normalizeEnrollmentStatus(value: string): EnrollmentStatus {
  const token = value.trim()
  if (!(ENROLLMENT_STATUSES as readonly string[]).includes(token)) {
    throw new Error(`Onbekende enrollment-status "${value}".`)
  }
  return token as EnrollmentStatus
}

export function normalizeEventStatus(value: string): CommunicationEventStatus {
  const token = value.trim()
  if (!(COMMUNICATION_EVENT_STATUSES as readonly string[]).includes(token)) {
    throw new Error(`Onbekende communication-event-status "${value}".`)
  }
  return token as CommunicationEventStatus
}

export function normalizePreferenceCategory(value: string): PreferenceCategory {
  const token = value.trim()
  if (!(PREFERENCE_CATEGORIES as readonly string[]).includes(token)) {
    throw new Error(`Onbekende preference-categorie "${value}".`)
  }
  return token as PreferenceCategory
}

export function normalizePreferenceChannel(value: string | undefined): PreferenceChannel {
  const token = (value ?? "email").trim()
  if (!(PREFERENCE_CHANNELS as readonly string[]).includes(token)) {
    throw new Error(`Onbekend preference-kanaal "${value}".`)
  }
  return token as PreferenceChannel
}

export function normalizeSuppressionReason(value: string): SuppressionReason {
  const token = value.trim()
  if (!(SUPPRESSION_REASONS as readonly string[]).includes(token)) {
    throw new Error(`Onbekende suppression-reden "${value}".`)
  }
  return token as SuppressionReason
}

export function normalizePreferenceEnabled(enabled: boolean): boolean {
  if (typeof enabled !== "boolean") {
    throw new Error("Preference enabled moet true of false zijn.")
  }
  return enabled
}

/**
 * Programmatype → consentcategorie.
 * onboarding, operational en lifecycle zijn operationeel.
 * newsletter en campaign zijn marketing.
 */
export function programTypeToPreferenceCategory(
  programType: string
): PreferenceCategory {
  if (!isCommunicationType(programType)) {
    throw new Error(`Onbekend program_type "${programType}".`)
  }
  if (programType === "acquisition") return "acquisition"
  if (programType === "newsletter" || programType === "campaign") return "marketing"
  return "operational"
}

export function assertEnrollmentGraph(input: {
  program_id: string
  sequence_program_id: string
  sequence_id: string
  step_sequence_id: string
  contact_organization_id: string
  organization_id: string
}): void {
  if (input.sequence_program_id !== input.program_id) {
    throw new Error("Sequence hoort niet bij het gekozen LifecycleProgram.")
  }
  if (input.step_sequence_id !== input.sequence_id) {
    throw new Error("SequenceStep hoort niet bij de gekozen Sequence.")
  }
  if (input.organization_id !== input.contact_organization_id) {
    throw new Error("Organization hoort niet bij het gekozen Contact.")
  }
}

/**
 * Alleen status `active` bezet een slot.
 * `human_follow_up`, `stopped`, `completed` en `suppressed` blokkeren geen nieuwe active enrollment.
 */
export function assertCanActivateEnrollment(input: {
  programType: string
  existingActiveProgramTypes: string[]
}): void {
  if (!isCommunicationType(input.programType)) {
    throw new Error(`Onbekend program_type "${input.programType}".`)
  }
  if (input.existingActiveProgramTypes.includes(input.programType)) {
    throw new Error(
      "Een contact heeft maximaal één active enrollment per program_type."
    )
  }
  if (
    EXCLUSIVE_ACTIVE_TYPES.has(input.programType) &&
    input.existingActiveProgramTypes.some((type) =>
      EXCLUSIVE_ACTIVE_TYPES.has(type as CommunicationType)
    )
  ) {
    throw new Error(
      "Een contact heeft nooit tegelijk een active acquisition- en onboarding-enrollment."
    )
  }
}

export function matchExistingTrigger<T extends { trigger_key: string }>(
  rows: T[],
  triggerKey: string
): T | null {
  const key = triggerKey.trim()
  if (!key) throw new Error("Enrollment vereist een trigger_key.")
  return rows.find((row) => row.trigger_key === key) ?? null
}

export function isSendBlocked(
  activeSuppressionCategories: string[],
  category: string
): boolean {
  return activeSuppressionCategories.includes(category)
}

export function assertNotSuppressed(input: {
  category: string
  activeSuppressionCategories: string[]
}): void {
  if (isSendBlocked(input.activeSuppressionCategories, input.category)) {
    throw new Error(
      "Suppression blokkeert deelname en latere verzending voor deze categorie."
    )
  }
}

/**
 * SequenceStep heeft geen version-id. History mag de gebruikte TemplateVersion wel vastleggen.
 */
export function assertHistoryVersion(input: {
  status: string
  template_version_id?: string | null
  stepDefinesVersion?: boolean
}): { status: CommunicationEventStatus; template_version_id: string | null } {
  if (input.stepDefinesVersion) {
    throw new Error("SequenceStep bevat geen version-id.")
  }
  const version = input.template_version_id?.trim() || null
  return {
    status: normalizeEventStatus(input.status),
    template_version_id: version,
  }
}
