/**
 * Voert conversie en human follow-up uit via de bestaande engagement-service.
 * Geen Enrollment-insert buiten enrollContact. Geen communication event. Geen verzending.
 * human_follow_up is geen Crisp-conversatie en geen mailbox.
 */
import { MedusaError } from "@medusajs/framework/utils"
import type { OrchestratorConfig } from "./orchestrator-config"
import { enrollConfiguredContact } from "./orchestrator-run"
import type { OrchestratorApi } from "./orchestrator-run"
import {
  planConversionEnrollmentStops,
  planHumanFollowUp,
  planOrganizationConversion,
  type ConversionType,
  type EnrollmentRef,
  type OrganizationConversionState,
} from "./conversion-rules"

export const ORGANIZATION_CONVERTED_ENTRY = "organization_converted"

export function organizationConvertedTrigger(organizationId: string): string {
  return `organization_converted:${organizationId}`
}

export type ConversionApi = Pick<
  OrchestratorApi,
  "enrollContact" | "listEngagementSequenceSteps"
> & {
  retrieveEngagementOrganization(
    id: string
  ): Promise<OrganizationConversionState>
  updateEngagementOrganizations(data: {
    id: string
    converted_customer_id: string | null
    converted_seller_id: string | null
  }): Promise<unknown>
  listEngagementContacts(
    filters: { organization_id: string },
    config?: { take?: number }
  ): Promise<{ id: string }[]>
  listEngagementEnrollments(
    filters: { contact_id: string },
    config?: { take?: number }
  ): Promise<EnrollmentRef[]>
  stopEnrollmentForConversion(id: string): Promise<unknown>
  retrieveEngagementContact(id: string): Promise<{ id: string }>
  updateEnrollment(input: {
    id: string
    status?: string
    next_step_at?: Date | null
  }): Promise<unknown>
}

export type ConversionResult = {
  organization_id: string
  conversion_type: ConversionType
  converted_customer_id: string | null
  converted_seller_id: string | null
  changed: boolean
  stopped_enrollment_ids: string[]
  onboarding: { contact_id: string; enrolled: boolean; reason?: string }[]
}

function isNotFound(err: unknown): boolean {
  return err instanceof MedusaError && err.type === MedusaError.Types.NOT_FOUND
}

function fail(type: string, message: string): never {
  throw new MedusaError(type, message)
}

export async function applyOrganizationConversion(input: {
  api: ConversionApi
  config: OrchestratorConfig
  organizationId: string
  customerId?: string | null
  sellerId?: string | null
  now: Date
  log: (message: string) => void
}): Promise<ConversionResult> {
  const organizationId = input.organizationId.trim()
  if (!organizationId) {
    fail(MedusaError.Types.INVALID_DATA, "Organization vereist een id.")
  }
  let organization: OrganizationConversionState | null = null
  try {
    organization = await input.api.retrieveEngagementOrganization(organizationId)
  } catch (err) {
    if (!isNotFound(err)) throw err
  }
  const plan = planOrganizationConversion({
    organization,
    customer_id: input.customerId,
    seller_id: input.sellerId,
  })
  if (!plan.ok) {
    const missing = plan.error === "Organization bestaat niet."
    fail(
      missing ? MedusaError.Types.NOT_FOUND : MedusaError.Types.INVALID_DATA,
      plan.error
    )
  }
  if (plan.changed) {
    await input.api.updateEngagementOrganizations({
      id: plan.organization_id,
      converted_customer_id: plan.converted_customer_id,
      converted_seller_id: plan.converted_seller_id,
    })
  }

  const contacts = [
    ...(await input.api.listEngagementContacts(
      { organization_id: plan.organization_id },
      { take: 100 }
    )),
  ].sort((a, b) => a.id.localeCompare(b.id))
  const stopped_enrollment_ids: string[] = []
  const onboarding: ConversionResult["onboarding"] = []
  for (const contact of contacts) {
    const enrollments = await input.api.listEngagementEnrollments(
      { contact_id: contact.id },
      { take: 100 }
    )
    const stops = planConversionEnrollmentStops(enrollments)
    for (const stop of stops) {
      await input.api.stopEnrollmentForConversion(stop.id)
      stopped_enrollment_ids.push(stop.id)
    }
    const started = await enrollConfiguredContact({
      api: input.api as unknown as OrchestratorApi,
      config: input.config,
      contactId: contact.id,
      programType: "onboarding",
      triggerKey: organizationConvertedTrigger(plan.organization_id),
      entrySource: ORGANIZATION_CONVERTED_ENTRY,
      now: input.now,
      log: input.log,
    })
    onboarding.push({
      contact_id: contact.id,
      enrolled: started.enrolled,
      reason: started.reason,
    })
  }

  return {
    organization_id: plan.organization_id,
    conversion_type: plan.conversion_type,
    converted_customer_id: plan.converted_customer_id,
    converted_seller_id: plan.converted_seller_id,
    changed: plan.changed,
    stopped_enrollment_ids,
    onboarding,
  }
}

/**
 * Zet active acquisition op human_follow_up en maakt next_step_at leeg.
 * Schrijft geen communication event en verzendt niets.
 */
export async function applyHumanFollowUp(input: {
  api: ConversionApi
  contactId: string
}): Promise<{ contact_id: string; updated_enrollment_ids: string[] }> {
  const contactId = input.contactId.trim()
  if (!contactId) {
    fail(MedusaError.Types.INVALID_DATA, "Human follow-up vereist een contact_id.")
  }
  try {
    await input.api.retrieveEngagementContact(contactId)
  } catch (err) {
    if (isNotFound(err)) {
      fail(MedusaError.Types.NOT_FOUND, `Contact ${contactId} bestaat niet.`)
    }
    throw err
  }
  const enrollments = await input.api.listEngagementEnrollments(
    { contact_id: contactId },
    { take: 100 }
  )
  const updates = planHumanFollowUp(enrollments)
  for (const update of updates) {
    await input.api.updateEnrollment({
      id: update.id,
      status: update.status,
      next_step_at: null,
    })
  }
  return {
    contact_id: contactId,
    updated_enrollment_ids: updates.map((update) => update.id),
  }
}
