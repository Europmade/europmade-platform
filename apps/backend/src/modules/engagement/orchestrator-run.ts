/**
 * Voert orchestrator-beslissingen uit via de bestaande engagement-service.
 * Schrijft alleen history (`queued` of `stopped`). Verzendt niets.
 */
import type { OrchestratorConfig } from "./orchestrator-config"
import { selectProgram } from "./orchestrator-config"
import {
  addDelayMinutes,
  pickFirstStep,
  planDueStep,
  planSellerRecipient,
  type ContactRef,
  type DueEnrollmentState,
  type MilestoneCandidate,
  type OrchestratorStep,
  type OrchestratorVersion,
  type OrganizationRef,
  type SellerRef,
} from "./orchestrator-rules"
import type { ProgramType } from "./sequence-rules"

export type OrchestratorLog = (message: string) => void

export type OrchestratorApi = {
  enrollContact(input: {
    contact_id: string
    program_id: string
    sequence_id: string
    sequence_step_id: string
    trigger_key: string
    entry_source: string
    next_step_at?: Date | null
  }): Promise<{ id: string }>
  updateEnrollment(input: {
    id: string
    status?: string
    next_step_at?: Date | null
    sequence_step_id?: string
  }): Promise<unknown>
  recordCommunicationEvent(input: {
    contact_id: string
    enrollment_id?: string | null
    program_id?: string | null
    sequence_id?: string | null
    sequence_step_id?: string | null
    template_id?: string | null
    variant_id?: string | null
    template_version_id?: string | null
    status: string
  }): Promise<unknown>
  retrieveEngagementEnrollment(id: string): Promise<DueEnrollmentState>
  listEngagementSequenceSteps(
    filters: { sequence_id: string },
    config?: { take?: number }
  ): Promise<OrchestratorStep[]>
  listCommunicationTemplateVersions(
    filters: { variant_id: string },
    config?: { take?: number }
  ): Promise<OrchestratorVersion[]>
  retrieveCommunicationTemplateVariant(
    id: string
  ): Promise<{ id: string; template_id: string }>
  listEngagementSuppressions(
    filters: { contact_id: string; active: boolean },
    config?: { take?: number }
  ): Promise<{ category: string }[]>
  listEngagementCommunicationEvents(
    filters: { enrollment_id: string },
    config?: { take?: number }
  ): Promise<{ sequence_step_id: string | null; status: string }[]>
  listEngagementEnrollments(
    filters: { status: string },
    config?: { take?: number }
  ): Promise<DueEnrollmentState[]>
}

export async function enrollConfiguredContact(input: {
  api: OrchestratorApi
  config: OrchestratorConfig
  contactId: string
  programType: ProgramType
  triggerKey: string
  entrySource: string
  now: Date
  log: OrchestratorLog
}): Promise<{ enrolled: boolean; reason?: string; enrollmentId?: string }> {
  const selection = selectProgram(input.config, input.programType)
  if (!selection) {
    const reason = `Geen P0-05-configuratie voor program_type ${input.programType}. Geen enrollment.`
    input.log(reason)
    return { enrolled: false, reason }
  }
  const steps = await input.api.listEngagementSequenceSteps(
    { sequence_id: selection.sequence_id },
    { take: 1000 }
  )
  const first = pickFirstStep(steps)
  if (!first) {
    const reason = `Sequence ${selection.sequence_id} heeft geen step. Geen enrollment.`
    input.log(reason)
    return { enrolled: false, reason }
  }
  try {
    const enrollment = await input.api.enrollContact({
      contact_id: input.contactId,
      program_id: selection.program_id,
      sequence_id: selection.sequence_id,
      sequence_step_id: first.id,
      trigger_key: input.triggerKey,
      entry_source: input.entrySource,
      next_step_at: addDelayMinutes(input.now, Number(first.delay_minutes)),
    })
    return { enrolled: true, enrollmentId: enrollment.id }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    input.log(
      `Enrollment niet aangemaakt voor contact ${input.contactId}, trigger ${input.triggerKey}: ${reason}`
    )
    return { enrolled: false, reason }
  }
}

export async function enrollSellerMilestone(input: {
  api: OrchestratorApi
  config: OrchestratorConfig
  candidate: MilestoneCandidate
  seller: SellerRef | null
  organizations: OrganizationRef[]
  contacts: ContactRef[]
  now: Date
  log: OrchestratorLog
}): Promise<{ enrolled: number; skipped?: string }> {
  const recipient = planSellerRecipient({
    seller: input.seller,
    organizations: input.organizations,
    contacts: input.contacts,
  })
  if (!recipient.ok) {
    input.log(recipient.reason)
    return { enrolled: 0, skipped: recipient.reason }
  }
  let enrolled = 0
  for (const contactId of recipient.contact_ids) {
    const result = await enrollConfiguredContact({
      api: input.api,
      config: input.config,
      contactId,
      programType: input.candidate.program_type,
      triggerKey: input.candidate.trigger_key,
      entrySource: input.candidate.entry_source,
      now: input.now,
      log: input.log,
    })
    if (result.enrolled) enrolled += 1
  }
  return { enrolled }
}

export async function processOneDueEnrollment(
  api: OrchestratorApi,
  enrollmentId: string,
  now: Date
): Promise<{ action: string; reason?: string }> {
  const enrollment = await api.retrieveEngagementEnrollment(enrollmentId)
  if (enrollment.status !== "active") return { action: "skip", reason: "not-active" }

  const steps = await api.listEngagementSequenceSteps(
    { sequence_id: enrollment.sequence_id },
    { take: 1000 }
  )
  const step = steps.find((row) => row.id === enrollment.sequence_step_id)
  let versions: OrchestratorVersion[] = []
  let variantMatchesTemplate = false
  if (step?.variant_id && step.template_id) {
    try {
      const variant = await api.retrieveCommunicationTemplateVariant(step.variant_id)
      variantMatchesTemplate = variant.template_id === step.template_id
      versions = await api.listCommunicationTemplateVersions(
        { variant_id: step.variant_id },
        { take: 1000 }
      )
    } catch {
      versions = []
      variantMatchesTemplate = false
    }
  }
  const suppressions = await api.listEngagementSuppressions(
    { contact_id: enrollment.contact_id, active: true },
    { take: 20 }
  )
  const events = await api.listEngagementCommunicationEvents(
    { enrollment_id: enrollment.id },
    { take: 1000 }
  )
  const priorStoppedForStep = events.some(
    (event) =>
      event.sequence_step_id === enrollment.sequence_step_id &&
      event.status === "stopped"
  )
  const plan = planDueStep({
    enrollment,
    steps,
    versions,
    variantMatchesTemplate,
    suppressedCategories: suppressions.map((row) => row.category),
    priorStoppedForStep,
    now,
  })
  if (plan.action === "skip") return plan
  await api.recordCommunicationEvent(plan.event)
  if (plan.enrollment_update) {
    await api.updateEnrollment(plan.enrollment_update)
  }
  return { action: plan.action, reason: plan.action === "stopped" ? plan.reason : undefined }
}

export async function processDueEnrollments(
  api: OrchestratorApi,
  now: Date,
  log: OrchestratorLog
): Promise<void> {
  const enrollments = await api.listEngagementEnrollments(
    { status: "active" },
    { take: 500 }
  )
  for (const enrollment of enrollments) {
    try {
      const result = await processOneDueEnrollment(api, enrollment.id, now)
      if (result.action !== "skip") {
        log(
          `Due enrollment ${enrollment.id}: ${result.action}${result.reason ? ` (${result.reason})` : ""}.`
        )
      }
    } catch (err) {
      log(
        `Due enrollment ${enrollment.id} niet verwerkt: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}
