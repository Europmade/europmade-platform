/**
 * Read-only Admin-weergave over de bestaande engagement-module.
 * Geen enrollment-logica, geen verzending, geen nieuwe records.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { ENGAGEMENT_MODULE } from "../../../modules/engagement"
import { isCommunicationType } from "../../../modules/engagement/communication-cms-rules"
import { readOrchestratorConfig } from "../../../modules/engagement/orchestrator-config"
import { PARTNER_MODULE } from "../../../modules/partner"
import {
  parseEventHistoryQuery,
  type EventHistoryQuery,
} from "./event-history-query"

const TAKE = 100
const PROSPECT_SCAN = 500

type ListAndCount = (
  filters?: object,
  config?: {
    take?: number
    skip?: number
    relations?: string[]
    order?: Record<string, "ASC" | "DESC">
  }
) => Promise<[unknown[], number]>

type EngagementReadApi = {
  listAndCountEngagementOrganizations: ListAndCount
  listAndCountEngagementContacts: ListAndCount
  listAndCountEngagementEnrollments: ListAndCount
  listAndCountEngagementCommunicationEvents: ListAndCount
  listEngagementOrganizations: ListRows
  retrieveEngagementOrganization: (id: string, config?: object) => Promise<unknown>
  listCommunicationTemplates: ListRows
  retrieveCommunicationTemplate: (id: string, config?: object) => Promise<unknown>
  listEngagementLifecyclePrograms: ListRows
  listEngagementSequences: ListRows
  listEngagementContacts: ListRows
  listCommunicationTemplateVariants: ListRows
  listCommunicationTemplateVersions: ListRows
  listEngagementCommunicationEvents: ListRows
  retrieveEngagementCommunicationEvent: (
    id: string,
    config?: { relations?: string[] }
  ) => Promise<unknown>
}

type ListRows = (
  filters?: object,
  config?: {
    take?: number
    relations?: string[]
    order?: Record<string, "ASC" | "DESC">
  }
) => Promise<unknown[]>

function api(scope: MedusaContainer): EngagementReadApi {
  return scope.resolve(ENGAGEMENT_MODULE) as EngagementReadApi
}

function iso(value: unknown): string | null {
  if (value == null || value === "") return null
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed || null
}

type RoleRow = { id?: string; role?: string }
type ContactRow = { id?: string; name?: string | null; email?: string }
type VersionRow = {
  id?: string
  version_number?: number
  subject?: string
  preheader?: string
  body?: string
  cta_label?: string
  cta_url?: string | null
  personalization_tokens?: unknown
  approval_status?: string
  activation_status?: string
  approved_at?: unknown
  approved_by?: string | null
  used_at?: unknown
  created_at?: unknown
  updated_at?: unknown
}
type VariantRow = {
  id?: string
  name?: string
  locale?: string
  versions?: VersionRow[]
}
type TemplateRow = {
  id?: string
  name?: string
  communication_type?: string
  audience?: string | null
  ready_to_send?: boolean
  variants?: VariantRow[]
  created_at?: unknown
}
type StepRow = {
  id?: string
  step_order?: number
  delay_minutes?: number
  template_id?: string
  variant_id?: string
}
type SequenceRow = { id?: string; name?: string; steps?: StepRow[] }
type ProgramRow = {
  id?: string
  name?: string
  program_type?: string
  sequences?: SequenceRow[]
}
type OrgRow = {
  id?: string
  company_name?: string
  website?: string | null
  category?: string | null
  sales_model?: string
  outreach_status?: string
  source?: string
  outreach_purpose?: string | null
  self_classification_payload?: unknown
  converted_customer_id?: string | null
  converted_seller_id?: string | null
  created_at?: unknown
  roles?: RoleRow[]
  contacts?: ContactRow[]
}
type NamedRow = { id?: string; company_name?: string | null }
type EnrollmentRef = {
  id?: string
  status?: string
  program_id?: string
  program_type?: string
  sequence_id?: string
  sequence_step_id?: string
  organization_id?: string
}
type EventRow = {
  id?: string
  contact_id?: string
  contact?: ContactRow | null
  organization_id?: string | null
  enrollment_id?: string | null
  enrollment?: EnrollmentRef | null
  program_id?: string | null
  sequence_id?: string | null
  sequence_step_id?: string | null
  status?: string
  template_id?: string | null
  variant_id?: string | null
  template_version_id?: string | null
  provider_message_id?: string | null
  replied?: boolean
  bounced?: boolean
  unsubscribed?: boolean
  created_at?: unknown
  updated_at?: unknown
}

function asRows<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function conversionLabel(input: {
  converted_customer_id: string | null
  converted_seller_id: string | null
}): "customer" | "seller" | "both" | "none" {
  const customer = Boolean(input.converted_customer_id)
  const seller = Boolean(input.converted_seller_id)
  if (customer && seller) return "both"
  if (customer) return "customer"
  if (seller) return "seller"
  return "none"
}

function serializeContact(contact: ContactRow) {
  return {
    id: text(contact.id) ?? "",
    name: text(contact.name),
    email: text(contact.email) ?? "",
  }
}

function classificationPayload(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function serializeOrganization(row: OrgRow) {
  const converted_customer_id = text(row.converted_customer_id)
  const converted_seller_id = text(row.converted_seller_id)
  return {
    id: text(row.id) ?? "",
    company_name: text(row.company_name) ?? "",
    website: text(row.website),
    category: text(row.category),
    sales_model: text(row.sales_model) ?? "",
    outreach_status: text(row.outreach_status) ?? "",
    source: text(row.source) ?? "",
    outreach_purpose: text(row.outreach_purpose),
    self_classification_payload: classificationPayload(
      row.self_classification_payload
    ),
    converted_customer_id,
    converted_seller_id,
    conversion: conversionLabel({ converted_customer_id, converted_seller_id }),
    created_at: iso(row.created_at),
    roles: asRows<RoleRow>(row.roles)
      .map((role) => text(role.role))
      .filter((role): role is string => Boolean(role)),
    contacts: asRows<ContactRow>(row.contacts).map(serializeContact),
  }
}

function tokenList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function serializeVersion(version: VersionRow) {
  return {
    id: text(version.id) ?? "",
    version_number: Number(version.version_number) || 0,
    subject: text(version.subject) ?? "",
    preheader: text(version.preheader) ?? "",
    body: text(version.body) ?? "",
    cta_label: text(version.cta_label) ?? "",
    cta_url: text(version.cta_url),
    personalization_tokens: tokenList(version.personalization_tokens),
    approval_status: text(version.approval_status) ?? "",
    activation_status: text(version.activation_status) ?? "",
    approved_at: iso(version.approved_at),
    approved_by: text(version.approved_by),
    used_at: iso(version.used_at),
    created_at: iso(version.created_at),
    updated_at: iso(version.updated_at),
  }
}

function serializeVariant(variant: VariantRow) {
  const versions = asRows<VersionRow>(variant.versions)
    .map(serializeVersion)
    .sort((a, b) => b.version_number - a.version_number)
  return {
    id: text(variant.id) ?? "",
    name: text(variant.name) ?? "",
    locale: text(variant.locale) ?? "",
    versions,
  }
}

function serializeTemplate(row: TemplateRow) {
  return {
    id: text(row.id) ?? "",
    name: text(row.name) ?? "",
    communication_type: text(row.communication_type) ?? "",
    audience: text(row.audience),
    ready_to_send: row.ready_to_send === true,
    created_at: iso(row.created_at),
    variants: asRows<VariantRow>(row.variants).map(serializeVariant),
  }
}

const ONBOARDING_ATTENTION = [
  "Ingediend",
  "In beoordeling",
  "Aanvullende informatie vereist",
] as const
const PREVIEW = 3

export function attentionLabel(
  contact: string | null,
  company: string | null
): { title: string; subtitle: string | null } | null {
  const person = contact?.trim() || ""
  const firm = company?.trim() || ""
  if (!person && !firm) return null
  if (person && firm && person !== firm) return { title: person, subtitle: firm }
  return { title: person || firm, subtitle: null }
}

export function followUpOrganizationIds(
  organizations: Array<{ id: string; outreach_status: string }>,
  enrollments: Array<{
    organization_id: string
    program_type: string
    status: string
  }>
): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  const add = (id: string) => {
    if (!id || seen.has(id)) return
    seen.add(id)
    ids.push(id)
  }
  for (const organization of organizations) {
    if (organization.outreach_status === "opvolging_nodig") add(organization.id)
  }
  for (const enrollment of enrollments) {
    if (
      enrollment.status === "human_follow_up" &&
      enrollment.program_type === "acquisition"
    ) {
      add(enrollment.organization_id)
    }
  }
  return ids
}

type EnrollmentWorkRow = EnrollmentRef & {
  organization?: OrgRow | null
  contact?: ContactRow | null
}

function previewItem(
  id: string,
  contact: string | null,
  company: string | null
) {
  const label = attentionLabel(contact, company)
  if (!label) return null
  return { id, title: label.title, subtitle: label.subtitle }
}

function eventPreview(
  event: ReturnType<typeof serializeEvent>
) {
  return {
    id: event.id,
    template_name: event.template_name,
    contact_name: event.contact_name,
    company_name: event.organization_name,
    status: event.status,
    created_at: event.created_at,
  }
}

export async function loadEngagementOverview(scope: MedusaContainer) {
  const service = api(scope)
  const [organizationRows, enrollmentRows, queued, recent] = await Promise.all([
    service.listAndCountEngagementOrganizations(
      {},
      {
        take: PROSPECT_SCAN,
        order: { created_at: "DESC" },
        relations: ["contacts"],
      }
    ),
    service.listAndCountEngagementEnrollments(
      { status: "human_follow_up" },
      { take: PROSPECT_SCAN, relations: ["contact"] }
    ),
    service.listAndCountEngagementCommunicationEvents(
      { status: "queued" },
      {
        take: PREVIEW,
        order: { created_at: "DESC" },
        relations: ["contact", "enrollment"],
      }
    ),
    service.listAndCountEngagementCommunicationEvents(
      {},
      {
        take: 6,
        order: { created_at: "DESC" },
        relations: ["contact", "enrollment"],
      }
    ),
  ])
  const organizations = asRows<OrgRow>(organizationRows[0])
  const orgById = new Map<string, OrgRow>()
  for (const row of organizations) {
    const id = text(row.id)
    if (id) orgById.set(id, row)
  }
  const enrollments = asRows<EnrollmentWorkRow>(enrollmentRows[0])
  const followIds = followUpOrganizationIds(
    organizations.flatMap((row) => {
      const id = text(row.id)
      return id ? [{ id, outreach_status: text(row.outreach_status) ?? "" }] : []
    }),
    enrollments.flatMap((row) => {
      const id = text(row.organization_id)
      return id
        ? [
            {
              organization_id: id,
              program_type: text(row.program_type) ?? "",
              status: text(row.status) ?? "",
            },
          ]
        : []
    })
  )
  const enrollmentContact = new Map<string, ContactRow | null>()
  for (const row of enrollments) {
    const id = text(row.organization_id)
    if (id && !enrollmentContact.has(id)) enrollmentContact.set(id, row.contact ?? null)
  }
  const followUp = followIds.flatMap((id) => {
    const organization = orgById.get(id)
    const contact =
      asRows<ContactRow>(organization?.contacts)[0] ?? enrollmentContact.get(id)
    const item = previewItem(
      id,
      text(contact?.name) ?? text(contact?.email),
      text(organization?.company_name)
    )
    return item ? [item] : []
  })
  const approachRows = organizations.filter(
    (row) => text(row.outreach_status) === "te_benaderen" && text(row.id)
  )
  const toApproach = approachRows.flatMap((row) => {
    const id = text(row.id) ?? ""
    const contact = asRows<ContactRow>(row.contacts)[0]
    const item = previewItem(
      id,
      text(contact?.name) ?? text(contact?.email),
      text(row.company_name)
    )
    return item ? [item] : []
  })
  let onboardingCount = 0
  let onboarding: Array<{
    id: string
    title: string
    subtitle: string | null
  }> = []
  try {
    const partner = scope.resolve(PARTNER_MODULE) as { listSellers: ListRows }
    const sellers = asRows<{
      id?: string
      onboarding_status?: string
      company?: { legal_name?: string | null } | null
    }>(
      await partner.listSellers(
        {},
        { take: PROSPECT_SCAN, relations: ["company"] }
      )
    )
    const waiting = sellers.filter((seller) => {
      const status = text(seller.onboarding_status) ?? ""
      return (
        Boolean(text(seller.id)) &&
        (ONBOARDING_ATTENTION as readonly string[]).includes(status)
      )
    })
    onboardingCount = waiting.length
    onboarding = waiting.flatMap((seller) => {
      const id = text(seller.id) ?? ""
      const item = previewItem(id, null, text(seller.company?.legal_name))
      if (!item) return []
      return [{ ...item, subtitle: text(seller.onboarding_status) }]
    })
  } catch {
    onboarding = []
    onboardingCount = 0
  }
  const [queuedEvents, recentEvents] = await Promise.all([
    decorateEvents(service, asRows<EventRow>(queued[0])),
    decorateEvents(service, asRows<EventRow>(recent[0])),
  ])
  return {
    follow_up: { count: followIds.length, items: followUp.slice(0, PREVIEW) },
    to_approach: { count: approachRows.length, items: toApproach.slice(0, PREVIEW) },
    onboarding: { count: onboardingCount, items: onboarding.slice(0, PREVIEW) },
    communication: {
      count: queued[1],
      items: queuedEvents.map(eventPreview),
    },
    recent: recentEvents.map(eventPreview),
  }
}

function queryValue(query: Record<string, unknown>, key: string): string {
  const raw = Array.isArray(query[key]) ? query[key][0] : query[key]
  return typeof raw === "string" ? raw.trim() : ""
}

type SellerFact = { onboarding_status: string; country_code: string | null }
type LastCommunication = {
  created_at: string | null
  status: string
  template_name: string | null
  program_name: string | null
}

async function sellerFacts(scope: MedusaContainer, sellerIds: Array<string | null>) {
  const map = new Map<string, SellerFact>()
  const unique = uniqueIds(sellerIds)
  if (unique.length === 0) return map
  try {
    const partner = scope.resolve(PARTNER_MODULE) as { listSellers: ListRows }
    const rows = asRows<{
      id?: string
      onboarding_status?: string
      company?: { country_code?: string | null } | null
    }>(
      await partner.listSellers(
        { id: unique },
        { take: unique.length, relations: ["company"] }
      )
    )
    for (const row of rows) {
      const id = text(row.id)
      if (!id) continue
      map.set(id, {
        onboarding_status: text(row.onboarding_status) ?? "",
        country_code: text(row.company?.country_code),
      })
    }
  } catch {
    return map
  }
  return map
}

async function latestCommunication(
  service: EngagementReadApi,
  organizationIds: string[]
) {
  const map = new Map<string, LastCommunication>()
  const unique = uniqueIds(organizationIds)
  if (unique.length === 0) return map
  let rows: EventRow[] = []
  try {
    rows = asRows<EventRow>(
      await service.listEngagementCommunicationEvents(
        { organization_id: unique },
        { take: PROSPECT_SCAN, order: { created_at: "DESC" } }
      )
    )
  } catch {
    return map
  }
  const [templates, programs] = await Promise.all([
    lookupById(
      (ids) => service.listCommunicationTemplates({ id: ids }, { take: ids.length }),
      uniqueIds(rows.map((row) => text(row.template_id)))
    ),
    lookupById(
      (ids) =>
        service.listEngagementLifecyclePrograms({ id: ids }, { take: ids.length }),
      uniqueIds(rows.map((row) => text(row.program_id)))
    ),
  ])
  for (const row of rows) {
    const organizationId = text(row.organization_id)
    if (!organizationId || map.has(organizationId)) continue
    const templateId = text(row.template_id)
    const programId = text(row.program_id)
    map.set(organizationId, {
      created_at: iso(row.created_at),
      status: text(row.status) ?? "",
      template_name: templateId ? text(templates.get(templateId)?.name) : null,
      program_name: programId ? text(programs.get(programId)?.name) : null,
    })
  }
  return map
}

function withProspectContext(
  row: OrgRow,
  sellers: Map<string, SellerFact>,
  latest: Map<string, LastCommunication>
) {
  const base = serializeOrganization(row)
  const seller = base.converted_seller_id
    ? sellers.get(base.converted_seller_id)
    : undefined
  const onboarding_state = !base.converted_seller_id
    ? "not_started"
    : seller
      ? "linked"
      : "missing"
  return {
    ...base,
    country_code: seller?.country_code ?? null,
    onboarding_state,
    onboarding_status: seller?.onboarding_status ?? null,
    last_communication: latest.get(base.id) ?? null,
  }
}

export async function loadEngagementOrganizations(
  scope: MedusaContainer,
  query: Record<string, unknown> = {}
) {
  const service = api(scope)
  const [rows] = await service.listAndCountEngagementOrganizations(
    {},
    {
      take: PROSPECT_SCAN,
      order: { created_at: "DESC" },
      relations: ["roles", "contacts"],
    }
  )
  const organizations = asRows<OrgRow>(rows)
  const [sellers, latest] = await Promise.all([
    sellerFacts(
      scope,
      organizations.map((row) => text(row.converted_seller_id))
    ),
    latestCommunication(
      service,
      organizations
        .map((row) => text(row.id))
        .filter((id): id is string => Boolean(id))
    ),
  ])
  const q = queryValue(query, "q").toLowerCase()
  const status = queryValue(query, "status")
  const role = queryValue(query, "role")
  const salesModel = queryValue(query, "sales_model")
  const onboarding = queryValue(query, "onboarding")
  const filtered = organizations
    .map((row) => withProspectContext(row, sellers, latest))
    .filter((organization) => {
      if (q) {
        const haystack = [
          organization.company_name,
          organization.website ?? "",
          ...organization.contacts.flatMap((contact) => [
            contact.name ?? "",
            contact.email,
          ]),
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (status === "nieuw") {
        if (
          organization.outreach_status !== "nieuw" &&
          organization.outreach_status !== "new"
        ) {
          return false
        }
      } else if (status && organization.outreach_status !== status) {
        return false
      }
      if (role && !organization.roles.includes(role)) return false
      if (salesModel && organization.sales_model !== salesModel) return false
      if (onboarding === "not_started" && organization.onboarding_state !== "not_started") {
        return false
      }
      if (
        onboarding &&
        onboarding !== "not_started" &&
        organization.onboarding_status !== onboarding
      ) {
        return false
      }
      return true
    })
  return {
    count: filtered.length,
    organizations: filtered.slice(0, TAKE),
  }
}

export async function loadEngagementOrganization(
  scope: MedusaContainer,
  id: string
) {
  const service = api(scope)
  try {
    const row = (await service.retrieveEngagementOrganization(id, {
      relations: ["roles", "contacts"],
    })) as OrgRow
    const [sellers, latest] = await Promise.all([
      sellerFacts(scope, [text(row.converted_seller_id)]),
      latestCommunication(service, [text(row.id) ?? ""]),
    ])
    return withProspectContext(row, sellers, latest)
  } catch (err) {
    if (err instanceof MedusaError && err.type === MedusaError.Types.NOT_FOUND) {
      return null
    }
    throw err
  }
}

export async function loadEngagementTemplates(scope: MedusaContainer) {
  const service = api(scope)
  const rows = asRows<TemplateRow>(
    await service.listCommunicationTemplates(
      {},
      {
        take: TAKE,
        order: { created_at: "DESC" },
        relations: ["variants", "variants.versions"],
      }
    )
  )
  return { templates: rows.map(serializeTemplate) }
}

export async function loadEngagementTemplate(scope: MedusaContainer, id: string) {
  const service = api(scope)
  try {
    const row = (await service.retrieveCommunicationTemplate(id, {
      relations: ["variants", "variants.versions"],
    })) as TemplateRow
    return serializeTemplate(row)
  } catch (err) {
    if (err instanceof MedusaError && err.type === MedusaError.Types.NOT_FOUND) {
      return null
    }
    throw err
  }
}

export async function loadEngagementPrograms(scope: MedusaContainer) {
  const service = api(scope)
  const [programs, templates] = await Promise.all([
    service.listEngagementLifecyclePrograms(
      {},
      {
        take: TAKE,
        order: { created_at: "DESC" },
        relations: ["sequences", "sequences.steps"],
      }
    ),
    service.listCommunicationTemplates(
      {},
      { take: TAKE, relations: ["variants"] }
    ),
  ])
  const templateName = new Map<string, string>()
  const variantName = new Map<string, string>()
  for (const template of asRows<TemplateRow>(templates)) {
    const id = text(template.id)
    if (id) templateName.set(id, text(template.name) ?? id)
    for (const variant of asRows<VariantRow>(template.variants)) {
      const variantId = text(variant.id)
      if (variantId) {
        variantName.set(
          variantId,
          [text(variant.name), text(variant.locale)].filter(Boolean).join(" · ")
        )
      }
    }
  }
  const orchestrator = readOrchestratorConfig()
  return {
    programs: asRows<ProgramRow>(programs).map((program) => {
      const programId = text(program.id) ?? ""
      const programType = text(program.program_type) ?? ""
      const selection = isCommunicationType(programType)
        ? orchestrator[programType]
        : undefined
      const linked = Boolean(selection && selection.program_id === programId)
      return {
      id: programId,
      name: text(program.name) ?? "",
      program_type: programType,
      automatic_start: linked ? "linked" : "unlinked",
      linked_sequence_id: linked ? selection?.sequence_id ?? null : null,
      sequences: asRows<SequenceRow>(program.sequences)
        .map((sequence) => ({
          id: text(sequence.id) ?? "",
          name: text(sequence.name) ?? "",
          steps: asRows<StepRow>(sequence.steps)
            .map((step) => {
              const template_id = text(step.template_id) ?? ""
              const variant_id = text(step.variant_id) ?? ""
              return {
                id: text(step.id) ?? "",
                step_order: Number(step.step_order) || 0,
                delay_minutes: Number(step.delay_minutes) || 0,
                template_id,
                template_name: templateName.get(template_id) ?? null,
                variant_id,
                variant_name: variantName.get(variant_id) ?? null,
              }
            })
            .sort((a, b) => a.step_order - b.step_order),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }
    }),
  }
}

const FILTER_SCAN = 500

function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

function includesText(value: string | null | undefined, needle: string): boolean {
  return (value ?? "").toLowerCase().includes(needle.toLowerCase())
}

function idsForText(
  needle: string | null,
  exactId: string | null,
  rows: Array<{ id?: string; label: string | null }>,
  idPrefix: string
): string[] | null {
  if (exactId) return [exactId]
  if (!needle) return null
  if (needle.startsWith(idPrefix)) return [needle]
  return rows
    .filter(
      (row) =>
        includesText(row.label, needle) || text(row.id) === needle
    )
    .map((row) => text(row.id))
    .filter((id): id is string => Boolean(id))
}

function eventListFilters(
  parsed: EventHistoryQuery,
  contactIds: string[] | null,
  organizationIds: string[] | null
): Record<string, unknown> | null {
  if (contactIds && contactIds.length === 0) return null
  if (organizationIds && organizationIds.length === 0) return null
  const filters: Record<string, unknown> = {}
  if (parsed.status) filters.status = parsed.status
  if (contactIds) {
    filters.contact_id = contactIds.length === 1 ? contactIds[0] : contactIds
  }
  if (organizationIds) {
    filters.organization_id =
      organizationIds.length === 1 ? organizationIds[0] : organizationIds
  }
  if (parsed.from || parsed.to) {
    const created_at: Record<string, Date> = {}
    if (parsed.from) created_at.$gte = parsed.from
    if (parsed.to) created_at.$lte = parsed.to
    filters.created_at = created_at
  }
  return filters
}

async function lookupById(
  load: (ids: string[]) => Promise<unknown[]>,
  ids: string[]
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>()
  const unique = uniqueIds(ids)
  if (unique.length === 0) return map
  const rows = asRows<Record<string, unknown>>(
    await load(unique)
  )
  for (const row of rows) {
    const id = text(row.id)
    if (id) map.set(id, row)
  }
  return map
}

function flag(value: unknown): boolean {
  return value === true
}

function serializeEvent(
  row: EventRow,
  context: {
    organizations: Map<string, Record<string, unknown>>
    templates: Map<string, Record<string, unknown>>
    variants: Map<string, Record<string, unknown>>
    versions: Map<string, Record<string, unknown>>
    programs: Map<string, Record<string, unknown>>
    sequences: Map<string, Record<string, unknown>>
  }
) {
  const enrollment = row.enrollment ?? null
  const organizationId =
    text(row.organization_id) ?? text(enrollment?.organization_id)
  const organization = organizationId
    ? context.organizations.get(organizationId)
    : undefined
  const templateId = text(row.template_id)
  const variantId = text(row.variant_id)
  const versionId = text(row.template_version_id)
  const programId = text(row.program_id) ?? text(enrollment?.program_id)
  const sequenceId = text(row.sequence_id) ?? text(enrollment?.sequence_id)
  const template = templateId ? context.templates.get(templateId) : undefined
  const variant = variantId ? context.variants.get(variantId) : undefined
  const version = versionId ? context.versions.get(versionId) : undefined
  const program = programId ? context.programs.get(programId) : undefined
  const sequence = sequenceId ? context.sequences.get(sequenceId) : undefined
  const variantName = [text(variant?.name), text(variant?.locale)]
    .filter(Boolean)
    .join(" · ")
  return {
    id: text(row.id) ?? "",
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
    status: text(row.status) ?? "",
    contact_id: text(row.contact_id) ?? text(row.contact?.id),
    contact_name: text(row.contact?.name),
    contact_email: text(row.contact?.email),
    organization_id: organizationId,
    organization_name: text(organization?.company_name),
    template_id: templateId,
    template_name: text(template?.name),
    variant_id: variantId,
    variant_name: variantName || null,
    template_version_id: versionId,
    template_version_number:
      version && Number(version.version_number)
        ? Number(version.version_number)
        : null,
    template_version_subject: text(version?.subject),
    template_version_preheader: text(version?.preheader),
    template_version_body: text(version?.body),
    template_version_cta_label: text(version?.cta_label),
    template_version_cta_url: text(version?.cta_url),
    enrollment_id: text(row.enrollment_id) ?? text(enrollment?.id),
    enrollment_status: text(enrollment?.status),
    program_id: programId,
    program_name: text(program?.name),
    program_type: text(program?.program_type) ?? text(enrollment?.program_type),
    sequence_id: sequenceId,
    sequence_name: text(sequence?.name),
    sequence_step_id:
      text(row.sequence_step_id) ?? text(enrollment?.sequence_step_id),
    provider_message_id: text(row.provider_message_id),
    replied: flag(row.replied),
    bounced: flag(row.bounced),
    unsubscribed: flag(row.unsubscribed),
  }
}

async function decorateEvents(service: EngagementReadApi, rows: EventRow[]) {
  const organizationIds = uniqueIds(
    rows.flatMap((row) => [
      text(row.organization_id),
      text(row.enrollment?.organization_id),
    ])
  )
  const templateIds = uniqueIds(rows.map((row) => text(row.template_id)))
  const variantIds = uniqueIds(rows.map((row) => text(row.variant_id)))
  const versionIds = uniqueIds(rows.map((row) => text(row.template_version_id)))
  const programIds = uniqueIds(
    rows.flatMap((row) => [
      text(row.program_id),
      text(row.enrollment?.program_id),
    ])
  )
  const sequenceIds = uniqueIds(
    rows.flatMap((row) => [
      text(row.sequence_id),
      text(row.enrollment?.sequence_id),
    ])
  )
  const [organizations, templates, variants, versions, programs, sequences] =
    await Promise.all([
      lookupById(
        (ids) => service.listEngagementOrganizations({ id: ids }, { take: ids.length }),
        organizationIds
      ),
      lookupById(
        (ids) => service.listCommunicationTemplates({ id: ids }, { take: ids.length }),
        templateIds
      ),
      lookupById(
        (ids) =>
          service.listCommunicationTemplateVariants({ id: ids }, { take: ids.length }),
        variantIds
      ),
      lookupById(
        (ids) =>
          service.listCommunicationTemplateVersions({ id: ids }, { take: ids.length }),
        versionIds
      ),
      lookupById(
        (ids) =>
          service.listEngagementLifecyclePrograms({ id: ids }, { take: ids.length }),
        programIds
      ),
      lookupById(
        (ids) => service.listEngagementSequences({ id: ids }, { take: ids.length }),
        sequenceIds
      ),
    ])
  return rows.map((row) =>
    serializeEvent(row, {
      organizations,
      templates,
      variants,
      versions,
      programs,
      sequences,
    })
  )
}

async function resolveEventFilters(
  service: EngagementReadApi,
  parsed: EventHistoryQuery
): Promise<Record<string, unknown> | null> {
  let contactIds: string[] | null = null
  if (parsed.contactId || parsed.contact) {
    const contacts = parsed.contactId
      ? []
      : asRows<ContactRow>(
          await service.listEngagementContacts({}, { take: FILTER_SCAN })
        )
    contactIds = idsForText(
      parsed.contact,
      parsed.contactId,
      contacts.map((contact) => ({
        id: contact.id,
        label: [text(contact.name), text(contact.email)].filter(Boolean).join(" "),
      })),
      "ectc_"
    )
  }
  let organizationIds: string[] | null = null
  if (parsed.organizationId || parsed.organization) {
    const organizations = parsed.organizationId
      ? []
      : asRows<NamedRow>(
          await service.listEngagementOrganizations({}, { take: FILTER_SCAN })
        )
    organizationIds = idsForText(
      parsed.organization,
      parsed.organizationId,
      organizations.map((organization) => ({
        id: organization.id,
        label: text(organization.company_name),
      })),
      "eorg_"
    )
  }
  return eventListFilters(parsed, contactIds, organizationIds)
}

export async function loadEngagementEvents(
  scope: MedusaContainer,
  query: Record<string, unknown> = {}
) {
  const parsed = parseEventHistoryQuery(query)
  const service = api(scope)
  const filters = await resolveEventFilters(service, parsed)
  if (!filters) return { events: [], count: 0 }
  if (parsed.templateId) filters.template_id = parsed.templateId
  const [rows, count] = await service.listAndCountEngagementCommunicationEvents(
    filters,
    {
      take: parsed.q ? FILTER_SCAN : TAKE,
      order: { created_at: "DESC" },
      relations: ["contact", "enrollment"],
    }
  )
  let events = await decorateEvents(service, asRows<EventRow>(rows))
  if (parsed.q) {
    const needle = parsed.q.toLowerCase()
    events = events.filter((event) =>
      [
        event.contact_name,
        event.contact_email,
        event.organization_name,
        event.template_name,
      ].some((value) => (value ?? "").toLowerCase().includes(needle))
    )
    return { events: events.slice(0, TAKE), count: events.length }
  }
  return { events, count }
}

export async function loadEngagementEvent(scope: MedusaContainer, id: string) {
  const service = api(scope)
  let row: EventRow
  try {
    row = (await service.retrieveEngagementCommunicationEvent(id, {
      relations: ["contact", "enrollment"],
    })) as EventRow
  } catch (err) {
    if (
      err instanceof MedusaError &&
      err.type === MedusaError.Types.NOT_FOUND
    ) {
      return null
    }
    throw err
  }
  const [event] = await decorateEvents(service, [row])
  return event ?? null
}
