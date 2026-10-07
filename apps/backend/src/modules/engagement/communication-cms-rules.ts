/**
 * Communication CMS-regels (ADR-0047, locked).
 * Template = identiteit. Variant = locale. Version = immutable inhoud.
 * Geen verzending, geen provider, geen copy.
 */

export const COMMUNICATION_TYPES = [
  "acquisition",
  "onboarding",
  "lifecycle",
  "newsletter",
  "campaign",
  "operational",
] as const

export type CommunicationType = (typeof COMMUNICATION_TYPES)[number]

export const APPROVAL_STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
] as const

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]

export const ACTIVATION_STATUSES = ["inactive", "active", "archived"] as const

export type ActivationStatus = (typeof ACTIVATION_STATUSES)[number]

/** Velden die na aanmaak nooit op dezelfde version wijzigen. */
export const VERSION_CONTENT_FIELDS = [
  "subject",
  "preheader",
  "body",
  "cta_label",
  "cta_url",
  "personalization_tokens",
  "version_number",
  "variant_id",
] as const

const TOKEN_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/

export function isCommunicationType(value: string): value is CommunicationType {
  return (COMMUNICATION_TYPES as readonly string[]).includes(value)
}

export function isApprovalStatus(value: string): value is ApprovalStatus {
  return (APPROVAL_STATUSES as readonly string[]).includes(value)
}

export function isActivationStatus(value: string): value is ActivationStatus {
  return (ACTIVATION_STATUSES as readonly string[]).includes(value)
}

/** Later verzendbaar. P0 verzendt niet; dit is alleen de poort. */
export function isSendableVersion(input: {
  approval_status: string
  activation_status: string
}): boolean {
  return (
    input.approval_status === "approved" && input.activation_status === "active"
  )
}

export function normalizeTokenWhitelist(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("personalization_tokens moet een lijst zijn.")
  }
  const tokens: string[] = []
  for (const entry of value) {
    if (typeof entry !== "string") {
      throw new Error("personalization_tokens bevat een niet-tekstwaarde.")
    }
    const token = entry.trim()
    if (!TOKEN_PATTERN.test(token)) {
      throw new Error(
        `Ongeldige personalisatie-token "${entry}". Gebruik een naam, geen tekst.`
      )
    }
    if (!tokens.includes(token)) tokens.push(token)
  }
  return tokens
}

export function contentFieldsInPatch(patch: object): string[] {
  return VERSION_CONTENT_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(patch, field)
  )
}

export type VersionState = {
  used_at: Date | string | null
  approval_status: string
  activation_status: string
}

export type VersionTransition = {
  approval_status: ApprovalStatus
  activation_status: ActivationStatus
}

/**
 * Status mag wijzigen tot de version gebruikt is.
 * Inhoud wijzigt hier nooit: dat is een nieuwe version.
 * `active` alleen samen met `approved`.
 */
export function resolveVersionTransition(
  current: VersionState,
  patch: { approval_status?: string; activation_status?: string }
): VersionTransition {
  if (current.used_at) {
    throw new Error(
      "Een gebruikte TemplateVersion is onwijzigbaar. Maak een nieuwe version."
    )
  }
  if (!isApprovalStatus(current.approval_status)) {
    throw new Error(`Onbekende approval status "${current.approval_status}".`)
  }
  if (!isActivationStatus(current.activation_status)) {
    throw new Error(
      `Onbekende activation status "${current.activation_status}".`
    )
  }

  const approval_status = patch.approval_status ?? current.approval_status
  const activation_status = patch.activation_status ?? current.activation_status

  if (!isApprovalStatus(approval_status)) {
    throw new Error(`Onbekende approval status "${approval_status}".`)
  }
  if (!isActivationStatus(activation_status)) {
    throw new Error(`Onbekende activation status "${activation_status}".`)
  }
  if (activation_status === "active" && approval_status !== "approved") {
    throw new Error(
      "Activation active is alleen toegestaan bij approval approved."
    )
  }

  return { approval_status, activation_status }
}

export function normalizeTemplateIdentity(input: {
  name: string
  communication_type: string
}): { name: string; communication_type: CommunicationType } {
  const name = input.name.trim()
  const communication_type = input.communication_type.trim()
  if (!name) throw new Error("communication_template vereist een naam.")
  if (!isCommunicationType(communication_type)) {
    throw new Error(`Onbekend communication_type "${communication_type}".`)
  }
  return { name, communication_type }
}

export function normalizeVariantIdentity(input: {
  name: string
  locale: string
}): { name: string; locale: string } {
  const name = input.name.trim()
  const locale = input.locale.trim().toLowerCase()
  if (!name || !locale) {
    throw new Error("template_variant vereist naam en locale.")
  }
  return { name, locale }
}

/** Unieke variantnaam binnen één template (partial unique index). */
export function assertVariantNameAvailable(
  existingNames: string[],
  name: string
): void {
  if (existingNames.includes(name)) {
    throw new Error(`Variantnaam "${name}" bestaat al op deze template.`)
  }
}

/**
 * Een nieuwe version is altijd draft + inactive.
 * De aanroeper kiest geen approval, activation of version_number.
 */
export function assertCreatedVersionStatus(input: {
  approval_status?: string
  activation_status?: string
}): { approval_status: "draft"; activation_status: "inactive" } {
  if (
    (input.approval_status !== undefined && input.approval_status !== "draft") ||
    (input.activation_status !== undefined &&
      input.activation_status !== "inactive")
  ) {
    throw new Error("Een nieuwe TemplateVersion is altijd draft en inactive.")
  }
  return { approval_status: "draft", activation_status: "inactive" }
}

export function planVersionApproval(current: VersionState): VersionTransition {
  return resolveVersionTransition(current, { approval_status: "approved" })
}

export function planVersionActivation(current: VersionState): VersionTransition {
  return resolveVersionTransition(current, { activation_status: "active" })
}

export function planVersionDeactivation(current: VersionState): VersionTransition {
  return resolveVersionTransition(current, { activation_status: "inactive" })
}

/**
 * approved_at / approved_by volgen de statusovergang.
 * Geen verzending en geen actor buiten de meegegeven id.
 */
export function approvalAudit(
  current: {
    approval_status: string
    approved_at: Date | string | null
    approved_by: string | null
  },
  next: VersionTransition,
  approvedBy: string | null,
  now: Date
): { approved_at: Date | string | null; approved_by: string | null } {
  const becomesApproved =
    next.approval_status === "approved" && current.approval_status !== "approved"
  const leavesApproved = next.approval_status !== "approved"
  return {
    approved_at: becomesApproved
      ? now
      : leavesApproved
        ? null
        : current.approved_at,
    approved_by: becomesApproved
      ? approvedBy?.trim() || null
      : leavesApproved
        ? null
        : current.approved_by,
  }
}

/**
 * Alleen een ongebruikt concept (draft + inactive, geen used_at) mag
 * inhoudelijk worden bijgewerkt. Elke andere versie blijft onwijzigbaar.
 */
export function isUnusedDraft(current: {
  used_at: Date | string | null
  approval_status: string
  activation_status: string
}): boolean {
  return (
    !current.used_at &&
    current.approval_status === "draft" &&
    current.activation_status === "inactive"
  )
}

export function refuseVersionContentChange(
  current: {
    used_at: Date | string | null
    approval_status: string
    activation_status: string
  },
  patch: object
): void {
  const fields = contentFieldsInPatch(patch)
  if (fields.includes("version_number") || fields.includes("variant_id")) {
    throw new Error("Versienummer en taal blijven staan.")
  }
  const content = fields.filter(
    (field) => field !== "version_number" && field !== "variant_id"
  )
  if (content.length === 0) return
  if (current.used_at) {
    throw new Error(
      "Een gebruikte TemplateVersion is onwijzigbaar. Maak een nieuwe version."
    )
  }
  if (isUnusedDraft(current)) return
  throw new Error(
    "Deze versie is actief of al gebruikt en kan niet worden gewijzigd."
  )
}
