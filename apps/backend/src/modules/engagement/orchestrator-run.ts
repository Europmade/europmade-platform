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
import { pickDeliveryVariant } from "./automation-start"
import { programTypeToPreferenceCategory } from "./participation-rules"
import { resolveNewsletterTopics } from "./consumer-rules"
import { marketingPreferenceKey } from "./preference-audit"
import { marketingPreferenceAllows } from "./campaign-selection"
import { deliveryStopNote } from "./delivery"
import {
  inactivityMilestoneAt,
  orderedAfterReference,
  referenceFromInactiveKey,
} from "./inactivity-sequence"
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
    contact_id?: string | null
    consumer_id?: string | null
    affiliate_id?: string | null
    enrollment_id?: string | null
    program_id?: string | null
    sequence_id?: string | null
    sequence_step_id?: string | null
    template_id?: string | null
    variant_id?: string | null
    template_version_id?: string | null
    status: string
    locale?: string | null
    delivery_error?: string | null
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
  listEngagementPreferences?: (
    filters: { contact_id: string; category: string },
    config?: { take?: number }
  ) => Promise<{ enabled: boolean }[]>
  retrieveEngagementConsumer?: (
    id: string
  ) => Promise<{ newsletter_enabled?: boolean; newsletter_topics?: unknown }>
  retrieveCommunicationTemplate?: (
    id: string
  ) => Promise<{ audience?: string | null }>
  retrieveEngagementLifecycleProgram?: (
    id: string
  ) => Promise<{ audience?: string | null; start_trigger?: string | null }>
  listCommunicationTemplateVariants?: (
    filters: { template_id: string },
    config?: { take?: number }
  ) => Promise<Array<{ id: string; locale: string; template_id: string }>>
  listEngagementEnrollments(
    filters: { status: string },
    config?: { take?: number }
  ): Promise<DueEnrollmentState[]>
  listConsumerOrderTimes?: (consumerId: string) => Promise<Array<{ created_at: string }>>
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

export async function enrollMatchingPrograms(input: {
  api: OrchestratorApi
  programs: Array<{
    id: string
    start_trigger?: string | null
    start_mode?: string | null
    activation_status?: string | null
    sequences?: Array<{ id: string; steps?: Array<{ id: string; step_order?: number; delay_minutes?: number }> }>
  }>
  candidate: MilestoneCandidate
  seller: SellerRef | null
  organizations: OrganizationRef[]
  contacts: ContactRef[]
  now: Date
  log: OrchestratorLog
}): Promise<{ enrolled: number; skipped?: string }> {
  const key = input.candidate.entry_source.trim()
  const matches = input.programs.filter(
    (program) =>
      program.activation_status !== "concept" &&
      program.start_mode !== "scheduled" &&
      program.start_trigger === key
  )
  if (matches.length === 0) {
    const reason = `Geen automatisering met startmoment ${key}. Geen enrollment.`
    input.log(reason)
    return { enrolled: 0, skipped: reason }
  }
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
  for (const program of matches) {
    const sequence =
      (program.sequences ?? []).find((item) => (item.steps ?? []).length > 0) ??
      program.sequences?.[0]
    if (!sequence) {
      input.log(`Automatisering ${program.id} heeft geen reeks. Geen enrollment.`)
      continue
    }
    const steps =
      sequence.steps && sequence.steps.length > 0
        ? sequence.steps
        : await input.api.listEngagementSequenceSteps({ sequence_id: sequence.id }, { take: 1000 })
    const first = pickFirstStep(steps as OrchestratorStep[])
    if (!first) {
      input.log(`Reeks ${sequence.id} heeft geen stap. Geen enrollment.`)
      continue
    }
    for (const contactId of recipient.contact_ids) {
      try {
        await input.api.enrollContact({
          contact_id: contactId,
          program_id: program.id,
          sequence_id: sequence.id,
          sequence_step_id: first.id,
          trigger_key: input.candidate.trigger_key,
          entry_source: key,
          next_step_at: addDelayMinutes(input.now, Number(first.delay_minutes)),
        })
        enrolled += 1
      } catch (err) {
        input.log(
          `Enrollment niet aangemaakt voor ${key}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }
  }
  return { enrolled }
}

export async function processOneDueEnrollment(
  api: OrchestratorApi,
  enrollmentId: string,
  now: Date,
  recipientLocale?: string | null,
  preferenceOverride?: boolean
): Promise<{ action: string; reason?: string }> {
  const enrollment = await api.retrieveEngagementEnrollment(enrollmentId)
  if (enrollment.status !== "active") return { action: "skip", reason: "not-active" }
  const triggerKey = (enrollment as DueEnrollmentState & { trigger_key?: string | null }).trigger_key

  const steps = await api.listEngagementSequenceSteps(
    { sequence_id: enrollment.sequence_id },
    { take: 1000 }
  )
  const step = steps.find((row) => row.id === enrollment.sequence_step_id)
  let versions: OrchestratorVersion[] = []
  let variantMatchesTemplate = false
  let contentVariantId = step?.variant_id
  let deliveryLocale = recipientLocale?.trim() || null
  if (step?.variant_id && step.template_id) {
    let variantId = step.variant_id
    try {
      if (api.listCommunicationTemplateVariants) {
        const variants = await api.listCommunicationTemplateVariants(
          { template_id: step.template_id },
          { take: 20 }
        )
        variantId = pickDeliveryVariant({
          variants,
          sourceVariantId: step.variant_id,
          recipientLocale,
        })
        const chosen = variants.find((row) => row.id === variantId)
        if (chosen?.locale?.trim()) deliveryLocale = chosen.locale
      }
      contentVariantId = variantId
      const variant = await api.retrieveCommunicationTemplateVariant(variantId)
      variantMatchesTemplate = variant.template_id === step.template_id
      versions = await api.listCommunicationTemplateVersions(
        { variant_id: variantId },
        { take: 1000 }
      )
    } catch {
      versions = []
      variantMatchesTemplate = false
    }
  }
  const suppressions = enrollment.contact_id
    ? await api.listEngagementSuppressions(
        { contact_id: enrollment.contact_id, active: true },
        { take: 20 }
      )
    : []
  const events = await api.listEngagementCommunicationEvents(
    { enrollment_id: enrollment.id },
    { take: 1000 }
  )
  const priorStoppedForStep = events.some(
    (event) =>
      event.sequence_step_id === enrollment.sequence_step_id &&
      event.status === "stopped"
  )
  const priorQueuedForStep = events.some(
    (event) =>
      event.sequence_step_id === enrollment.sequence_step_id &&
      event.status === "queued"
  )
  let preferenceAllows = preferenceOverride !== false
  if (enrollment.contact_id && api.listEngagementPreferences) {
    try {
      const category = programTypeToPreferenceCategory(enrollment.program_type)
      const preferences = await api.listEngagementPreferences(
        { contact_id: enrollment.contact_id, category },
        { take: 5 }
      )
      if (preferences.some((row) => row.enabled === false)) preferenceAllows = false
    } catch {
      preferenceAllows = true
    }
  }
  if (enrollment.consumer_id && api.retrieveEngagementConsumer) {
    try {
      const category = programTypeToPreferenceCategory(enrollment.program_type)
      const consumer = await api.retrieveEngagementConsumer(enrollment.consumer_id)
      if (category === "marketing") {
        let trigger: string | null = null
        if (api.retrieveEngagementLifecycleProgram) {
          const program = await api.retrieveEngagementLifecycleProgram(enrollment.program_id)
          trigger = program.start_trigger ?? null
        }
        const key = marketingPreferenceKey("consumers", enrollment.program_type, trigger)
        const topics = resolveNewsletterTopics(consumer.newsletter_topics, consumer.newsletter_enabled === true)
        if (!marketingPreferenceAllows("consumers", topics, key)) preferenceAllows = false
      }
    } catch {
      preferenceAllows = false
    }
  }
  let audienceMatches = true
  if (
    step?.template_id &&
    api.retrieveCommunicationTemplate &&
    api.retrieveEngagementLifecycleProgram
  ) {
    try {
      const [template, program] = await Promise.all([
        api.retrieveCommunicationTemplate(step.template_id),
        api.retrieveEngagementLifecycleProgram(enrollment.program_id),
      ])
      const wanted = program.audience?.trim()
      const actual = template.audience?.trim()
      if (wanted && actual && wanted !== actual) audienceMatches = false
    } catch {
      audienceMatches = false
    }
  }
  let startTrigger: string | null = null
  if (api.retrieveEngagementLifecycleProgram) {
    try {
      const program = await api.retrieveEngagementLifecycleProgram(enrollment.program_id)
      startTrigger = program.start_trigger ?? null
    } catch {
      startTrigger = null
    }
  }
  let conditionAllows = true
  let inactivityReference: Date | null = null
  if (startTrigger === "consumer_inactive_30d") {
    const reference = referenceFromInactiveKey(triggerKey)
    inactivityReference = reference ? new Date(reference) : null
    if (!inactivityReference || Number.isNaN(inactivityReference.getTime()) || !enrollment.consumer_id || !api.listConsumerOrderTimes) {
      conditionAllows = false
    } else {
      try {
        const orders = await api.listConsumerOrderTimes(enrollment.consumer_id)
        if (orderedAfterReference(orders, inactivityReference.toISOString())) conditionAllows = false
      } catch {
        conditionAllows = false
      }
    }
  }
  const plan = planDueStep({
    enrollment,
    steps,
    versions,
    variantMatchesTemplate,
    suppressedCategories: suppressions.map((row) => row.category),
    priorStoppedForStep,
    priorQueuedForStep,
    preferenceAllows,
    conditionAllows,
    audienceMatches,
    contentVariantId,
    now,
  })
  if (
    inactivityReference &&
    plan.enrollment_update &&
    plan.enrollment_update.status === "active" &&
    plan.enrollment_update.next_step_at
  ) {
    const next = steps.find((row) => row.id === plan.enrollment_update?.sequence_step_id)
    if (next && Number(next.step_order) > 1) {
      plan.enrollment_update.next_step_at = inactivityMilestoneAt(inactivityReference, Number(next.step_order))
    }
  }
  if (plan.action === "skip") return plan
  if (plan.action === "resume") {
    await api.updateEnrollment(plan.enrollment_update)
    return { action: "resume" }
  }
  await api.recordCommunicationEvent({
    ...plan.event,
    locale: deliveryLocale,
    delivery_error: plan.action === "stopped" ? deliveryStopNote(plan.reason) : null,
  })
  if (plan.enrollment_update) {
    await api.updateEnrollment(plan.enrollment_update)
  }
  return { action: plan.action, reason: plan.action === "stopped" ? plan.reason : undefined }
}

export async function processDueEnrollments(
  api: OrchestratorApi,
  now: Date,
  log: OrchestratorLog,
  recipientLocale?: (contactId: string | null, enrollment?: DueEnrollmentState) => Promise<string | null>,
  allows?: (enrollment: DueEnrollmentState) => Promise<boolean>
): Promise<void> {
  const enrollments = await api.listEngagementEnrollments(
    { status: "active" },
    { take: 500 }
  )
  for (const enrollment of enrollments) {
    try {
      const locale = recipientLocale
        ? await recipientLocale(enrollment.contact_id, enrollment)
        : null
      const allowed = allows ? await allows(enrollment) : true
      const result = await processOneDueEnrollment(
        api,
        enrollment.id,
        now,
        locale,
        allowed
      )
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
