/**
 * Admin Engagement API.
 * Communication CMS is beheerbaar; er wordt niets verzonden.
 */
import { adminFetch } from "./admin-fetch"

export const DEFAULT_OUTREACH_PURPOSE =
  "Europese bedrijven uitnodigen om hun producten via EuropMade te verkopen."

export class EngagementAdminApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "EngagementAdminApiError"
    this.status = status
  }
}

export type EngagementAttentionItem = {
  id: string
  title: string
  subtitle: string | null
}

export type EngagementWorkEvent = {
  id: string
  template_name: string | null
  contact_name: string | null
  company_name: string | null
  status: string
  created_at: string | null
}

export type EngagementOverview = {
  follow_up: { count: number; items: EngagementAttentionItem[] }
  to_approach: { count: number; items: EngagementAttentionItem[] }
  onboarding: { count: number; items: EngagementAttentionItem[] }
  communication: { count: number; items: EngagementWorkEvent[] }
  recent: EngagementWorkEvent[]
}

export type EngagementContact = {
  id: string
  name: string | null
  email: string
}

export type ProspectCommunication = {
  created_at: string | null
  status: string
  template_name: string | null
  program_name: string | null
}

export type EngagementOrganization = {
  id: string
  company_name: string
  website: string | null
  category: string | null
  sales_model: string
  outreach_status: string
  source: string
  outreach_purpose: string | null
  self_classification_payload: Record<string, unknown> | null
  converted_customer_id: string | null
  converted_seller_id: string | null
  conversion: "customer" | "seller" | "both" | "none"
  created_at: string | null
  roles: string[]
  contacts: EngagementContact[]
  country_code: string | null
  onboarding_state: "not_started" | "linked" | "missing"
  onboarding_status: string | null
  last_communication: ProspectCommunication | null
}

export const SALES_MODELS = [
  "direct_to_consumer",
  "reseller_only",
  "mixed",
  "brand_seeking_partners",
  "unknown",
] as const

export const ORGANIZATION_ROLES = [
  "brand",
  "seller",
  "manufacturer",
  "distributor",
  "retailer",
  "other",
  "unknown",
] as const

/** Retailer blijft in opgeslagen gegevens, maar is geen nieuwe keuze. */
export const SELECTABLE_ORGANIZATION_ROLES = ORGANIZATION_ROLES.filter(
  (role) => role !== "retailer"
)

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

export const OUTREACH_STATUS_LABELS: Record<string, string> = {
  nieuw: "Nieuw",
  new: "Nieuw",
  te_benaderen: "Te benaderen",
  benaderd: "Benaderd",
  in_gesprek: "In gesprek",
  opvolging_nodig: "Opvolging nodig",
  gekwalificeerd: "Gekwalificeerd",
  geen_interesse: "Geen interesse",
  niet_geschikt: "Niet geschikt",
  geconverteerd: "Geconverteerd",
}

export const SALES_MODEL_LABELS: Record<string, string> = {
  direct_to_consumer: "Direct aan consument",
  reseller_only: "Alleen via resellers",
  mixed: "Beide",
  brand_seeking_partners: "Merk zoekt partners",
  unknown: "Onbekend",
}

export const ROLE_LABELS: Record<string, string> = {
  brand: "Merk",
  seller: "Verkoper",
  manufacturer: "Producent",
  distributor: "Distributeur",
  retailer: "Verkoper",
  other: "Overig",
  unknown: "Onbekend",
}

export const ONBOARDING_STATUSES = [
  "Concept",
  "Ingediend",
  "In beoordeling",
  "Aanvullende informatie vereist",
  "Goedgekeurd",
  "Afgekeurd",
] as const

export const EVENT_STATUS_LABELS: Record<string, string> = {
  queued: "Klaar, nog niet verzonden",
  sent: "Verzonden",
  failed: "Mislukt",
  bounced: "Teruggekomen",
  stopped: "Gestopt",
}

export const SOURCE_LABELS: Record<string, string> = {
  excel_import: "Excel-import",
  handmatig: "Handmatig",
  brand_referral: "Doorverwijzing",
}

export function outreachStatusLabel(value: string): string {
  return OUTREACH_STATUS_LABELS[value] ?? value
}

export function salesModelLabel(value: string): string {
  return SALES_MODEL_LABELS[value] ?? value
}

export function roleLabel(value: string): string {
  return ROLE_LABELS[value] ?? value
}

export function onboardingLabel(organization: {
  onboarding_state: EngagementOrganization["onboarding_state"]
  onboarding_status: string | null
}): string {
  if (organization.onboarding_state === "not_started") return "Nog niet gestart"
  if (organization.onboarding_state === "missing") return "Seller niet gevonden"
  return organization.onboarding_status || "Onbekend"
}

export function eventStatusLabel(value: string): string {
  return EVENT_STATUS_LABELS[value] ?? value
}

export function sourceLabel(value: string): string {
  return SOURCE_LABELS[value] ?? value
}

/** Bekende bronnen, plus een afwijkende opgeslagen waarde zodat die niet verloren gaat. */
export function sourceChoices(current?: string): string[] {
  const keys = Object.keys(SOURCE_LABELS)
  if (current && !keys.includes(current)) return [current, ...keys]
  return keys
}

export const COMMUNICATION_TYPES = [
  "acquisition",
  "onboarding",
  "lifecycle",
  "newsletter",
  "campaign",
  "operational",
] as const

export type CommunicationType = (typeof COMMUNICATION_TYPES)[number]

export type EngagementVersion = {
  id: string
  version_number: number
  subject: string
  preheader: string
  body: string
  cta_label: string
  cta_url: string | null
  personalization_tokens: string[]
  approval_status: string
  activation_status: string
  approved_at: string | null
  approved_by: string | null
  used_at: string | null
  created_at: string | null
  updated_at: string | null
}

export type EngagementVariant = {
  id: string
  name: string
  locale: string
  versions: EngagementVersion[]
}

export type EngagementTemplate = {
  id: string
  name: string
  communication_type: string
  audience: string | null
  ready_to_send: boolean
  layout?: "message" | "newsletter" | null
  scheduled_at?: string | null
  schedule_timezone?: string | null
  schedule_status?: "scheduled" | null
  created_at: string | null
  variants: EngagementVariant[]
}

export type EngagementStep = {
  id: string
  step_order: number
  delay_minutes: number
  template_id: string
  template_name: string | null
  variant_id: string
  variant_name: string | null
}

export type EngagementSequence = {
  id: string
  name: string
  steps: EngagementStep[]
}

export type StartTriggerOption = {
  key: string
  label: string
  audience: "sellers" | "consumers" | "affiliates"
  kind?: "event" | "condition"
  available: boolean
}

export type EngagementProgram = {
  id: string
  name: string
  program_type: string
  start_trigger?: string | null
  start_mode?: "event" | "condition" | "scheduled" | null
  activation_status?: "concept" | "active" | null
  scheduled_at?: string | null
  schedule_timezone?: string | null
  audience?: string | null
  selection_criteria?: {
    locales: string[]
    product_ids: string[]
    brand_ids: string[]
    category_ids: string[]
  } | null
  selection_note?: string | null
  automatic_start?: "linked" | "unlinked" | "scheduled"
  linked_sequence_id?: string | null
  start_title?: string
  start_note?: string
  sequences: EngagementSequence[]
}

export const COMMUNICATION_EVENT_STATUSES = [
  "queued",
  "sent",
  "failed",
  "bounced",
  "stopped",
] as const

export type EngagementEvent = {
  id: string
  created_at: string | null
  updated_at: string | null
  status: string
  contact_id: string | null
  contact_name: string | null
  contact_email: string | null
  organization_id: string | null
  organization_name: string | null
  template_id: string | null
  template_name: string | null
  variant_id: string | null
  variant_name: string | null
  template_version_id: string | null
  template_version_number: number | null
  template_version_subject: string | null
  template_version_preheader: string | null
  template_version_body: string | null
  template_version_cta_label: string | null
  template_version_cta_url: string | null
  enrollment_id: string | null
  enrollment_status: string | null
  program_id: string | null
  program_name: string | null
  program_type: string | null
  sequence_id: string | null
  sequence_name: string | null
  sequence_step_id: string | null
  provider_message_id: string | null
  locale: string | null
  delivery_error: string | null
  replied: boolean
  bounced: boolean
  unsubscribed: boolean
}

export type EngagementEventFilters = {
  status?: string
  contact?: string
  organization?: string
  organization_id?: string
  q?: string
  template_id?: string
  from?: string
  to?: string
}

const CONVERSION_LABELS: Record<EngagementOrganization["conversion"], string> = {
  customer: "Customer",
  seller: "Seller",
  both: "Customer en seller",
  none: "Niet geconverteerd",
}

export function conversionLabel(value: EngagementOrganization["conversion"]): string {
  return CONVERSION_LABELS[value] ?? value
}

export function formatEngagementDate(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("nl-NL").format(value)
}

async function readJson<T>(res: Response, fallback: string): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as { message?: string }
  if (!res.ok) {
    throw new EngagementAdminApiError(body.message || fallback, res.status)
  }
  return body as T
}

export async function getEngagementOverview(): Promise<EngagementOverview> {
  const res = await adminFetch("/admin/engagement/overview")
  return readJson(res, "Werkoverzicht laden mislukt.")
}

export type ProspectImportRow = {
  company_name: string
  contact_name: string
  email: string
  website: string
  category: string
  role: string
  sales_model: string
  verdict?: "new" | "existing" | "possible_duplicate" | "invalid"
  message?: string
}

export async function previewProspectImport(input: {
  file_name: string
  rows: ProspectImportRow[]
}): Promise<{
  summary: { new: number; existing: number; possible_duplicate: number; invalid: number }
  rows: ProspectImportRow[]
}> {
  const res = await adminFetch("/admin/engagement/imports", {
    method: "POST",
    body: JSON.stringify({ ...input, dry_run: true }),
  })
  return readJson(res, "Import controleren mislukt.")
}

export async function runProspectImport(input: {
  file_name: string
  rows: ProspectImportRow[]
}): Promise<{ imported: number }> {
  const res = await adminFetch("/admin/engagement/imports", {
    method: "POST",
    body: JSON.stringify({ ...input, dry_run: false }),
  })
  return readJson(res, "Importeren mislukt.")
}

export async function listEngagementOrganizations(
  filters: {
    q?: string
    status?: string
    role?: string
    sales_model?: string
    onboarding?: string
  } = {}
): Promise<{
  count: number
  organizations: EngagementOrganization[]
}> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  const query = params.toString()
  const res = await adminFetch(
    `/admin/engagement/organizations${query ? `?${query}` : ""}`
  )
  return readJson(res, "Organisaties laden mislukt.")
}

export async function getEngagementOrganization(
  id: string
): Promise<EngagementOrganization> {
  const res = await adminFetch(
    `/admin/engagement/organizations/${encodeURIComponent(id)}`
  )
  const body = await readJson<{ organization: EngagementOrganization }>(
    res,
    "Organisatie laden mislukt."
  )
  return body.organization
}

async function writeOrganization(
  path: string,
  body: unknown,
  fallback: string,
  method: "POST" | "DELETE" = "POST"
): Promise<EngagementOrganization> {
  const res = await adminFetch(path, {
    method,
    body: method === "DELETE" ? undefined : JSON.stringify(body ?? {}),
  })
  const parsed = await readJson<{ organization: EngagementOrganization }>(
    res,
    fallback
  )
  return parsed.organization
}

export type OrganizationWriteInput = {
  company_name: string
  website: string
  category: string
  sales_model: string
  outreach_status: string
  source: string
  outreach_purpose: string
  self_classification_payload: Record<string, unknown> | null
  roles?: string[]
  contact_name?: string | null
  contact_email?: string
}

export function createEngagementOrganization(
  input: OrganizationWriteInput
): Promise<EngagementOrganization> {
  return writeOrganization(
    "/admin/engagement/organizations",
    input,
    "Organisatie aanmaken mislukt."
  )
}

export function updateEngagementOrganization(
  id: string,
  input: Omit<OrganizationWriteInput, "roles">
): Promise<EngagementOrganization> {
  return writeOrganization(
    `/admin/engagement/organizations/${encodeURIComponent(id)}`,
    input,
    "Organisatie opslaan mislukt."
  )
}

export function addEngagementOrganizationRole(
  id: string,
  role: string
): Promise<EngagementOrganization> {
  return writeOrganization(
    `/admin/engagement/organizations/${encodeURIComponent(id)}/roles`,
    { role },
    "Rol toevoegen mislukt."
  )
}

export function removeEngagementOrganizationRole(
  id: string,
  role: string
): Promise<EngagementOrganization> {
  return writeOrganization(
    `/admin/engagement/organizations/${encodeURIComponent(id)}/roles/${encodeURIComponent(role)}`,
    undefined,
    "Rol verwijderen mislukt.",
    "DELETE"
  )
}

export function createEngagementContact(
  organizationId: string,
  input: { name: string; email: string }
): Promise<EngagementOrganization> {
  return writeOrganization(
    `/admin/engagement/organizations/${encodeURIComponent(organizationId)}/contacts`,
    input,
    "Contact aanmaken mislukt."
  )
}

export function updateEngagementContact(
  organizationId: string,
  contactId: string,
  input: { name: string; email: string }
): Promise<EngagementOrganization> {
  return writeOrganization(
    `/admin/engagement/organizations/${encodeURIComponent(organizationId)}/contacts/${encodeURIComponent(contactId)}`,
    input,
    "Contact opslaan mislukt."
  )
}

export async function listEngagementTemplates(): Promise<EngagementTemplate[]> {
  const res = await adminFetch("/admin/engagement/templates")
  const body = await readJson<{ templates: EngagementTemplate[] }>(
    res,
    "Berichten laden mislukt."
  )
  return body.templates
}

export async function getEngagementTemplate(id: string): Promise<EngagementTemplate> {
  const res = await adminFetch(
    `/admin/engagement/templates/${encodeURIComponent(id)}`
  )
  const body = await readJson<{ template: EngagementTemplate }>(
    res,
    "Bericht laden mislukt."
  )
  return body.template
}

async function writeTemplate(
  path: string,
  body: unknown,
  fallback: string
): Promise<EngagementTemplate> {
  const res = await adminFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const parsed = await readJson<{ template: EngagementTemplate }>(res, fallback)
  return parsed.template
}

export function versionBadges(version: {
  approval_status: string
  activation_status: string
  used_at: string | null
}): string[] {
  const labels: string[] = []
  if (version.approval_status === "draft") labels.push("Concept")
  else if (version.approval_status === "pending_review") labels.push("Ter beoordeling")
  else if (version.approval_status === "approved") labels.push("Goedgekeurd")
  else if (version.approval_status === "rejected") labels.push("Afgekeurd")
  if (version.activation_status === "active") labels.push("Actief")
  else if (version.activation_status === "archived") labels.push("Gearchiveerd")
  if (version.used_at) labels.push("Gebruikt")
  return labels
}

export function templateStatusSummary(template: EngagementTemplate): string {
  const counts = new Map<string, number>()
  for (const variant of template.variants) {
    for (const version of variant.versions) {
      for (const label of versionBadges(version)) {
        counts.set(label, (counts.get(label) ?? 0) + 1)
      }
    }
  }
  if (counts.size === 0) return "Geen versies"
  return [...counts.entries()].map(([label, count]) => `${count} ${label}`).join(" · ")
}

export function createEngagementTemplate(input: {
  name: string
  communication_type: string
  audience?: string | null
}): Promise<EngagementTemplate> {
  return writeTemplate(
    "/admin/engagement/templates",
    input,
    "Bericht aanmaken mislukt."
  )
}

export function updateEngagementTemplate(
  id: string,
  input: {
    name: string
    communication_type: string
    audience?: string | null
    layout?: "message" | "newsletter" | null
    schedule?: {
      scheduled_at?: string | null
      schedule_timezone?: string | null
      audience?: string | null
    } | null
  }
): Promise<EngagementTemplate> {
  return writeTemplate(
    `/admin/engagement/templates/${encodeURIComponent(id)}`,
    input,
    "Bericht opslaan mislukt."
  )
}

export function generateEngagementDraft(
  templateId: string,
  input: {
    kind: "newsletter" | "email" | "follow_up"
    idea: string
    goal: string
    tone: string
    length: "kort" | "normaal" | "uitgebreid"
  }
): Promise<EngagementTemplate> {
  return writeTemplate(
    `/admin/engagement/templates/${encodeURIComponent(templateId)}/generate`,
    input,
    "Het AI-concept kon niet worden gemaakt. Probeer het opnieuw."
  )
}

export function markNewsletterReady(
  templateId: string,
  versionId: string
): Promise<EngagementTemplate> {
  return writeTemplate(
    `/admin/engagement/templates/${encodeURIComponent(templateId)}/ready`,
    { version_id: versionId },
    "Klaarzetten is niet gelukt."
  )
}

export type EngagementConsumer = {
  id: string
  name: string
  email: string
  country: string | null
  language: string
  newsletter: string
  newsletter_enabled: boolean
  newsletters?: Array<{ key: string; label: string; enabled: boolean }>
  source: string
  account: string | null
  subscribed_at: string | null
  unsubscribed_at: string | null
  updated_at: string | null
}

export type CatalogProductHit = {
  id: string
  title: string
  description: string
  image_url: string
  href: string
  commission_label?: string | null
  brand_name?: string | null
  category_names?: string[]
}

export async function searchCatalogProducts(q: string): Promise<CatalogProductHit[]> {
  const query = q.trim()
  if (query.length < 2) return []
  const res = await adminFetch(
    `/admin/engagement/catalog-products?q=${encodeURIComponent(query)}`
  )
  const body = await readJson<{ products: CatalogProductHit[] }>(
    res,
    "Producten zoeken mislukt."
  )
  return body.products
}

export async function listEngagementConsumers(q = ""): Promise<EngagementConsumer[]> {
  const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""
  const res = await adminFetch(`/admin/engagement/consumers${query}`)
  const body = await readJson<{ consumers: EngagementConsumer[] }>(res, "Consumenten laden mislukt.")
  return body.consumers
}

export async function getEngagementConsumer(id: string): Promise<{
  consumer: EngagementConsumer
  communication: Array<{ status: string; at: string | null }>
}> {
  const res = await adminFetch(`/admin/engagement/consumers/${encodeURIComponent(id)}`)
  return readJson(res, "Consument laden mislukt.")
}

export type AffiliatePartner = {
  id: string
  organization: string
  contact_name: string | null
  email: string | null
  website: string | null
  partner_type: string | null
  partner_type_label: string
  status: string
  country: string | null
  locale: string | null
  contacted_at: string | null
  commission: string | null
  attribution_days: number | null
  social_channels: Array<{ channel: string; label: string; url: string }>
  preferences: Array<{ key: string; label: string; enabled: boolean }>
  links: Array<{ target: string; url: string }>
  products: Array<{ url: string }>
  history_note: string
}

export async function listAffiliatePartners(): Promise<AffiliatePartner[]> {
  const res = await adminFetch("/admin/engagement/affiliates")
  const body = await readJson<{ partners: AffiliatePartner[] }>(res, "Affiliate partners laden mislukt.")
  return body.partners
}

export async function getAffiliatePartner(id: string): Promise<AffiliatePartner> {
  const res = await adminFetch(`/admin/engagement/affiliates/${encodeURIComponent(id)}`)
  const body = await readJson<{ partner: AffiliatePartner }>(res, "Affiliate partner laden mislukt.")
  return body.partner
}

export async function saveAffiliatePartner(
  id: string,
  input: {
    partner_type: string | null
    contact_name: string | null
    locale: string | null
    contacted_at: string | null
    communication_preferences: Record<string, boolean>
    social_channels: Array<{ channel: string; url: string }>
  }
): Promise<AffiliatePartner> {
  const res = await adminFetch(`/admin/engagement/affiliates/${encodeURIComponent(id)}`, {
    method: "POST",
    body: JSON.stringify(input),
  })
  const body = await readJson<{ partner: AffiliatePartner }>(res, "Dossier opslaan mislukt.")
  return body.partner
}

export async function setConsumerNewsletter(
  id: string,
  enabled: boolean
): Promise<EngagementConsumer> {
  const res = await adminFetch(`/admin/engagement/consumers/${encodeURIComponent(id)}/newsletter`, {
    method: "POST",
    body: JSON.stringify({ enabled }),
  })
  const body = await readJson<{ consumer: EngagementConsumer }>(
    res,
    enabled ? "Inschrijven is niet gelukt." : "Uitschrijven is niet gelukt."
  )
  return body.consumer
}

export function createEngagementVariant(
  templateId: string,
  input: { name: string; locale: string }
): Promise<EngagementTemplate> {
  return writeTemplate(
    `/admin/engagement/templates/${encodeURIComponent(templateId)}/variants`,
    input,
    "Taal opslaan mislukt."
  )
}

export function updateEngagementVariant(
  templateId: string,
  variantId: string,
  input: { name: string; locale: string }
): Promise<EngagementTemplate> {
  return writeTemplate(
    `/admin/engagement/templates/${encodeURIComponent(templateId)}/variants/${encodeURIComponent(variantId)}`,
    input,
    "Taal opslaan mislukt."
  )
}

export function createEngagementVersion(
  templateId: string,
  variantId: string,
  input: {
    subject: string
    preheader: string
    body: string
    cta_label: string
    cta_url: string
    personalization_tokens: string[]
  }
): Promise<EngagementTemplate> {
  return writeTemplate(
    `/admin/engagement/templates/${encodeURIComponent(templateId)}/variants/${encodeURIComponent(variantId)}/versions`,
    input,
    "Nieuwe versie maken mislukt."
  )
}

export function saveEngagementVersion(
  templateId: string,
  versionId: string,
  input: {
    subject: string
    preheader: string
    body: string
    cta_label: string
    cta_url: string
    personalization_tokens: string[]
  }
): Promise<EngagementTemplate> {
  return writeTemplate(
    `/admin/engagement/templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(versionId)}`,
    input,
    "Bericht opslaan mislukt."
  )
}

export function submitEngagementVersionForReview(
  templateId: string,
  versionId: string
): Promise<EngagementTemplate> {
  return writeTemplate(
    `/admin/engagement/templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(versionId)}/review`,
    {},
    "Ter beoordeling zetten mislukt."
  )
}

export function approveEngagementVersion(
  templateId: string,
  versionId: string
): Promise<EngagementTemplate> {
  return writeTemplate(
    `/admin/engagement/templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(versionId)}/approve`,
    {},
    "Goedkeuren mislukt."
  )
}

export async function deleteEngagementTemplate(templateId: string): Promise<void> {
  const res = await adminFetch(
    `/admin/engagement/templates/${encodeURIComponent(templateId)}`,
    { method: "DELETE" }
  )
  await readJson<{ deleted: boolean }>(res, "Verwijderen mislukt.")
}

export function activateEngagementVersion(
  templateId: string,
  versionId: string
): Promise<EngagementTemplate> {
  return writeTemplate(
    `/admin/engagement/templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(versionId)}/activate`,
    {},
    "Activeren mislukt."
  )
}

export function deactivateEngagementVersion(
  templateId: string,
  versionId: string
): Promise<EngagementTemplate> {
  return writeTemplate(
    `/admin/engagement/templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(versionId)}/deactivate`,
    {},
    "Deactiveren mislukt."
  )
}

export async function listEngagementPrograms(): Promise<EngagementProgram[]> {
  const body = await readEngagementPrograms()
  return body.programs
}

export async function listEngagementStartTriggers(): Promise<StartTriggerOption[]> {
  const body = await readEngagementPrograms()
  return body.start_triggers ?? []
}

async function readEngagementPrograms(): Promise<{
  programs: EngagementProgram[]
  start_triggers?: StartTriggerOption[]
}> {
  const res = await adminFetch("/admin/engagement/programs")
  const body = await readJson<{
    programs: EngagementProgram[]
    start_triggers?: StartTriggerOption[]
  }>(
    res,
    "Automatiseringen laden mislukt."
  )
  return body
}

async function writePrograms(
  path: string,
  body: unknown,
  fallback: string,
  method: "POST" | "DELETE" = "POST"
): Promise<EngagementProgram[]> {
  const res = await adminFetch(path, {
    method,
    body: method === "DELETE" ? undefined : JSON.stringify(body ?? {}),
  })
  const parsed = await readJson<{ programs: EngagementProgram[] }>(res, fallback)
  return parsed.programs
}

export function createEngagementProgram(input: {
  name: string
  program_type: string
}): Promise<EngagementProgram[]> {
  return writePrograms(
    "/admin/engagement/programs",
    input,
    "Automatisering aanmaken mislukt."
  )
}

export function updateEngagementProgram(
  id: string,
  input: {
    name: string
    program_type: string
    start_trigger?: string | null
    start_mode?: "event" | "condition" | "scheduled" | null
    activate?: boolean
    scheduled_at?: string | null
    schedule_timezone?: string | null
    audience?: string | null
    selection_criteria?: {
      locales: string[]
      product_ids: string[]
      brand_ids: string[]
      category_ids: string[]
    } | null
  }
): Promise<EngagementProgram[]> {
  return writePrograms(
    `/admin/engagement/programs/${encodeURIComponent(id)}`,
    input,
    "Automatisering opslaan mislukt."
  )
}

export function createEngagementSequence(
  programId: string,
  name: string
): Promise<EngagementProgram[]> {
  return writePrograms(
    `/admin/engagement/programs/${encodeURIComponent(programId)}/sequences`,
    { name },
    "Automatisering aanmaken mislukt."
  )
}

export function updateEngagementSequence(
  programId: string,
  sequenceId: string,
  name: string
): Promise<EngagementProgram[]> {
  return writePrograms(
    `/admin/engagement/programs/${encodeURIComponent(programId)}/sequences/${encodeURIComponent(sequenceId)}`,
    { name },
    "Sequence opslaan mislukt."
  )
}

export function createEngagementStep(
  programId: string,
  sequenceId: string,
  input: {
    step_order: number
    delay_minutes: number
    template_id: string
    variant_id: string
  }
): Promise<EngagementProgram[]> {
  return writePrograms(
    `/admin/engagement/programs/${encodeURIComponent(programId)}/sequences/${encodeURIComponent(sequenceId)}/steps`,
    input,
    "Bericht toevoegen mislukt."
  )
}

export function updateEngagementStep(
  programId: string,
  sequenceId: string,
  stepId: string,
  input: {
    step_order: number
    delay_minutes: number
    template_id: string
    variant_id: string
  }
): Promise<EngagementProgram[]> {
  return writePrograms(
    `/admin/engagement/programs/${encodeURIComponent(programId)}/sequences/${encodeURIComponent(sequenceId)}/steps/${encodeURIComponent(stepId)}`,
    input,
    "Stap opslaan mislukt."
  )
}

export function orderEngagementSteps(
  programId: string,
  sequenceId: string,
  steps: { id: string; step_order: number }[]
): Promise<EngagementProgram[]> {
  return writePrograms(
    `/admin/engagement/programs/${encodeURIComponent(programId)}/sequences/${encodeURIComponent(sequenceId)}/order`,
    { steps },
    "Volgorde opslaan mislukt."
  )
}

export function deleteEngagementStep(
  programId: string,
  sequenceId: string,
  stepId: string
): Promise<EngagementProgram[]> {
  return writePrograms(
    `/admin/engagement/programs/${encodeURIComponent(programId)}/sequences/${encodeURIComponent(sequenceId)}/steps/${encodeURIComponent(stepId)}`,
    undefined,
    "Bericht verwijderen mislukt.",
    "DELETE"
  )
}

export async function listEngagementEvents(
  filters: EngagementEventFilters = {}
): Promise<{ events: EngagementEvent[]; count: number }> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  const query = params.toString()
  const res = await adminFetch(
    `/admin/engagement/events${query ? `?${query}` : ""}`
  )
  return readJson<{ events: EngagementEvent[]; count: number }>(
    res,
    "Communicatiegeschiedenis laden mislukt."
  )
}

export async function getEngagementEvent(id: string): Promise<EngagementEvent> {
  const res = await adminFetch(
    `/admin/engagement/events/${encodeURIComponent(id)}`
  )
  const body = await readJson<{ event: EngagementEvent }>(
    res,
    "Communicatie laden mislukt."
  )
  return body.event
}
