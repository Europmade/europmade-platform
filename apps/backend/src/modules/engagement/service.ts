import type { Context } from "@medusajs/framework/types"
import { InjectManager, MedusaContext, MedusaError, MedusaService } from "@medusajs/framework/utils"
import {
  CommunicationTemplate,
  CommunicationTemplateVariant,
  CommunicationTemplateVersion,
  EngagementContact,
  EngagementImportBatch,
  EngagementOrganization,
  EngagementOrganizationRole,
  EngagementLifecycleProgram,
  EngagementSequence,
  EngagementSequenceStep,
  EngagementEnrollment,
  EngagementPreference,
  EngagementSuppression,
  EngagementCommunicationEvent,
  EngagementConsumer,
} from "./models"
import {
  approvalAudit,
  assertCreatedVersionStatus,
  assertTemplateDeletable,
  assertVersionDeletable,
  assertVariantNameAvailable,
  contentFieldsInPatch,
  isSendableVersion,
  normalizeTemplateIdentity,
  normalizeVariantIdentity,
  normalizeTokenWhitelist,
  planTemplateAudience,
  planTemplateLayout,
  refuseVersionContentChange,
  resolveVersionTransition,
  type ActivationStatus,
  type ApprovalStatus,
} from "./communication-cms-rules"
import {
  allNewsletterTopics,
  assertConsumerSource,
  emptyNewsletterTopics,
  isPreviewUnsubscribeToken,
  newUnsubscribeToken,
  normalizeConsumerEmail,
  planNewsletterTopics,
} from "./consumer-rules"
import {
  DEFAULT_ORGANIZATION_ROLE,
  DEFAULT_ORGANIZATION_SOURCE,
  assertContactEmailAvailable,
  assertRoleAvailable,
  planContactIdentity,
  planOrganizationIdentity,
  planRoleRemoval,
  refuseManualConversionChange,
  normalizeOrganizationRoles,
  type OrganizationRoleValue,
} from "./prospect-rules"
import {
  assertStepDeletable,
  assertStepOrderSet,
  assertTemplateMatchesProgram,
  assertUniqueStepOrder,
  assertVariantBelongsToTemplate,
  normalizeDelayMinutes,
  normalizeProgramType,
  normalizeStepOrder,
} from "./sequence-rules"
import {
  assertStartTrigger,
  findStartTrigger,
  planMessageSchedule,
  planProgramStart,
  programActivationErrors,
} from "./automation-start"
import { storedCampaignCriteria } from "./campaign-selection"
import {
  applyDeliveryResult,
  DELIVERY_CLAIM_SQL,
  planProviderWebhook,
  type HistoryDeliveryRow,
  type ProviderDeliveryResult,
  type ProviderWebhook,
} from "./delivery"
import { readOrchestratorConfig } from "./orchestrator-config"
import {
  applyHumanFollowUp,
  applyOrganizationConversion,
  type ConversionApi,
} from "./conversion-run"
import { CONVERSION_STOP_REASON } from "./conversion-rules"
import {
  assertCanActivateEnrollment,
  assertEnrollmentGraph,
  assertHistoryVersion,
  assertNotSuppressed,
  isActiveEnrollmentStatus,
  matchExistingTrigger,
  normalizeEnrollmentStatus,
  normalizePreferenceCategory,
  normalizePreferenceChannel,
  normalizePreferenceEnabled,
  normalizeSuppressionReason,
  programTypeToPreferenceCategory,
} from "./participation-rules"

type TemplateVersionRow = {
  id: string
  variant_id: string
  version_number: number
  approval_status: string
  activation_status: string
  approved_at: Date | string | null
  approved_by: string | null
  used_at: Date | string | null
}

function invalid(message: string): never {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
}

async function executeDeliverySql(
  manager: unknown,
  sql: string,
  params: unknown[]
): Promise<Record<string, unknown>[]> {
  const candidate = manager as {
    execute?: (query: string, values?: unknown[]) => Promise<unknown>
    getConnection?: () => { execute: (query: string, values?: unknown[]) => Promise<unknown> }
  } | null
  const connection = candidate?.getConnection?.()
  const run = candidate?.execute?.bind(candidate) ?? connection?.execute?.bind(connection)
  if (!run) invalid("De verzendclaim kan niet atomair worden gezet.")
  const result = await run(sql, params)
  if (Array.isArray(result)) return result as Record<string, unknown>[]
  const rows = (result as { rows?: unknown[] } | null)?.rows
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : []
}

function notAllowed(message: string): never {
  throw new MedusaError(MedusaError.Types.NOT_ALLOWED, message)
}

/**
 * Engagement — CMS, prospect-CRM, sequences en deelname.
 * Geen verzending en geen Crisp. Contentgeneratie maakt alleen een concept.
 */
class EngagementModuleService extends MedusaService({
  CommunicationTemplate,
  CommunicationTemplateVariant,
  CommunicationTemplateVersion,
  EngagementImportBatch,
  EngagementOrganization,
  EngagementOrganizationRole,
  EngagementContact,
  EngagementLifecycleProgram,
  EngagementSequence,
  EngagementSequenceStep,
  EngagementEnrollment,
  EngagementPreference,
  EngagementSuppression,
  EngagementCommunicationEvent,
  EngagementConsumer,
}) {
  async createTemplate(input: {
    name: string
    communication_type: string
    sequence_step_binding?: string | null
    audience?: string | null
    layout?: string | null
  }) {
    const identity = this.templateIdentity(input)
    const binding = input.sequence_step_binding?.trim() || null
    return this.createCommunicationTemplates({
      name: identity.name,
      communication_type: identity.communication_type,
      sequence_step_binding: binding,
      audience: this.templateAudience(identity.communication_type, input.audience ?? null, null),
      layout: planTemplateLayout(input.layout, null),
      ready_to_send: false,
    })
  }

  /**
   * Alleen identiteit. Geen subject, body of locale.
   * communication_type blijft staan zolang een SequenceStep deze template gebruikt.
   */
  async updateTemplate(input: {
    id: string
    name?: string
    communication_type?: string
    audience?: string | null
    layout?: string | null
    schedule?: {
      scheduled_at?: string | null
      schedule_timezone?: string | null
      audience?: string | null
    } | null
  }) {
    const id = input.id.trim()
    if (!id) invalid("communication_template vereist een id.")
    const current = (await this.retrieveCommunicationTemplate(id)) as {
      id: string
      name: string
      communication_type: string
      audience?: string | null
      layout?: string | null
      scheduled_at?: string | null
      schedule_timezone?: string | null
      schedule_status?: string | null
    }
    const identity = this.templateIdentity({
      name: input.name === undefined ? current.name : input.name,
      communication_type:
        input.communication_type === undefined
          ? current.communication_type
          : input.communication_type,
    })
    if (identity.communication_type !== current.communication_type) {
      const steps = (await this.listEngagementSequenceSteps(
        { template_id: id },
        { take: 1 }
      )) as { id: string }[]
      if (steps.length > 0) {
        invalid(
          "communication_type wijzigt niet zolang een SequenceStep naar deze template verwijst."
        )
      }
    }
    let audience = this.templateAudience(
      identity.communication_type,
      input.audience,
      current.audience ?? null
    )
    let scheduled_at = current.scheduled_at ?? null
    let schedule_timezone = current.schedule_timezone ?? null
    let schedule_status = current.schedule_status ?? null
    if (input.schedule === null) {
      scheduled_at = null
      schedule_timezone = null
      schedule_status = null
    } else if (input.schedule) {
      await this.assertApprovedForSchedule(id)
      try {
        const planned = planMessageSchedule({
          communicationType: identity.communication_type,
          scheduled_at: input.schedule.scheduled_at,
          schedule_timezone: input.schedule.schedule_timezone,
          audience: input.schedule.audience ?? audience,
        })
        scheduled_at = planned.scheduled_at
        schedule_timezone = planned.schedule_timezone
        schedule_status = planned.schedule_status
        audience = this.templateAudience(
          identity.communication_type,
          planned.audience,
          audience
        )
      } catch (err) {
        invalid(err instanceof Error ? err.message : String(err))
      }
    }
    return this.updateCommunicationTemplates({
      id,
      name: identity.name,
      communication_type: identity.communication_type,
      audience,
      layout: planTemplateLayout(input.layout, current.layout ?? null),
      scheduled_at,
      schedule_timezone,
      schedule_status,
      ...(identity.communication_type === "newsletter" ? {} : { ready_to_send: false }),
    })
  }

  async markNewsletterReady(id: string) {
    const current = (await this.retrieveCommunicationTemplate(id)) as {
      id: string
      communication_type: string
    }
    if (current.communication_type !== "newsletter") {
      invalid("Alleen een nieuwsbrief kan klaar voor verzending worden gezet.")
    }
    return this.updateCommunicationTemplates({
      id,
      audience: "consumers",
      ready_to_send: true,
    })
  }

  async createVariant(input: {
    template_id: string
    name: string
    locale: string
  }) {
    const template_id = input.template_id.trim()
    if (!template_id) {
      invalid("template_variant vereist template_id, naam en locale.")
    }
    const identity = this.variantIdentity(input)
    await this.retrieveCommunicationTemplate(template_id)
    await this.assertVariantNameAvailable(template_id, identity.name)
    return this.createCommunicationTemplateVariants({
      template_id,
      name: identity.name,
      locale: identity.locale,
    })
  }

  /**
   * Naam en locale. De variant blijft bij dezelfde template.
   */
  async updateVariant(input: {
    id: string
    template_id?: string
    name?: string
    locale?: string
  }) {
    const id = input.id.trim()
    if (!id) invalid("template_variant vereist een id.")
    const current = (await this.retrieveCommunicationTemplateVariant(id)) as {
      id: string
      template_id: string
      name: string
      locale: string
    }
    if (
      input.template_id !== undefined &&
      input.template_id.trim() !== current.template_id
    ) {
      invalid("Een TemplateVariant blijft bij dezelfde CommunicationTemplate.")
    }
    const identity = this.variantIdentity({
      name: input.name === undefined ? current.name : input.name,
      locale: input.locale === undefined ? current.locale : input.locale,
    })
    if (identity.name !== current.name) {
      await this.assertVariantNameAvailable(
        current.template_id,
        identity.name,
        id
      )
    }
    return this.updateCommunicationTemplateVariants({
      id,
      name: identity.name,
      locale: identity.locale,
    })
  }

  async createVersion(input: {
    variant_id: string
    subject: string
    preheader: string
    body: string
    cta_label: string
    cta_url?: string | null
    personalization_tokens?: unknown
    version_number?: number
    approval_status?: string
    activation_status?: string
  }) {
    const variant_id = input.variant_id.trim()
    if (!variant_id) invalid("template_version vereist variant_id.")
    await this.retrieveCommunicationTemplateVariant(variant_id)

    let tokens: string[]
    try {
      tokens = normalizeTokenWhitelist(input.personalization_tokens ?? [])
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }

    const version_number =
      input.version_number ?? (await this.nextVersionNumber(variant_id))
    if (!Number.isInteger(version_number) || version_number < 1) {
      invalid("version_number moet een geheel getal vanaf 1 zijn.")
    }
    let createdStatus: { approval_status: "draft"; activation_status: "inactive" }
    try {
      createdStatus = assertCreatedVersionStatus(input)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }

    return this.createCommunicationTemplateVersions({
      variant_id,
      version_number,
      subject: input.subject,
      preheader: input.preheader,
      body: input.body,
      cta_label: input.cta_label,
      cta_url: input.cta_url?.trim() || null,
      personalization_tokens: tokens as unknown as Record<string, unknown>,
      approval_status: createdStatus.approval_status,
      activation_status: createdStatus.activation_status,
      approved_at: null,
      approved_by: null,
      used_at: null,
    })
  }

  /**
   * Alleen approval/activation. Inhoud hoort in een nieuwe version.
   * Een version met used_at wijzigt niet. Dit verzendt niets.
   */
  async transitionVersion(input: {
    id: string
    approval_status?: string
    activation_status?: string
    approved_by?: string | null
  }) {
    const contentKeys = contentFieldsInPatch(input)
    if (contentKeys.length > 0) {
      notAllowed(
        `Inhoud van een TemplateVersion wijzigt niet (${contentKeys.join(", ")}). Maak een nieuwe version.`
      )
    }
    const current = (await this.retrieveCommunicationTemplateVersion(
      input.id
    )) as TemplateVersionRow
    let next: { approval_status: ApprovalStatus; activation_status: ActivationStatus }
    try {
      next = resolveVersionTransition(current, input)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (current.used_at) notAllowed(message)
      invalid(message)
    }

    const audit = approvalAudit(
      current,
      next,
      input.approved_by ?? null,
      new Date()
    )

    return this.generatedVersions().updateCommunicationTemplateVersions.call(
      this,
      {
        id: input.id,
        approval_status: next.approval_status,
        activation_status: next.activation_status,
        approved_at: audit.approved_at,
        approved_by: audit.approved_by,
      }
    )
  }

  /**
   * Verwijdert een ongebruikt bericht volledig: template, varianten en conceptversies.
   * Actief, goedgekeurd, gebruikt, gekoppeld aan een automatisering of aanwezig in
   * de communicatiehistorie blijft staan. Historie wordt nooit gewist.
   * Er wordt niets verzonden.
   */
  async deleteUnusedTemplate(id: string): Promise<void> {
    const templateId = id.trim()
    if (!templateId) invalid("communication_template vereist een id.")
    await this.retrieveCommunicationTemplate(templateId)
    const variants = (await this.listCommunicationTemplateVariants(
      { template_id: templateId },
      { take: 50, relations: ["versions"] }
    )) as Array<{ id: string; versions?: TemplateVersionRow[] }>
    const versions = variants.flatMap((variant) => variant.versions ?? [])
    const steps = (await this.listEngagementSequenceSteps(
      { template_id: templateId },
      { take: 1 }
    )) as Array<{ id: string }>
    const events = (await this.listEngagementCommunicationEvents(
      { template_id: templateId },
      { take: 1 }
    )) as Array<{ id: string }>
    try {
      assertTemplateDeletable({
        versions,
        sequenceStepCount: steps.length,
        historyCount: events.length,
      })
    } catch (err) {
      notAllowed(err instanceof Error ? err.message : String(err))
    }
    const versionIds = versions.map((version) => version.id).filter(Boolean)
    if (versionIds.length > 0) {
      await this.softDeleteCommunicationTemplateVersions(versionIds)
    }
    const variantIds = variants.map((variant) => variant.id).filter(Boolean)
    if (variantIds.length > 0) {
      await this.softDeleteCommunicationTemplateVariants(variantIds)
    }
    await this.softDeleteCommunicationTemplates([templateId])
  }

  /**
   * Verwijdert een ongebruikt concept. Actief, goedgekeurd of gebruikt blijft staan.
   * Er wordt niets verzonden.
   */
  async deleteVersion(id: string) {
    const versionId = id.trim()
    if (!versionId) invalid("Version vereist een id.")
    const current = (await this.retrieveCommunicationTemplateVersion(versionId)) as TemplateVersionRow
    try {
      assertVersionDeletable(current)
    } catch (err) {
      notAllowed(err instanceof Error ? err.message : String(err))
    }
    await this.softDeleteCommunicationTemplateVersions([versionId])
    return current
  }

  /**
   * Inhoud van een ongebruikt concept mag worden bijgewerkt.
   * Een goedgekeurde, actieve of gebruikte version blijft onwijzigbaar.
   * Dit verzendt niets.
   */
  async updateVersion(input: {
    id: string
    subject?: string
    preheader?: string
    body?: string
    cta_label?: string
    cta_url?: string | null
    personalization_tokens?: unknown
    version_number?: number
    variant_id?: string
  }): Promise<TemplateVersionRow> {
    const current = (await this.retrieveCommunicationTemplateVersion(
      input.id
    )) as TemplateVersionRow
    if (
      input.version_number !== undefined ||
      (input.variant_id !== undefined &&
        input.variant_id.trim() !== current.variant_id)
    ) {
      notAllowed("Versienummer en taal blijven staan.")
    }
    try {
      refuseVersionContentChange(current, input)
    } catch (err) {
      notAllowed(err instanceof Error ? err.message : String(err))
    }
    if (
      current.used_at ||
      current.approval_status !== "draft" ||
      current.activation_status !== "inactive"
    ) {
      notAllowed(
        "Deze versie is actief of al gebruikt en kan niet worden gewijzigd."
      )
    }

    let tokens: string[] | undefined
    if (input.personalization_tokens !== undefined) {
      try {
        tokens = normalizeTokenWhitelist(input.personalization_tokens)
      } catch (err) {
        invalid(err instanceof Error ? err.message : String(err))
      }
    }

    const data: Record<string, unknown> = { id: input.id }
    if (input.subject !== undefined) data.subject = input.subject
    if (input.preheader !== undefined) data.preheader = input.preheader
    if (input.body !== undefined) data.body = input.body
    if (input.cta_label !== undefined) data.cta_label = input.cta_label
    if (input.cta_url !== undefined) data.cta_url = input.cta_url?.trim() || null
    if (tokens) {
      data.personalization_tokens = tokens as unknown as Record<string, unknown>
    }
    return this.generatedVersions().updateCommunicationTemplateVersions.call(
      this,
      data
    )
  }

  /**
   * Markeert de version als gebruikt zodat zij daarna onwijzigbaar is.
   * Alleen bij approved + active. Geen provider-aanroep.
   */
  async markVersionUsed(id: string) {
    const current = (await this.retrieveCommunicationTemplateVersion(
      id
    )) as TemplateVersionRow
    if (current.used_at) return current
    if (!isSendableVersion(current)) {
      notAllowed(
        "Alleen een version met approval approved en activation active kan als gebruikt worden gemarkeerd."
      )
    }
    return this.generatedVersions().updateCommunicationTemplateVersions.call(
      this,
      { id, used_at: new Date() }
    )
  }

  updateCommunicationTemplateVersions = async (): Promise<never> => {
    notAllowed(
      "TemplateVersion-inhoud is onwijzigbaar. Gebruik transitionVersion voor status, of maak een nieuwe version."
    )
  }

  deleteCommunicationTemplateVersions = async (): Promise<never> => {
    notAllowed("TemplateVersion wordt niet hard verwijderd.")
  }

  softDeleteCommunicationTemplateVersions = async (
    ids: string | string[]
  ): Promise<void> => {
    const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean)
    for (const id of list) {
      const current = (await this.retrieveCommunicationTemplateVersion(
        id
      )) as TemplateVersionRow
      if (current.used_at) {
        notAllowed("Een gebruikte TemplateVersion kan niet worden verwijderd.")
      }
    }
    await this.generatedVersions().softDeleteCommunicationTemplateVersions.call(
      this,
      list
    )
  }

  private generatedVersions() {
    return Object.getPrototypeOf(EngagementModuleService.prototype) as {
      updateCommunicationTemplateVersions: (
        data: Record<string, unknown>
      ) => Promise<TemplateVersionRow>
      softDeleteCommunicationTemplateVersions: (
        ids: string[]
      ) => Promise<unknown>
    }
  }

  private organizationIdentity(input: {
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
    try {
      return planOrganizationIdentity(input)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private contactIdentity(input: {
    organization_id: string
    email: string
    name?: string | null
  }) {
    try {
      return planContactIdentity(input)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private async organizationRoleRows(organization_id: string) {
    return (await this.listEngagementOrganizationRoles(
      { organization_id },
      { take: 100 }
    )) as { id: string; role: string }[]
  }

  private async assertContactEmailAvailable(
    organization_id: string,
    email: string,
    ignoreId?: string
  ) {
    const rows = (await this.listEngagementContacts(
      { organization_id },
      { take: 1000 }
    )) as { id: string; email: string }[]
    try {
      assertContactEmailAvailable(
        rows
          .filter((row) => row.id !== ignoreId)
          .map((row) => row.email.trim().toLowerCase()),
        email
      )
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private templateAudience(
    communicationType: string,
    requested: string | null | undefined,
    current: string | null
  ): string | null {
    try {
      return planTemplateAudience(communicationType, requested, current)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private templateIdentity(input: {
    name: string
    communication_type: string
  }) {
    try {
      return normalizeTemplateIdentity(input)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private variantIdentity(input: { name: string; locale: string }) {
    try {
      return normalizeVariantIdentity(input)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private async assertVariantNameAvailable(
    template_id: string,
    name: string,
    ignoreId?: string
  ) {
    const rows = (await this.listCommunicationTemplateVariants(
      { template_id },
      { take: 1000 }
    )) as { id: string; name: string }[]
    try {
      assertVariantNameAvailable(
        rows.filter((row) => row.id !== ignoreId).map((row) => row.name),
        name
      )
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private async nextVersionNumber(variant_id: string): Promise<number> {
    const existing = (await this.listCommunicationTemplateVersions(
      { variant_id },
      { take: 1000, order: { version_number: "DESC" } }
    )) as TemplateVersionRow[]
    const latest = existing[0]?.version_number ?? 0
    return Number(latest) + 1
  }

  async createImportBatch(input?: { source?: string; file_name?: string | null }) {
    const source = input?.source?.trim() || DEFAULT_ORGANIZATION_SOURCE
    const file_name = input?.file_name?.trim() || null
    return this.createEngagementImportBatches({ source, file_name })
  }

  /**
   * CRM-bedrijf. Zonder rollen wordt `[unknown]` gezet.
   * Schrijft niet naar seller, customer of catalogus-brand en start geen outreach.
   */
  async createOrganization(input: {
    company_name: string
    website?: string | null
    category?: string | null
    sales_model?: string
    outreach_status?: string
    source?: string
    import_batch_id?: string | null
    outreach_purpose?: string | null
    self_classification_payload?: Record<string, unknown> | null
    roles?: string[]
    converted_customer_id?: string | null
    converted_seller_id?: string | null
  }) {
    try {
      refuseManualConversionChange(input)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
    const identity = this.organizationIdentity(input)
    const import_batch_id = input.import_batch_id?.trim() || null
    if (import_batch_id) {
      await this.retrieveEngagementImportBatch(import_batch_id)
    }

    let roles: OrganizationRoleValue[]
    try {
      roles = normalizeOrganizationRoles(input.roles)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }

    const organization = await this.createEngagementOrganizations({
      ...identity,
      import_batch_id,
      converted_customer_id: null,
      converted_seller_id: null,
    })

    const createdRoles = await Promise.all(
      roles.map((role) =>
        this.createEngagementOrganizationRoles({
          organization_id: organization.id,
          role,
        })
      )
    )
    return { organization, roles: createdRoles }
  }

  /**
   * Alleen CRM-velden. Conversierefs blijven onaangeroerd.
   */
  async updateOrganization(input: {
    id: string
    company_name?: string
    website?: string | null
    category?: string | null
    sales_model?: string
    outreach_status?: string
    source?: string
    outreach_purpose?: string | null
    self_classification_payload?: Record<string, unknown> | null
  }) {
    const id = input.id.trim()
    if (!id) invalid("Organization vereist een id.")
    const current = (await this.retrieveEngagementOrganization(id)) as {
      company_name: string
      website: string | null
      category: string | null
      sales_model: string
      outreach_status: string
      source: string
      outreach_purpose: string | null
      self_classification_payload: Record<string, unknown> | null
    }
    const identity = this.organizationIdentity({
      company_name: input.company_name ?? current.company_name,
      website: input.website === undefined ? current.website : input.website,
      category: input.category === undefined ? current.category : input.category,
      sales_model: input.sales_model ?? current.sales_model,
      outreach_status: input.outreach_status ?? current.outreach_status,
      current_outreach_status: current.outreach_status,
      source: input.source ?? current.source,
      outreach_purpose:
        input.outreach_purpose === undefined
          ? current.outreach_purpose
          : input.outreach_purpose,
      self_classification_payload:
        input.self_classification_payload === undefined
          ? current.self_classification_payload
          : input.self_classification_payload,
    })
    return this.updateEngagementOrganizations({ id, ...identity })
  }

  async addOrganizationRole(input: { organization_id: string; role: string }) {
    const organization_id = input.organization_id.trim()
    if (!organization_id) invalid("OrganizationRole vereist organization_id.")
    await this.retrieveEngagementOrganization(organization_id)
    let roles: OrganizationRoleValue[]
    try {
      roles = normalizeOrganizationRoles([input.role])
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
    const existing = await this.organizationRoleRows(organization_id)
    try {
      assertRoleAvailable(
        existing.map((row) => row.role),
        roles[0]
      )
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
    return this.createEngagementOrganizationRoles({
      organization_id,
      role: roles[0],
    })
  }

  /**
   * Haalt een rol uit de set. Een lege set wordt weer `[unknown]`.
   */
  async removeOrganizationRole(input: { organization_id: string; role: string }) {
    const organization_id = input.organization_id.trim()
    if (!organization_id) invalid("OrganizationRole vereist organization_id.")
    await this.retrieveEngagementOrganization(organization_id)
    const existing = await this.organizationRoleRows(organization_id)
    let plan: { remove: OrganizationRoleValue; restoreUnknown: boolean }
    try {
      plan = planRoleRemoval(
        existing.map((row) => row.role),
        input.role.trim()
      )
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
    const row = existing.find((item) => item.role === plan.remove)
    if (!row) invalid(`Rol "${plan.remove}" staat niet op deze organisatie.`)
    await this.softDeleteEngagementOrganizationRoles([row.id])
    if (plan.restoreUnknown) {
      await this.createEngagementOrganizationRoles({
        organization_id,
        role: DEFAULT_ORGANIZATION_ROLE,
      })
    }
  }

  async createContact(input: {
    organization_id: string
    email: string
    name?: string | null
  }) {
    const identity = this.contactIdentity(input)
    await this.retrieveEngagementOrganization(identity.organization_id)
    await this.assertContactEmailAvailable(
      identity.organization_id,
      identity.email
    )
    return this.createEngagementContacts(identity)
  }

  /**
   * Naam en e-mail. Het contact blijft bij dezelfde organisatie.
   */
  async updateContact(input: {
    id: string
    organization_id?: string
    email?: string
    name?: string | null
  }) {
    const id = input.id.trim()
    if (!id) invalid("Contact vereist een id.")
    const current = (await this.retrieveEngagementContact(id)) as {
      id: string
      organization_id: string
      email: string
      name: string | null
    }
    if (
      input.organization_id !== undefined &&
      input.organization_id.trim() !== current.organization_id
    ) {
      invalid("Een contact blijft bij dezelfde organisatie.")
    }
    const identity = this.contactIdentity({
      organization_id: current.organization_id,
      email: input.email === undefined ? current.email : input.email,
      name: input.name === undefined ? current.name : input.name,
    })
    if (identity.email !== current.email.trim().toLowerCase()) {
      await this.assertContactEmailAvailable(
        current.organization_id,
        identity.email,
        id
      )
    }
    return this.updateEngagementContacts({
      id,
      email: identity.email,
      name: identity.name,
    })
  }

  /**
   * Programmadefinitie. Meerdere programma's per program_type zijn toegestaan.
   * Start geen enrollment en verzendt niets.
   */
  async createLifecycleProgram(input: {
    name: string
    program_type: string
    start_trigger?: string | null
  }) {
    const name = input.name.trim()
    if (!name) invalid("LifecycleProgram vereist een naam.")
    const program_type = this.programType(input.program_type)
    const start_trigger = this.startTrigger(input.start_trigger)
    await this.assertProgramNameAvailable(program_type, name)
    return this.createEngagementLifecyclePrograms({
      name,
      program_type,
      start_trigger,
      activation_status: "concept",
    })
  }

  async updateLifecycleProgram(input: {
    id: string
    name?: string
    program_type?: string
    start_trigger?: string | null
    start_mode?: string | null
    scheduled_at?: string | null
    schedule_timezone?: string | null
    audience?: string | null
    selection_criteria?: unknown
    activate?: boolean
  }) {
    const id = input.id.trim()
    if (!id) invalid("LifecycleProgram vereist een id.")
    const current = (await this.retrieveEngagementLifecycleProgram(
      id
    )) as ProgramRow
    const name = input.name === undefined ? current.name : input.name.trim()
    if (!name) invalid("LifecycleProgram vereist een naam.")
    const program_type =
      input.program_type === undefined
        ? this.programType(current.program_type)
        : this.programType(input.program_type)
    const start = this.programStart(program_type, current, input)
    const currentMode =
      current.start_mode ??
      (current.start_trigger ? findStartTrigger(current.start_trigger)?.kind ?? null : null)
    const startChanged =
      start.start_mode !== currentMode ||
      start.start_trigger !== (current.start_trigger ?? null) ||
      start.scheduled_at !== (current.scheduled_at ?? null) ||
      start.schedule_timezone !== (current.schedule_timezone ?? null) ||
      (start.start_mode === "scheduled" && start.audience !== (current.audience ?? null))
    const selection_criteria =
      program_type === "newsletter" || program_type === "campaign"
        ? storedCampaignCriteria(
            input.selection_criteria === undefined
              ? current.selection_criteria
              : input.selection_criteria
          )
        : null
    const criteriaChanged =
      JSON.stringify(selection_criteria) !==
      JSON.stringify(storedCampaignCriteria(current.selection_criteria))
    const activation_status = input.activate
      ? "active"
      : startChanged || criteriaChanged
        ? "concept"
        : current.activation_status === "active"
          ? "active"
          : "concept"
    if (input.activate) {
      const problems = await this.activationProblems({
        ...current,
        name,
        program_type,
        ...start,
      })
      if (problems.length > 0) invalid(problems.join("\n"))
    }
    if (name !== current.name || program_type !== current.program_type) {
      await this.assertProgramNameAvailable(program_type, name, id)
    }
    if (program_type !== current.program_type) {
      const enrollments = (await this.listEngagementEnrollments(
        { program_id: id },
        { take: 1 }
      )) as EnrollmentRow[]
      if (enrollments.length > 0) {
        invalid(
          "program_type wijzigt niet zolang er enrollments naar dit programma zijn."
        )
      }
      await this.assertStepsMatchProgram(id, program_type)
    }
    return this.updateEngagementLifecyclePrograms({
      id,
      name,
      program_type,
      start_trigger: start.start_trigger,
      start_mode: start.start_mode,
      scheduled_at: start.scheduled_at,
      schedule_timezone: start.schedule_timezone,
      audience: start.audience,
      selection_criteria,
      activation_status,
    })
  }

  private async activationProblems(program: ProgramRow): Promise<string[]> {
    const sequences = (await this.listEngagementSequences(
      { program_id: program.id },
      { take: 20 }
    )) as Array<{ id: string }>
    const steps: StepRow[] = []
    for (const sequence of sequences) {
      const rows = (await this.listEngagementSequenceSteps(
        { sequence_id: sequence.id },
        { take: 50 }
      )) as StepRow[]
      steps.push(...rows)
    }
    const described = []
    for (const step of steps) {
      const template = (await this.retrieveCommunicationTemplate(step.template_id)) as TemplateRefRow & {
        name?: string
      }
      const versions = (await this.listCommunicationTemplateVersions(
        { variant_id: step.variant_id },
        { take: 50 }
      )) as TemplateVersionRow[]
      described.push({
        template_name: template.name?.trim() || "dit bericht",
        sendable: versions.some((version) => isSendableVersion(version)),
        type_matches: template.communication_type === program.program_type,
      })
    }
    return programActivationErrors({
      name: program.name,
      programType: program.program_type,
      start_mode: program.start_mode,
      start_trigger: program.start_trigger,
      scheduled_at: program.scheduled_at,
      schedule_timezone: program.schedule_timezone,
      audience: program.audience,
      steps: described,
    })
  }

  async createSequence(input: { program_id: string; name: string }) {
    const program_id = input.program_id.trim()
    const name = input.name.trim()
    if (!program_id) invalid("Sequence vereist program_id.")
    if (!name) invalid("Sequence vereist een naam.")
    await this.retrieveEngagementLifecycleProgram(program_id)
    await this.assertSequenceNameAvailable(program_id, name)
    return this.createEngagementSequences({ program_id, name })
  }

  async updateSequence(input: {
    id: string
    program_id?: string
    name?: string
  }) {
    const id = input.id.trim()
    if (!id) invalid("Sequence vereist een id.")
    const current = (await this.retrieveEngagementSequence(id)) as SequenceRow
    const program_id =
      input.program_id === undefined
        ? current.program_id
        : input.program_id.trim()
    const name = input.name === undefined ? current.name : input.name.trim()
    if (!program_id) invalid("Sequence vereist program_id.")
    if (!name) invalid("Sequence vereist een naam.")
    const program = (await this.retrieveEngagementLifecycleProgram(
      program_id
    )) as ProgramRow
    if (name !== current.name || program_id !== current.program_id) {
      await this.assertSequenceNameAvailable(program_id, name, id)
    }
    if (program_id !== current.program_id) {
      const enrollments = (await this.listEngagementEnrollments(
        { sequence_id: id },
        { take: 1 }
      )) as EnrollmentRow[]
      if (enrollments.length > 0) {
        invalid(
          "Een sequence met enrollments blijft bij hetzelfde LifecycleProgram."
        )
      }
      await this.assertSequenceStepsMatchProgram(id, program.program_type)
    }
    return this.updateEngagementSequences({ id, program_id, name })
  }

  /**
   * Stapdefinitie: volgorde, delay en template/variant-ids.
   * Geen inhoud en geen next_step_at.
   */
  async createSequenceStep(input: {
    sequence_id: string
    step_order: number
    delay_minutes?: number
    template_id: string
    variant_id: string
  }) {
    const sequence_id = input.sequence_id.trim()
    if (!sequence_id) invalid("SequenceStep vereist sequence_id.")
    const step_order = this.stepOrder(input.step_order)
    const delay_minutes = this.delayMinutes(input.delay_minutes ?? 0)
    const refs = await this.resolveStepRefs(sequence_id, {
      template_id: input.template_id,
      variant_id: input.variant_id,
    })
    const existing = await this.stepsInSequence(sequence_id)
    this.uniqueOrder(
      existing.map((step) => Number(step.step_order)),
      step_order
    )
    return this.createEngagementSequenceSteps({
      sequence_id,
      step_order,
      delay_minutes,
      template_id: refs.template_id,
      variant_id: refs.variant_id,
    })
  }

  async updateSequenceStep(input: {
    id: string
    step_order?: number
    delay_minutes?: number
    template_id?: string
    variant_id?: string
  }) {
    const id = input.id.trim()
    if (!id) invalid("SequenceStep vereist een id.")
    const current = (await this.retrieveEngagementSequenceStep(id)) as StepRow
    const step_order =
      input.step_order === undefined
        ? Number(current.step_order)
        : this.stepOrder(input.step_order)
    const delay_minutes =
      input.delay_minutes === undefined
        ? Number(current.delay_minutes)
        : this.delayMinutes(input.delay_minutes)
    const refs = await this.resolveStepRefs(current.sequence_id, {
      template_id: input.template_id ?? current.template_id,
      variant_id: input.variant_id ?? current.variant_id,
    })
    if (step_order !== Number(current.step_order)) {
      const existing = await this.stepsInSequence(current.sequence_id)
      this.uniqueOrder(
        existing
          .filter((step) => step.id !== id)
          .map((step) => Number(step.step_order)),
        step_order
      )
    }
    return this.updateEngagementSequenceSteps({
      id,
      step_order,
      delay_minutes,
      template_id: refs.template_id,
      variant_id: refs.variant_id,
    })
  }

  /**
   * Verwijdert een step zonder enrollment-rijen te wijzigen.
   * Een step waar een enrollment naar verwijst blijft staan.
   */
  async deleteSequenceStep(id: string) {
    const stepId = id.trim()
    if (!stepId) invalid("SequenceStep vereist een id.")
    await this.retrieveEngagementSequenceStep(stepId)
    const enrollments = (await this.listEngagementEnrollments(
      { sequence_step_id: stepId },
      { take: 1 }
    )) as { id: string }[]
    try {
      assertStepDeletable(enrollments.length > 0)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
    await this.softDeleteEngagementSequenceSteps([stepId])
  }

  /**
   * Zet de vaste volgorde van alle steps in één sequence.
   * Plant geen next_step_at.
   */
  async orderSequenceSteps(input: {
    sequence_id: string
    steps: { id: string; step_order: number }[]
  }) {
    const sequence_id = input.sequence_id.trim()
    if (!sequence_id) invalid("SequenceStep vereist sequence_id.")
    await this.retrieveEngagementSequence(sequence_id)
    const existing = await this.stepsInSequence(sequence_id)
    const wanted = new Map<string, number>()
    try {
      for (const step of input.steps) {
        const id = step.id.trim()
        if (!id || wanted.has(id)) {
          invalid("orderSequenceSteps bevat een ongeldige of dubbele step.")
        }
        wanted.set(id, normalizeStepOrder(step.step_order))
      }
      assertStepOrderSet([...wanted.values()])
    } catch (err) {
      if (err instanceof MedusaError) throw err
      invalid(err instanceof Error ? err.message : String(err))
    }
    if (
      wanted.size !== existing.length ||
      existing.some((step) => !wanted.has(step.id))
    ) {
      invalid("orderSequenceSteps vereist precies de steps van deze sequence.")
    }

    const current = new Map(
      existing.map((step) => [step.id, Number(step.step_order)])
    )
    let guard = existing.length + 2
    while ([...wanted].some(([id, order]) => current.get(id) !== order)) {
      if (guard-- <= 0) invalid("Sequence-steps konden niet worden herordend.")
      const occupied = new Set(current.values())
      const movable = [...wanted].find(
        ([id, order]) => current.get(id) !== order && !occupied.has(order)
      )
      if (movable) {
        await this.updateEngagementSequenceSteps({
          id: movable[0],
          step_order: movable[1],
        })
        current.set(movable[0], movable[1])
        continue
      }
      const blocked = [...wanted].find(([id, order]) => current.get(id) !== order)
      if (!blocked) break
      const parking = Math.max(...occupied, ...wanted.values()) + 1
      await this.updateEngagementSequenceSteps({
        id: blocked[0],
        step_order: parking,
      })
      current.set(blocked[0], parking)
    }
    return this.stepsInSequence(sequence_id)
  }

  private programType(value: string) {
    try {
      return normalizeProgramType(value)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private startTrigger(value: string | null | undefined) {
    try {
      return assertStartTrigger(value)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private programStart(
    programType: string,
    current: ProgramRow,
    input: {
      start_mode?: string | null
      start_trigger?: string | null
      scheduled_at?: string | null
      schedule_timezone?: string | null
      audience?: string | null
    }
  ) {
    const planning =
      input.start_mode !== undefined ||
      input.scheduled_at !== undefined ||
      input.schedule_timezone !== undefined ||
      input.audience !== undefined
    if (!planning && input.start_trigger === undefined) {
      return {
        start_mode: current.start_mode ?? null,
        start_trigger: current.start_trigger ?? null,
        scheduled_at: current.scheduled_at ?? null,
        schedule_timezone: current.schedule_timezone ?? null,
        audience: current.audience ?? null,
      }
    }
    try {
      return planProgramStart({
        programType,
        start_mode:
          input.start_mode === undefined
            ? input.start_trigger
              ? "event"
              : current.start_mode
            : input.start_mode,
        start_trigger:
          input.start_trigger === undefined ? current.start_trigger : input.start_trigger,
        scheduled_at:
          input.scheduled_at === undefined ? current.scheduled_at : input.scheduled_at,
        schedule_timezone:
          input.schedule_timezone === undefined
            ? current.schedule_timezone
            : input.schedule_timezone,
        audience: input.audience === undefined ? current.audience : input.audience,
      })
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private async assertApprovedForSchedule(templateId: string) {
    const variants = (await this.listCommunicationTemplateVariants(
      { template_id: templateId },
      { take: 50, relations: ["versions"] }
    )) as Array<{ versions?: Array<{ approval_status?: string }> }>
    const approved = variants.some((variant) =>
      (variant.versions ?? []).some((version) => version.approval_status === "approved")
    )
    if (!approved) invalid("Dit bericht kan pas worden gepland nadat het is goedgekeurd.")
  }

  private stepOrder(value: number) {
    try {
      return normalizeStepOrder(value)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private delayMinutes(value: number) {
    try {
      return normalizeDelayMinutes(value)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private uniqueOrder(existingOrders: number[], stepOrder: number) {
    try {
      assertUniqueStepOrder(existingOrders, stepOrder)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private async assertProgramNameAvailable(
    program_type: string,
    name: string,
    ignoreId?: string
  ) {
    const rows = (await this.listEngagementLifecyclePrograms(
      { program_type, name },
      { take: 2 }
    )) as ProgramRow[]
    if (rows.some((row) => row.id !== ignoreId)) {
      invalid(
        "Er bestaat al een LifecycleProgram met deze naam voor dit program_type."
      )
    }
  }

  private async assertSequenceNameAvailable(
    program_id: string,
    name: string,
    ignoreId?: string
  ) {
    const rows = (await this.listEngagementSequences(
      { program_id, name },
      { take: 2 }
    )) as SequenceRow[]
    if (rows.some((row) => row.id !== ignoreId)) {
      invalid("Er bestaat al een Sequence met deze naam in dit programma.")
    }
  }

  private async stepsInSequence(sequence_id: string): Promise<StepRow[]> {
    return (await this.listEngagementSequenceSteps(
      { sequence_id },
      { take: 1000, order: { step_order: "ASC" } }
    )) as StepRow[]
  }

  private async assertStepsMatchProgram(
    program_id: string,
    program_type: string
  ) {
    const sequences = (await this.listEngagementSequences(
      { program_id },
      { take: 1000 }
    )) as SequenceRow[]
    for (const sequence of sequences) {
      await this.assertSequenceStepsMatchProgram(sequence.id, program_type)
    }
  }

  private async assertSequenceStepsMatchProgram(
    sequence_id: string,
    program_type: string
  ) {
    const steps = await this.stepsInSequence(sequence_id)
    for (const step of steps) {
      const template = (await this.retrieveCommunicationTemplate(
        step.template_id
      )) as TemplateRefRow
      try {
        assertTemplateMatchesProgram({
          program_type,
          communication_type: template.communication_type,
        })
      } catch (err) {
        invalid(err instanceof Error ? err.message : String(err))
      }
    }
  }

  private async resolveStepRefs(
    sequence_id: string,
    input: { template_id: string; variant_id: string }
  ) {
    const sequence = (await this.retrieveEngagementSequence(
      sequence_id
    )) as SequenceRow
    const program = (await this.retrieveEngagementLifecycleProgram(
      sequence.program_id
    )) as ProgramRow
    const template_id = input.template_id.trim()
    const variant_id = input.variant_id.trim()
    if (!template_id || !variant_id) {
      invalid("SequenceStep vereist template_id en variant_id.")
    }
    const template = (await this.retrieveCommunicationTemplate(
      template_id
    )) as TemplateRefRow
    const variant = (await this.retrieveCommunicationTemplateVariant(
      variant_id
    )) as VariantRefRow
    try {
      assertVariantBelongsToTemplate({
        template_id,
        variant_template_id: variant.template_id,
      })
      assertTemplateMatchesProgram({
        program_type: program.program_type,
        communication_type: template.communication_type,
      })
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
    return { template_id, variant_id }
  }

  /**
   * Idempotente deelname. Hetzelfde trigger_key geeft de bestaande enrollment terug.
   * Start geen sequence en verzendt niets.
   */
  async enrollContact(input: {
    contact_id: string
    program_id: string
    sequence_id: string
    sequence_step_id: string
    trigger_key: string
    entry_source: string
    status?: string
    next_step_at?: Date | string | null
  }) {
    const graph = await this.loadEnrollmentGraph(input)
    const trigger_key = input.trigger_key.trim()
    const entry_source = input.entry_source.trim()
    if (!entry_source) invalid("Enrollment vereist een entry_source.")
    const existingRows = (await this.listEngagementEnrollments(
      { contact_id: graph.contact_id, trigger_key },
      { take: 5 }
    )) as EnrollmentRow[]
    let existing: EnrollmentRow | null
    try {
      existing = matchExistingTrigger(existingRows, trigger_key)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
    if (existing) return existing

    const status = input.status
      ? this.enrollmentStatus(input.status)
      : "active"
    const program_type = this.programType(graph.program_type)
    await this.assertParticipationAllowed(
      graph.contact_id,
      program_type,
      status
    )
    return this.createEngagementEnrollments({
      contact_id: graph.contact_id,
      organization_id: graph.organization_id,
      program_id: graph.program_id,
      sequence_id: graph.sequence_id,
      sequence_step_id: graph.sequence_step_id,
      program_type,
      status,
      next_step_at: this.optionalDate(input.next_step_at),
      entry_source,
      trigger_key,
    })
  }

  /**
   * Deelname van een consument of affiliate. Zelfde trigger_key enrollt niet opnieuw.
   * Geen verzending.
   */
  async enrollRecipient(input: {
    consumer_id?: string | null
    affiliate_id?: string | null
    program_id: string
    sequence_id: string
    sequence_step_id: string
    trigger_key: string
    entry_source: string
    next_step_at?: Date | string | null
  }) {
    const consumer_id = input.consumer_id?.trim() || ""
    const affiliate_id = input.affiliate_id?.trim() || ""
    if ((consumer_id && affiliate_id) || (!consumer_id && !affiliate_id)) {
      invalid("Enrollment vereist precies één ontvanger.")
    }
    const trigger_key = input.trigger_key.trim()
    const entry_source = input.entry_source.trim()
    if (!trigger_key || !entry_source) invalid("Enrollment vereist een startmoment.")
    const filters = consumer_id
      ? { consumer_id, trigger_key }
      : { affiliate_id, trigger_key }
    const existing = (await this.listEngagementEnrollments(filters, { take: 1 })) as EnrollmentRow[]
    if (existing[0]) return existing[0]
    if (consumer_id) await this.retrieveEngagementConsumer(consumer_id)
    const program_id = input.program_id.trim()
    const sequence_id = input.sequence_id.trim()
    const sequence_step_id = input.sequence_step_id.trim()
    const program = (await this.retrieveEngagementLifecycleProgram(program_id)) as ProgramRow
    const sequence = (await this.retrieveEngagementSequence(sequence_id)) as SequenceRow
    const step = (await this.retrieveEngagementSequenceStep(sequence_step_id)) as StepRow
    if (sequence.program_id !== program_id || step.sequence_id !== sequence_id) {
      invalid("De stap hoort niet bij deze automatisering.")
    }
    const program_type = this.programType(program.program_type)
    const active = (await this.listEngagementEnrollments(
      consumer_id
        ? { consumer_id, status: "active" }
        : { affiliate_id, status: "active" },
      { take: 20 }
    )) as EnrollmentRow[]
    try {
      assertCanActivateEnrollment({
        programType: program_type,
        existingActiveProgramTypes: active.map((row) => row.program_type),
      })
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
    try {
      return await this.createEngagementEnrollments({
        contact_id: null,
        organization_id: null,
        consumer_id: consumer_id || null,
        affiliate_id: affiliate_id || null,
        program_id,
        sequence_id,
        sequence_step_id,
        program_type,
        status: "active",
        next_step_at: this.optionalDate(input.next_step_at),
        entry_source,
        trigger_key,
      })
    } catch (err) {
      const again = (await this.listEngagementEnrollments(filters, { take: 1 })) as EnrollmentRow[]
      if (again[0]) return again[0]
      throw err
    }
  }

  async updateEnrollment(input: {
    id: string
    status?: string
    next_step_at?: Date | string | null
    sequence_step_id?: string
  }) {
    const id = input.id.trim()
    if (!id) invalid("Enrollment vereist een id.")
    const current = (await this.retrieveEngagementEnrollment(id)) as EnrollmentRow
    const status =
      input.status === undefined
        ? this.enrollmentStatus(current.status)
        : this.enrollmentStatus(input.status)
    const sequence_step_id =
      input.sequence_step_id === undefined
        ? current.sequence_step_id
        : input.sequence_step_id.trim()
    if (!sequence_step_id) invalid("Enrollment vereist sequence_step_id.")
    if (sequence_step_id !== current.sequence_step_id) {
      const step = (await this.retrieveEngagementSequenceStep(
        sequence_step_id
      )) as StepRow
      if (step.sequence_id !== current.sequence_id) {
        invalid("SequenceStep hoort niet bij de sequence van deze enrollment.")
      }
    }
    if (isActiveEnrollmentStatus(status) && !isActiveEnrollmentStatus(current.status)) {
      await this.assertParticipationAllowed(
        current.contact_id,
        current.program_type,
        status,
        id
      )
    }
    return this.updateEngagementEnrollments({
      id,
      status,
      sequence_step_id,
      next_step_at:
        input.next_step_at === undefined
          ? this.optionalDate(current.next_step_at)
          : this.optionalDate(input.next_step_at),
    })
  }

  /**
   * Soft-ref conversie naar customer, seller of beide.
   * Stopt active acquisition. Start onboarding alleen via enrollContact.
   * Maakt geen Customer- of Seller-record en geen communication event.
   */
  async convertOrganization(input: {
    organization_id: string
    customer_id?: string | null
    seller_id?: string | null
  }) {
    return applyOrganizationConversion({
      api: this as unknown as ConversionApi,
      config: readOrchestratorConfig(),
      organizationId: input.organization_id,
      customerId: input.customer_id,
      sellerId: input.seller_id,
      now: new Date(),
      log: () => undefined,
    })
  }

  /**
   * Expliciete conversion-stop. Alleen active acquisition.
   * Reden is `conversion`; Enrollment heeft daar geen kolom voor.
   * Al gestopte rijen blijven staan.
   */
  async stopEnrollmentForConversion(id: string) {
    const enrollmentId = id.trim()
    if (!enrollmentId) invalid("Enrollment vereist een id.")
    const current = (await this.retrieveEngagementEnrollment(
      enrollmentId
    )) as EnrollmentRow
    if (current.program_type !== "acquisition") {
      invalid("Conversion stopt alleen een acquisition-enrollment.")
    }
    if (!isActiveEnrollmentStatus(current.status)) {
      return { enrollment: current, reason: CONVERSION_STOP_REASON, changed: false }
    }
    const enrollment = await this.updateEnrollment({
      id: enrollmentId,
      status: "stopped",
      next_step_at: null,
    })
    return { enrollment, reason: CONVERSION_STOP_REASON, changed: true }
  }

  /**
   * Handmatig mark as replied.
   * human_follow_up stopt automatische acquisition. Geen Crisp, geen mailbox,
   * geen communication event en geen verzending.
   */
  async markContactForHumanFollowUp(contactId: string) {
    return applyHumanFollowUp({
      api: this as unknown as ConversionApi,
      contactId,
    })
  }

  async setPreference(input: {
    contact_id: string
    category: string
    channel?: string
    enabled: boolean
  }) {
    const contact_id = input.contact_id.trim()
    if (!contact_id) invalid("Preference vereist contact_id.")
    await this.retrieveEngagementContact(contact_id)
    const category = this.preferenceCategory(input.category)
    const channel = this.preferenceChannel(input.channel)
    const enabled = this.preferenceEnabled(input.enabled)
    const existing = (await this.listEngagementPreferences(
      { contact_id, category, channel },
      { take: 1 }
    )) as PreferenceRow[]
    if (existing[0]) {
      return this.updateEngagementPreferences({ id: existing[0].id, enabled })
    }
    return this.createEngagementPreferences({
      contact_id,
      category,
      channel,
      enabled,
    })
  }

  async suppressContact(input: {
    contact_id: string
    category: string
    reason: string
  }) {
    const contact_id = input.contact_id.trim()
    if (!contact_id) invalid("Suppression vereist contact_id.")
    await this.retrieveEngagementContact(contact_id)
    const category = this.preferenceCategory(input.category)
    const reason = this.suppressionReason(input.reason)
    const existing = (await this.listEngagementSuppressions(
      { contact_id, category, active: true },
      { take: 1 }
    )) as SuppressionRow[]
    if (existing[0]) return existing[0]
    return this.createEngagementSuppressions({
      contact_id,
      category,
      reason,
      active: true,
    })
  }

  /**
   * Unsubscribe schrijft Preference uit en Suppression aan.
   * Geen aparte tabel en geen communication event.
   */
  async recordUnsubscribe(input: {
    contact_id: string
    category: string
    channel?: string
  }) {
    const preference = await this.setPreference({
      contact_id: input.contact_id,
      category: input.category,
      channel: input.channel,
      enabled: false,
    })
    const suppression = await this.suppressContact({
      contact_id: input.contact_id,
      category: input.category,
      reason: "unsubscribe",
    })
    return { preference, suppression }
  }

  /**
   * Handmatig history-record. Geen provider-aanroep.
   * template_version_id is toegestaan; SequenceStep heeft die niet.
   */
  async recordCommunicationEvent(input: {
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
    customer_id?: string | null
    provider_message_id?: string | null
    ai_draft_id?: string | null
    status: string
    locale?: string | null
    delivery_error?: string | null
    replied?: boolean
    bounced?: boolean
    unsubscribed?: boolean
  }) {
    const contact_id = input.contact_id?.trim() || ""
    const consumer_id = input.consumer_id?.trim() || ""
    const affiliate_id = input.affiliate_id?.trim() || ""
    if (!contact_id && !consumer_id && !affiliate_id) {
      invalid("CommunicationEvent vereist een ontvanger.")
    }
    const contact = contact_id
      ? ((await this.retrieveEngagementContact(contact_id)) as ContactRow)
      : null
    const history = this.historyVersion(input.status, input.template_version_id)
    const enrollment_id = input.enrollment_id?.trim() || null
    if (enrollment_id) {
      const enrollment = (await this.retrieveEngagementEnrollment(
        enrollment_id
      )) as EnrollmentRow
      const sameContact = Boolean(contact_id) && enrollment.contact_id === contact_id
      const sameConsumer = Boolean(consumer_id) && enrollment.consumer_id === consumer_id
      const sameAffiliate = Boolean(affiliate_id) && enrollment.affiliate_id === affiliate_id
      if (!sameContact && !sameConsumer && !sameAffiliate) {
        invalid("CommunicationEvent-enrollment hoort niet bij deze ontvanger.")
      }
    }
    const template_id = input.template_id?.trim() || null
    const variant_id = input.variant_id?.trim() || null
    if (template_id && variant_id) {
      const variant = (await this.retrieveCommunicationTemplateVariant(
        variant_id
      )) as VariantRefRow
      try {
        assertVariantBelongsToTemplate({
          template_id,
          variant_template_id: variant.template_id,
        })
      } catch (err) {
        invalid(err instanceof Error ? err.message : String(err))
      }
    }
    if (history.template_version_id) {
      const version = (await this.retrieveCommunicationTemplateVersion(
        history.template_version_id
      )) as TemplateVersionRow
      if (variant_id && version.variant_id !== variant_id) {
        invalid("TemplateVersion hoort niet bij de gekozen TemplateVariant.")
      }
    }
    return this.createEngagementCommunicationEvents({
      contact_id: contact_id || null,
      organization_id: contact?.organization_id ?? null,
      consumer_id: consumer_id || null,
      affiliate_id: affiliate_id || null,
      customer_id: input.customer_id?.trim() || null,
      enrollment_id,
      program_id: input.program_id?.trim() || null,
      sequence_id: input.sequence_id?.trim() || null,
      sequence_step_id: input.sequence_step_id?.trim() || null,
      template_id,
      variant_id,
      template_version_id: history.template_version_id,
      ai_draft_id: input.ai_draft_id?.trim() || null,
      status: history.status,
      provider_message_id: input.provider_message_id?.trim() || null,
      locale: input.locale?.trim().toLowerCase().slice(0, 2) || null,
      delivery_error:
        history.status === "stopped"
          ? input.delivery_error?.trim().slice(0, 500) || null
          : null,
      attempt_count: 0,
      delivery_claim: null,
      replied: input.replied === true,
      bounced: input.bounced === true,
      unsubscribed: input.unsubscribed === true,
    })
  }

  /**
   * Eén UPDATE op de bestaande history-rij. Geen provider.
   * Een tweede worker krijgt geen rij terug en claimt niets.
   */
  @InjectManager()
  async claimCommunicationDelivery(
    id: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const eventId = id.trim()
    if (!eventId) invalid("Dit bericht kan niet worden geclaimd voor verzending.")
    const rows = await executeDeliverySql(
      sharedContext.transactionManager ?? sharedContext.manager,
      DELIVERY_CLAIM_SQL,
      [eventId]
    )
    const row = rows[0]
    const claim_token = typeof row?.delivery_claim === "string" ? row.delivery_claim : ""
    const attempt = Number(String(claim_token).split(":").pop())
    if (!claim_token || !Number.isFinite(attempt)) {
      invalid("Dit bericht kan niet worden geclaimd voor verzending.")
    }
    return { claim_token, attempt }
  }

  /**
   * Registreert sent, failed of bounced alleen als de claim nog open is.
   * Roept geen provider aan.
   */
  @InjectManager()
  async recordDeliveryOutcome(
    input: {
      id: string
      claim_token: string
      locale: string
      result: ProviderDeliveryResult
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    const current = (await this.retrieveEngagementCommunicationEvent(
      input.id.trim(),
      {},
      sharedContext
    )) as HistoryDeliveryRow
    const applied = applyDeliveryResult({
      row: current,
      claim_token: input.claim_token,
      locale: input.locale,
      result: input.result,
    })
    if (!applied.ok) invalid("Dit afleverresultaat hoort niet bij de open claim.")
    const patch = applied.patch
    const rows = await executeDeliverySql(
      sharedContext.transactionManager ?? sharedContext.manager,
      `
UPDATE "engagement_communication_event"
SET "status" = ?,
    "provider_message_id" = ?,
    "bounced" = ?,
    "locale" = ?,
    "delivery_error" = ?,
    "attempt_count" = ?,
    "delivery_claim" = NULL,
    "updated_at" = now()
WHERE "id" = ?
  AND "deleted_at" IS NULL
  AND "delivery_claim" = ?
  AND ("provider_message_id" IS NULL OR btrim("provider_message_id") = '')
  AND "status" NOT IN ('sent', 'bounced', 'stopped')
RETURNING "id"
`.trim(),
      [
        patch.status,
        patch.provider_message_id,
        patch.bounced,
        patch.locale,
        patch.delivery_error,
        patch.attempt_count,
        patch.id,
        input.claim_token.trim(),
      ]
    )
    if (!rows[0]) invalid("Dit afleverresultaat hoort niet bij de open claim.")
    return patch
  }

  /**
   * Koppelt een provider-webhook aan één history-rij. Geen externe aanroep.
   * Een herhaalde bounce of aflevering wijzigt de rij niet nog eens.
   */
  @InjectManager()
  async recordProviderWebhook(
    input: ProviderWebhook,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const current = await this.findDeliveryEvent(input, sharedContext)
    if (!current) invalid("Geen communicatiegeschiedenis voor dit providerbericht.")
    const planned = planProviderWebhook(current, input)
    if (planned.action === "ignore") return { duplicate: true, id: current.id }
    if (planned.action === "reject") {
      invalid("Dit providerbericht hoort niet bij de open geschiedenis.")
    }
    const patch = planned.patch
    if (patch.status !== "bounced" || current.status !== "sent") {
      invalid("Een webhook mag een bericht niet op verzonden zetten.")
    }
    const manager = sharedContext.transactionManager ?? sharedContext.manager
    const rows = await executeDeliverySql(
      manager,
      `
UPDATE "engagement_communication_event"
SET "status" = 'bounced',
    "bounced" = true,
    "delivery_error" = ?,
    "delivery_claim" = NULL,
    "updated_at" = now()
WHERE "id" = ?
  AND "deleted_at" IS NULL
  AND "status" = 'sent'
  AND "provider_message_id" = ?
RETURNING "id"
`.trim(),
      [patch.delivery_error, patch.id, patch.provider_message_id]
    )
    if (!rows[0]) return { duplicate: true, id: current.id }
    return { duplicate: false, id: current.id, status: patch.status }
  }

  private async findDeliveryEvent(input: ProviderWebhook, sharedContext: Context) {
    const eventId = input.event_id?.trim()
    if (eventId) {
      return (await this.retrieveEngagementCommunicationEvent(
        eventId,
        {},
        sharedContext
      )) as HistoryDeliveryRow
    }
    const providerId = input.provider_message_id?.trim()
    if (!providerId) return null
    const rows = (await this.listEngagementCommunicationEvents(
      { provider_message_id: providerId },
      { take: 1 },
      sharedContext
    )) as HistoryDeliveryRow[]
    return rows[0] ?? null
  }

  private async loadEnrollmentGraph(input: {
    contact_id: string
    program_id: string
    sequence_id: string
    sequence_step_id: string
  }) {
    const contact_id = input.contact_id.trim()
    const program_id = input.program_id.trim()
    const sequence_id = input.sequence_id.trim()
    const sequence_step_id = input.sequence_step_id.trim()
    if (!contact_id || !program_id || !sequence_id || !sequence_step_id) {
      invalid("Enrollment vereist contact, programma, sequence en step.")
    }
    const contact = (await this.retrieveEngagementContact(contact_id)) as ContactRow
    const program = (await this.retrieveEngagementLifecycleProgram(
      program_id
    )) as ProgramRow
    const sequence = (await this.retrieveEngagementSequence(
      sequence_id
    )) as SequenceRow
    const step = (await this.retrieveEngagementSequenceStep(
      sequence_step_id
    )) as StepRow
    try {
      assertEnrollmentGraph({
        program_id,
        sequence_program_id: sequence.program_id,
        sequence_id,
        step_sequence_id: step.sequence_id,
        contact_organization_id: contact.organization_id,
        organization_id: contact.organization_id,
      })
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
    return {
      contact_id,
      organization_id: contact.organization_id,
      program_id,
      sequence_id,
      sequence_step_id,
      program_type: program.program_type,
    }
  }

  private async assertParticipationAllowed(
    contact_id: string,
    program_type: string,
    status: string,
    ignoreEnrollmentId?: string
  ) {
    const category = this.preferenceCategory(
      programTypeToPreferenceCategory(program_type)
    )
    const suppressions = (await this.listEngagementSuppressions(
      { contact_id, active: true },
      { take: 20 }
    )) as SuppressionRow[]
    try {
      assertNotSuppressed({
        category,
        activeSuppressionCategories: suppressions.map((row) => row.category),
      })
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
    if (!isActiveEnrollmentStatus(status)) return
    const active = (await this.listEngagementEnrollments(
      { contact_id, status: "active" },
      { take: 20 }
    )) as EnrollmentRow[]
    try {
      assertCanActivateEnrollment({
        programType: program_type,
        existingActiveProgramTypes: active
          .filter((row) => row.id !== ignoreEnrollmentId)
          .map((row) => row.program_type),
      })
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private enrollmentStatus(value: string) {
    try {
      return normalizeEnrollmentStatus(value)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private preferenceCategory(value: string) {
    try {
      return normalizePreferenceCategory(value)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private preferenceChannel(value: string | undefined) {
    try {
      return normalizePreferenceChannel(value)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private preferenceEnabled(value: boolean) {
    try {
      return normalizePreferenceEnabled(value)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  /**
   * Nieuwsbriefinschrijving. Herkent een bestaand e-mailadres.
   * Schrijft geen Organization en maakt geen tweede consument.
   * customer_id koppelt een bestaand Medusa-account; dit maakt er geen.
   */
  async subscribeConsumer(input: {
    email: string
    source: string
    name?: string | null
    country_code?: string | null
    locale?: string | null
    customer_id?: string | null
    topics?: unknown
  }): Promise<{ outcome: "subscribed" | "already_subscribed"; id: string }> {
    const email = normalizeConsumerEmail(input.email)
    const source = assertConsumerSource(input.source)
    const existing = await this.findConsumerByEmail(email)
    const customerId = await this.claimableCustomerId(input.customer_id, existing?.id ?? null)
    if (existing?.newsletter_enabled) {
      if (customerId && existing.customer_id !== customerId) {
        await this.updateEngagementConsumers({ id: existing.id, customer_id: customerId })
      }
      return { outcome: "already_subscribed", id: existing.id }
    }
    let topics = allNewsletterTopics()
    if (input.topics !== undefined) {
      try {
        topics = planNewsletterTopics(input.topics)
      } catch (err) {
        invalid(err instanceof Error ? err.message : String(err))
      }
      if (!topics.news && !topics.brands && !topics.offers) {
        invalid("Kies minstens één nieuwsbrief.")
      }
    }
    const now = new Date()
    if (existing) {
      await this.updateEngagementConsumers({
        id: existing.id,
        name: input.name?.trim() || existing.name,
        country_code: input.country_code?.trim() || existing.country_code,
        locale: input.locale?.trim() || existing.locale,
        customer_id: customerId ?? existing.customer_id,
        source: existing.source || source,
        newsletter_enabled: true,
        newsletter_topics: topics,
        subscribed_at: now,
        unsubscribed_at: null,
      })
      return { outcome: "subscribed", id: existing.id }
    }
    const created = await this.createEngagementConsumers({
      email,
      name: input.name?.trim() || null,
      country_code: input.country_code?.trim() || null,
      locale: input.locale?.trim() || null,
      customer_id: customerId,
      source,
      newsletter_enabled: true,
      newsletter_topics: topics,
      subscribed_at: now,
      unsubscribed_at: null,
      unsubscribe_token: newUnsubscribeToken(),
    })
    const row = Array.isArray(created) ? created[0] : created
    if (!row?.id) invalid("Consument aanmaken is niet gelukt.")
    return { outcome: "subscribed", id: row.id }
  }

  async unsubscribeConsumer(id: string) {
    const current = await this.retrieveEngagementConsumer(id)
    await this.updateEngagementConsumers({
      id: current.id,
      newsletter_enabled: false,
      newsletter_topics: emptyNewsletterTopics(),
      unsubscribed_at: new Date(),
    })
    return current.id
  }

  async unsubscribeConsumerByToken(token: string) {
    const value = token.trim()
    if (!value) invalid("De uitschrijflink is ongeldig.")
    const rows = (await this.listEngagementConsumers(
      { unsubscribe_token: value },
      { take: 1 }
    )) as ConsumerRecord[]
    const current = rows[0]
    if (!current) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Deze uitschrijflink is niet geldig.")
    }
    if (!current.newsletter_enabled) return current.id
    await this.updateEngagementConsumers({
      id: current.id,
      newsletter_enabled: false,
      newsletter_topics: emptyNewsletterTopics(),
      unsubscribed_at: new Date(),
    })
    return current.id
  }

  async resubscribeConsumer(id: string) {
    const current = await this.retrieveEngagementConsumer(id)
    await this.updateEngagementConsumers({
      id: current.id,
      newsletter_enabled: true,
      newsletter_topics: allNewsletterTopics(),
      subscribed_at: new Date(),
      unsubscribed_at: null,
    })
    return current.id
  }

  /** Per soort in- of uitschrijven. Schrijft dezelfde consument, geen tweede rij. */
  async setConsumerNewsletterTopics(id: string, topics: unknown) {
    const current = (await this.retrieveEngagementConsumer(id)) as ConsumerRecord
    let next
    try {
      next = planNewsletterTopics(topics)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
    const enabled = next.news || next.brands || next.offers
    await this.updateEngagementConsumers({
      id: current.id,
      newsletter_topics: next,
      newsletter_enabled: enabled,
      subscribed_at: enabled ? current.subscribed_at ?? new Date() : current.subscribed_at,
      unsubscribed_at: enabled ? null : new Date(),
    })
    return current.id
  }

  async setConsumerNewsletterTopicsByToken(token: string, topics: unknown) {
    const value = token.trim()
    if (!value || isPreviewUnsubscribeToken(value)) invalid("De uitschrijflink is ongeldig.")
    const rows = (await this.listEngagementConsumers(
      { unsubscribe_token: value },
      { take: 1 }
    )) as ConsumerRecord[]
    const current = rows[0]
    if (!current) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Deze uitschrijflink is niet geldig.")
    }
    return this.setConsumerNewsletterTopics(current.id, topics)
  }

  private async findConsumerByEmail(email: string): Promise<ConsumerRecord | null> {
    const rows = (await this.listEngagementConsumers({ email }, { take: 1 })) as ConsumerRecord[]
    return rows[0] ?? null
  }

  private async claimableCustomerId(
    customerId: string | null | undefined,
    consumerId: string | null
  ): Promise<string | null> {
    const id = customerId?.trim() || null
    if (!id) return null
    const rows = (await this.listEngagementConsumers(
      { customer_id: id },
      { take: 1 }
    )) as ConsumerRecord[]
    const owner = rows[0]
    if (owner && owner.id !== consumerId) return null
    return id
  }

  private suppressionReason(value: string) {
    try {
      return normalizeSuppressionReason(value)
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private historyVersion(status: string, template_version_id?: string | null) {
    try {
      return assertHistoryVersion({
        status,
        template_version_id,
        stepDefinesVersion: false,
      })
    } catch (err) {
      invalid(err instanceof Error ? err.message : String(err))
    }
  }

  private optionalDate(value: Date | string | null | undefined): Date | null {
    if (value === undefined || value === null || value === "") return null
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) invalid("next_step_at is ongeldig.")
    return date
  }
}

type ProgramRow = {
  id: string
  name: string
  program_type: string
  start_trigger?: string | null
  start_mode?: string | null
  scheduled_at?: string | null
  schedule_timezone?: string | null
  audience?: string | null
  activation_status?: string | null
  selection_criteria?: unknown
}
type SequenceRow = { id: string; name: string; program_id: string }
type StepRow = {
  id: string
  sequence_id: string
  step_order: number
  delay_minutes: number
  template_id: string
  variant_id: string
}
type TemplateRefRow = { id: string; communication_type: string }
type VariantRefRow = { id: string; template_id: string }
type ContactRow = { id: string; organization_id: string }
type EnrollmentRow = {
  id: string
  contact_id: string | null
  organization_id: string | null
  consumer_id?: string | null
  affiliate_id?: string | null
  program_id: string
  sequence_id: string
  sequence_step_id: string
  program_type: string
  status: string
  trigger_key: string
  next_step_at: Date | string | null
}
type PreferenceRow = { id: string; enabled: boolean }
type ConsumerRecord = {
  id: string
  email: string
  name: string | null
  country_code: string | null
  locale: string | null
  customer_id: string | null
  source: string
  newsletter_enabled: boolean
  newsletter_topics?: unknown
  subscribed_at?: Date | string | null
}
type SuppressionRow = { id: string; category: string; reason: string }

export default EngagementModuleService
