/**
 * Marketing-verzendlaag op de bestaande communication history.
 * Geen Medusa Notification, geen Crisp en geen providercredentials.
 * Dry-run plant alleen. Een live provider wordt niet aangeroepen.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { isSendableVersion } from "./communication-cms-rules"
import { localeKey, marketingPreferenceAllows } from "./campaign-selection"
import { resolveNewsletterTopics } from "./consumer-rules"
import { marketingPreferenceKey } from "./preference-audit"
import { programTypeToPreferenceCategory } from "./participation-rules"
import {
  contextFromTrigger,
  fillNewsletter,
  isVisualNewsletter,
  type NewsletterCatalog,
} from "./newsletter-fill"

export const MARKETING_DELIVERY_MAX_ATTEMPTS = 3

/** Reden op een gestopte history-rij. Geen verzending. */
export function deliveryStopNote(reason: string): string {
  if (reason === "preference") {
    return "Overgeslagen: de ontvanger is uitgeschreven of de voorkeur staat uit."
  }
  if (reason === "suppressed") {
    return "Overgeslagen: een suppressie blokkeert dit bericht."
  }
  if (reason === "no_sendable_version") {
    return "Overgeslagen: er is geen goedgekeurde actieve berichtversie."
  }
  if (reason === "audience") {
    return "Overgeslagen: het bericht hoort niet bij deze doelgroep."
  }
  if (reason === "ordered") {
    return "Overgeslagen: de consument heeft inmiddels een bestelling geplaatst."
  }
  return "Overgeslagen."
}

export type RecipientKind = "contact" | "consumer" | "affiliate"

export type HistoryDeliveryRow = {
  id: string
  status: string
  contact_id?: string | null
  consumer_id?: string | null
  affiliate_id?: string | null
  program_id?: string | null
  sequence_id?: string | null
  sequence_step_id?: string | null
  template_id?: string | null
  variant_id?: string | null
  template_version_id?: string | null
  provider_message_id?: string | null
  locale?: string | null
  delivery_error?: string | null
  attempt_count?: number | null
  delivery_claim?: string | null
  entry_source?: string | null
  trigger_key?: string | null
}

export type DeliverySnapshot = {
  events: HistoryDeliveryRow[]
  programs: Array<{
    id: string
    program_type: string
    audience?: string | null
    start_trigger?: string | null
  }>
  versions: Array<{
    id: string
    variant_id: string
    subject: string
    preheader?: string
    body?: string
    cta_label?: string
    cta_url?: string | null
    approval_status: string
    activation_status: string
  }>
  variants: Array<{ id: string; locale: string; template_id: string }>
  consumers: Array<{
    id: string
    newsletter_enabled?: boolean
    newsletter_topics?: unknown
  }>
  contacts: Array<{ id: string; organization_id: string }>
  organizations: Array<{ id: string; converted_seller_id?: string | null }>
  sellers: Array<{
    id: string
    communication_preferences?: Record<string, boolean> | null
  }>
  affiliates: Array<{
    id: string
    communication_preferences?: Record<string, boolean> | null
  }>
  suppressions: Array<{ contact_id: string; category: string; active?: boolean }>
  newsletter?: {
    catalog: NewsletterCatalog
    unsubscribeUrl: string
    versionProducts?: Record<string, string>
    categoryNames?: Record<string, string>
    trackingByProduct?: Record<string, string>
  }
}

export type PlannedMarketingDelivery = {
  event_id: string
  recipient_kind: RecipientKind
  recipient_id: string
  locale: string
  program_id: string | null
  sequence_id: string | null
  sequence_step_id: string | null
  template_id: string | null
  variant_id: string
  template_version_id: string
  subject: string
}

export type DryRunItem =
  | { action: "would_deliver"; message: PlannedMarketingDelivery }
  | { action: "skip"; event_id: string; reason: string }

export type ProviderDeliveryResult =
  | { outcome: "sent"; provider_message_id: string }
  | { outcome: "failed"; error: string; retryable: boolean }
  | { outcome: "bounced"; error: string; provider_message_id?: string | null }

export type OutboundMarketingMessage = PlannedMarketingDelivery & {
  claim_token: string
}

/**
 * Aansluitpunt voor een latere e-mailprovider.
 * Geen secrets op dit contract. Crisp en Medusa Notification horen hier niet.
 */
export interface MarketingDeliveryProvider {
  readonly key: string
  deliver(message: OutboundMarketingMessage): Promise<ProviderDeliveryResult>
}

export type DeliveryHistoryPatch = {
  id: string
  status: "queued" | "sent" | "failed" | "bounced"
  provider_message_id: string | null
  bounced: boolean
  locale: string
  delivery_error: string | null
  attempt_count: number
  delivery_claim: string | null
}

const PROVIDER_ID = /^[A-Za-z0-9:_-]{1,200}$/

function attempts(row: HistoryDeliveryRow): number {
  const value = Number(row.attempt_count ?? 0)
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.floor(value)
}

function cleanError(value: string): string {
  const text = value.replace(/\s+/g, " ").trim()
  if (!text) return "Aflevering mislukt."
  return text.slice(0, 500)
}

function recipientOf(
  event: HistoryDeliveryRow,
  audience: string | null | undefined
): { kind: RecipientKind; id: string } | null {
  if (audience === "consumers") {
    return event.consumer_id ? { kind: "consumer", id: event.consumer_id } : null
  }
  if (audience === "affiliates") {
    return event.affiliate_id ? { kind: "affiliate", id: event.affiliate_id } : null
  }
  if (audience === "sellers") {
    return event.contact_id ? { kind: "contact", id: event.contact_id } : null
  }
  if (event.consumer_id) return { kind: "consumer", id: event.consumer_id }
  if (event.affiliate_id) return { kind: "affiliate", id: event.affiliate_id }
  if (event.contact_id) return { kind: "contact", id: event.contact_id }
  return null
}

function deliveryKey(
  event: HistoryDeliveryRow,
  recipient: { kind: RecipientKind; id: string }
): string {
  return [
    recipient.kind,
    recipient.id,
    event.program_id ?? "",
    event.sequence_step_id ?? "",
    event.template_version_id ?? "",
  ].join("|")
}

function marketingAllows(
  snapshot: DeliverySnapshot,
  program: DeliverySnapshot["programs"][number],
  recipient: { kind: RecipientKind; id: string }
): boolean {
  const key = marketingPreferenceKey(
    program.audience === "affiliates"
      ? "affiliates"
      : program.audience === "sellers"
        ? "sellers"
        : "consumers",
    program.program_type,
    program.start_trigger
  )
  if (recipient.kind === "consumer") {
    const consumer = snapshot.consumers.find((row) => row.id === recipient.id)
    if (!consumer || consumer.newsletter_enabled !== true) return false
    const topics = resolveNewsletterTopics(consumer.newsletter_topics, true)
    return marketingPreferenceAllows("consumers", topics, key)
  }
  if (recipient.kind === "affiliate") {
    const affiliate = snapshot.affiliates.find((row) => row.id === recipient.id)
    if (!affiliate) return false
    return marketingPreferenceAllows("affiliates", affiliate.communication_preferences, key)
  }
  const contact = snapshot.contacts.find((row) => row.id === recipient.id)
  const organization = snapshot.organizations.find(
    (row) => row.id === contact?.organization_id
  )
  const seller = snapshot.sellers.find(
    (row) => row.id === organization?.converted_seller_id
  )
  if (!seller) return false
  return marketingPreferenceAllows("sellers", seller.communication_preferences, key)
}

function suppressed(
  snapshot: DeliverySnapshot,
  contactId: string | null | undefined,
  category: string
): boolean {
  if (!contactId) return false
  return snapshot.suppressions.some(
    (row) => row.contact_id === contactId && row.category === category && row.active !== false
  )
}

function lockReason(event: HistoryDeliveryRow): string | null {
  if (event.provider_message_id?.trim()) return "already_sent"
  if (event.status === "sent") return "already_sent"
  if (event.status === "bounced") return "bounced"
  if (event.status === "stopped") return "stopped"
  if (event.delivery_claim?.trim()) return "in_flight"
  const used = attempts(event)
  if (event.status === "failed" && used >= MARKETING_DELIVERY_MAX_ATTEMPTS) {
    return "attempts_exhausted"
  }
  if (event.status !== "queued" && event.status !== "failed") return "not_queued"
  return null
}

/**
 * Plant welke bestaande history-rijen nu afgeleverd zouden worden.
 * Wijzigt de rijen niet en roept geen provider aan.
 */
export function dryRunDeliveries(snapshot: DeliverySnapshot): DryRunItem[] {
  const programs = new Map(snapshot.programs.map((row) => [row.id, row]))
  const versions = new Map(snapshot.versions.map((row) => [row.id, row]))
  const variants = new Map(snapshot.variants.map((row) => [row.id, row]))
  const taken = new Set<string>()
  const items: DryRunItem[] = []

  const ordered = [...snapshot.events].sort((a, b) => a.id.localeCompare(b.id))
  for (const event of ordered) {
    const program = event.program_id ? programs.get(event.program_id) : undefined
    const recipient = recipientOf(event, program?.audience)
    if (!recipient || !program) continue
    const locked = lockReason(event)
    if (locked === "already_sent" || locked === "bounced" || locked === "in_flight") {
      taken.add(deliveryKey(event, recipient))
    }
  }

  for (const event of ordered) {
    const locked = lockReason(event)
    if (locked) {
      if (locked !== "stopped" && locked !== "bounced" && locked !== "already_sent") {
        items.push({ action: "skip", event_id: event.id, reason: locked })
      } else if (event.status === "queued" || event.status === "failed") {
        items.push({ action: "skip", event_id: event.id, reason: locked })
      }
      continue
    }
    const program = event.program_id ? programs.get(event.program_id) : undefined
    if (!program) {
      items.push({ action: "skip", event_id: event.id, reason: "unknown_program" })
      continue
    }
    const recipient = recipientOf(event, program.audience)
    if (!recipient) {
      items.push({ action: "skip", event_id: event.id, reason: "no_recipient" })
      continue
    }
    const key = deliveryKey(event, recipient)
    if (taken.has(key)) {
      items.push({ action: "skip", event_id: event.id, reason: "duplicate" })
      continue
    }
    const version = event.template_version_id
      ? versions.get(event.template_version_id)
      : undefined
    const variant = version ? variants.get(version.variant_id) : undefined
    const locale = localeKey(variant?.locale)
    if (
      !version ||
      !variant ||
      !isSendableVersion(version) ||
      (event.variant_id && version.variant_id !== event.variant_id) ||
      !version.subject.trim() ||
      locale.length !== 2
    ) {
      items.push({ action: "skip", event_id: event.id, reason: "no_sendable_version" })
      continue
    }
    let category = ""
    try {
      category = programTypeToPreferenceCategory(program.program_type)
    } catch {
      items.push({ action: "skip", event_id: event.id, reason: "unknown_program" })
      continue
    }
    if (suppressed(snapshot, event.contact_id, category)) {
      items.push({ action: "skip", event_id: event.id, reason: "suppressed" })
      continue
    }
    if (
      (program.program_type === "newsletter" || program.program_type === "campaign") &&
      !marketingAllows(snapshot, program, recipient)
    ) {
      items.push({ action: "skip", event_id: event.id, reason: "preference" })
      continue
    }
    taken.add(key)
    items.push({
      action: "would_deliver",
      message: {
        event_id: event.id,
        recipient_kind: recipient.kind,
        recipient_id: recipient.id,
        locale,
        program_id: event.program_id ?? null,
        sequence_id: event.sequence_id ?? null,
        sequence_step_id: event.sequence_step_id ?? null,
        template_id: event.template_id ?? variant.template_id,
        variant_id: version.variant_id,
        template_version_id: version.id,
        subject: version.subject.trim(),
      },
    })
  }
  return items
}

/**
 * Dry-run is de enige toegestane modus. Live gooit, ook als er een provider is.
 */
export function deliverQueuedMarketing(input: {
  mode?: "dry-run" | "live"
  snapshot: DeliverySnapshot
  provider?: MarketingDeliveryProvider
}): DryRunItem[] {
  if (input.mode === "live") {
    void input.provider
    throw new Error("Marketingverzending is niet aangesloten. Alleen dry-run is toegestaan.")
  }
  return dryRunDeliveries(input.snapshot)
}

export function beginDeliveryAttempt(
  row: HistoryDeliveryRow
):
  | { ok: true; claim_token: string; attempt: number }
  | { ok: false; reason: string } {
  const locked = lockReason(row)
  if (locked) return { ok: false, reason: locked }
  const attempt = attempts(row) + 1
  if (attempt > MARKETING_DELIVERY_MAX_ATTEMPTS) {
    return { ok: false, reason: "attempts_exhausted" }
  }
  return { ok: true, claim_token: `${row.id}:${attempt}`, attempt }
}

/**
 * Schrijft het latere resultaat op dezelfde history-rij.
 * Een andere claim of een bestaand provider-id wordt geweigerd.
 */
export function applyDeliveryResult(input: {
  row: HistoryDeliveryRow
  claim_token: string
  locale: string
  result: ProviderDeliveryResult
}): { ok: true; patch: DeliveryHistoryPatch } | { ok: false; reason: string } {
  const token = input.claim_token.trim()
  if (!token || input.row.delivery_claim?.trim() !== token) {
    return { ok: false, reason: "stale_claim" }
  }
  if (input.row.provider_message_id?.trim() || input.row.status === "sent") {
    return { ok: false, reason: "already_sent" }
  }
  if (input.row.status === "bounced") return { ok: false, reason: "bounced" }
  const locale = localeKey(input.locale)
  if (locale.length !== 2) return { ok: false, reason: "missing_locale" }
  const attempt = Number(token.slice(token.lastIndexOf(":") + 1))
  if (!Number.isFinite(attempt) || attempt < 1) {
    return { ok: false, reason: "stale_claim" }
  }
  const base = {
    id: input.row.id,
    locale,
    attempt_count: attempt,
    delivery_claim: null as string | null,
  }
  if (input.result.outcome === "sent") {
    const provider_message_id = input.result.provider_message_id.trim()
    if (!PROVIDER_ID.test(provider_message_id)) {
      return { ok: false, reason: "missing_provider_id" }
    }
    return {
      ok: true,
      patch: {
        ...base,
        status: "sent",
        provider_message_id,
        bounced: false,
        delivery_error: null,
      },
    }
  }
  if (input.result.outcome === "bounced") {
    const provider_message_id = input.result.provider_message_id?.trim() || null
    if (provider_message_id && !PROVIDER_ID.test(provider_message_id)) {
      return { ok: false, reason: "missing_provider_id" }
    }
    return {
      ok: true,
      patch: {
        ...base,
        status: "bounced",
        provider_message_id,
        bounced: true,
        delivery_error: cleanError(input.result.error),
      },
    }
  }
  const retry = input.result.retryable && attempt < MARKETING_DELIVERY_MAX_ATTEMPTS
  return {
    ok: true,
    patch: {
      ...base,
      status: retry ? "queued" : "failed",
      provider_message_id: null,
      bounced: false,
      delivery_error: cleanError(input.result.error),
    },
  }
}

/**
 * Eén UPDATE. Een tweede worker ziet de claim en wijzigt nul rijen.
 * attempt_count blijft staan tot het resultaat; de token is id:poging.
 */
export const DELIVERY_CLAIM_SQL = `
UPDATE "engagement_communication_event"
SET "delivery_claim" = "id" || ':' || ("attempt_count" + 1)::text,
    "updated_at" = now()
WHERE "id" = ?
  AND "deleted_at" IS NULL
  AND "delivery_claim" IS NULL
  AND ("provider_message_id" IS NULL OR btrim("provider_message_id") = '')
  AND "status" IN ('queued', 'failed')
  AND "attempt_count" < ${MARKETING_DELIVERY_MAX_ATTEMPTS}
RETURNING "id", "delivery_claim", "attempt_count"
`.trim()

export type ClaimStore = { row: HistoryDeliveryRow | null }

/** Past dezelfde voorwaarden toe als DELIVERY_CLAIM_SQL, in één stap. */
export function claimFromStore(
  store: ClaimStore,
  id: string
):
  | { ok: true; claim_token: string; attempt: number }
  | { ok: false; reason: string } {
  const row = store.row
  if (!row || row.id !== id) return { ok: false, reason: "missing" }
  const claim = beginDeliveryAttempt(row)
  if (!claim.ok) return claim
  store.row = { ...row, delivery_claim: claim.claim_token }
  return { ok: true, claim_token: claim.claim_token, attempt: claim.attempt }
}

export type EmailProductBlock = {
  product_id: string
  name: string
  text: string
  image_url: string
  link_label: string
  link_url: string
  commission_label: string
}

export type MarketingEmailPayload = {
  event_id: string
  locale: string
  variant_id: string
  template_version_id: string
  subject: string
  preheader: string
  html: string
  text: string
  cta_label: string
  cta_url: string | null
  products: EmailProductBlock[]
}

export type ProviderWebhook = {
  event_id?: string | null
  provider_message_id?: string | null
  claim_token?: string | null
  type: "delivered" | "bounced" | "failed"
  error?: string | null
  retryable?: boolean
}

function decodeHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ")
    .trim()
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function attr(html: string, name: string): string {
  const match = html.match(new RegExp(`${name}="([^"]*)"`, "i"))
  return match?.[1] ? decodeHtml(match[1]) : ""
}

function tagText(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"))
  return match?.[1] ? decodeHtml(match[1]) : ""
}

function parseProductChunk(block: string): EmailProductBlock {
  const link = block.match(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
  const commission = block.match(/data-em-commission="1">([^<]*)/i)
  const withoutCommission = block.replace(/<p\b[^>]*data-em-commission="1"[^>]*>[\s\S]*?<\/p>/gi, "")
  const paragraphs = [...withoutCommission.matchAll(/<p\b(?![^>]*data-em-commission)[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => decodeHtml(match[1] ?? ""))
    .filter((line) => line && !/^bekijk product$/i.test(line))
  return {
    product_id: attr(block, "data-em-product"),
    name: tagText(block, "h3"),
    text: paragraphs.join("\n\n"),
    image_url: attr(block, "src"),
    link_label: link?.[2] ? decodeHtml(link[2]) : "",
    link_url: link?.[1] ? decodeHtml(link[1]) : "",
    commission_label: commission?.[1]?.replace(/^Commissie:\s*/i, "").trim() ?? "",
  }
}

export function parseEmailProductBlocks(html: string): EmailProductBlock[] {
  const source = html || ""
  const chunks: string[] = []
  if (source.includes("<!--em-block:product")) {
    const parts = source.split(/<!--em-block:products?-->/i).slice(1)
    for (const part of parts) {
      const block = part.split(/<!--em-block:/i)[0] ?? ""
      if (block.includes("<!--em-item-->")) {
        chunks.push(...block.split("<!--em-item-->").slice(1))
      } else {
        chunks.push(block)
      }
    }
  } else if (/<!--em-product-->/i.test(source)) {
    chunks.push(...source.split(/<!--em-product-->/i).slice(1))
  }
  return chunks
    .map(parseProductChunk)
    .filter((product) => product.name || product.product_id || product.image_url)
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function renderApprovedVersion(input: {
  event_id: string
  locale: string
  version: {
    id: string
    variant_id: string
    subject: string
    preheader?: string
    body?: string
    cta_label?: string
    cta_url?: string | null
    approval_status: string
    activation_status: string
  }
}): { ok: true; payload: MarketingEmailPayload } | { ok: false; reason: string } {
  if (!isSendableVersion(input.version)) return { ok: false, reason: "no_sendable_version" }
  const locale = localeKey(input.locale)
  if (locale.length !== 2) return { ok: false, reason: "missing_locale" }
  const subject = input.version.subject.trim()
  if (!subject) return { ok: false, reason: "no_sendable_version" }
  const preheader = input.version.preheader?.trim() ?? ""
  const body = input.version.body ?? ""
  const cta_label = input.version.cta_label?.trim() ?? ""
  const cta_url = input.version.cta_url?.trim() || null
  const parts: string[] = []
  if (preheader) {
    parts.push(
      `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>`
    )
  }
  if (body) parts.push(body)
  if (cta_label && cta_url && !body.includes(cta_url)) {
    parts.push(`<p><a href="${escapeHtml(cta_url)}">${escapeHtml(cta_label)}</a></p>`)
  }
  const html = parts.join("")
  return {
    ok: true,
    payload: {
      event_id: input.event_id,
      locale,
      variant_id: input.version.variant_id,
      template_version_id: input.version.id,
      subject,
      preheader,
      html,
      text: htmlToText([preheader, htmlToText(body), cta_label].filter(Boolean).join("\n\n")),
      cta_label,
      cta_url,
      products: parseEmailProductBlocks(body),
    },
  }
}

function absoluteDeliveryCta(storefront: string, value: string | null): string {
  const trimmed = value?.trim() ?? ""
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return `${storefront}${trimmed}`
  return trimmed
}

function renderVisualDelivery(
  snapshot: DeliverySnapshot,
  event: HistoryDeliveryRow,
  rendered: { ok: true; payload: MarketingEmailPayload }
): { ok: true; payload: MarketingEmailPayload } | { ok: false; reason: string } {
  const body = snapshot.versions.find((row) => row.id === rendered.payload.template_version_id)?.body ?? ""
  if (!isVisualNewsletter(body)) return rendered
  const pack = snapshot.newsletter
  if (!pack?.catalog || !pack.unsubscribeUrl.trim()) {
    return { ok: false, reason: "newsletter_catalog" }
  }
  const program = snapshot.programs.find((row) => row.id === event.program_id)
  const audience =
    program?.audience === "affiliates" || program?.audience === "sellers"
      ? program.audience
      : program?.program_type === "acquisition"
        ? "prospects"
        : "consumers"
  const trigger = contextFromTrigger(event.entry_source, event.trigger_key, {
    versionProducts: pack.versionProducts,
    categoryNames: pack.categoryNames,
  })
  const storefront = pack.unsubscribeUrl.replace(/\/nieuwsbrief\/uitschrijven\/.*$/, "")
  const filled = fillNewsletter({
    body,
    preheader: rendered.payload.preheader,
    ctaLabel: rendered.payload.cta_label,
    ctaUrl: absoluteDeliveryCta(storefront, rendered.payload.cta_url),
    unsubscribeUrl: pack.unsubscribeUrl,
    locale: rendered.payload.locale,
    audience,
    catalog: pack.catalog,
    context: {
      ...trigger,
      trackingByProduct: pack.trackingByProduct,
    },
  })
  if (filled.problems.length > 0) return { ok: false, reason: "newsletter_incomplete" }
  return {
    ok: true,
    payload: {
      ...rendered.payload,
      html: filled.html,
      text: htmlToText(filled.html),
      products: parseEmailProductBlocks(filled.html),
    },
  }
}

/**
 * Zelfde poort als de dry-run, daarna de goedgekeurde versie.
 * Een uitgeschreven of onderdrukte ontvanger krijgt geen payload.
 */
export function prepareMarketingEmail(
  snapshot: DeliverySnapshot,
  eventId: string
): { ok: true; payload: MarketingEmailPayload } | { ok: false; reason: string } {
  const event = snapshot.events.find((row) => row.id === eventId)
  if (!event) return { ok: false, reason: "missing" }
  const planned = dryRunDeliveries(snapshot)
  const match = planned.find(
    (item) =>
      (item.action === "would_deliver" && item.message.event_id === eventId) ||
      (item.action === "skip" && item.event_id === eventId)
  )
  if (!match) {
    if (event.status === "sent" || event.provider_message_id?.trim()) {
      return { ok: false, reason: "already_sent" }
    }
    if (event.status === "bounced") return { ok: false, reason: "bounced" }
    return { ok: false, reason: "not_queued" }
  }
  if (match.action === "skip") return { ok: false, reason: match.reason }
  const version = snapshot.versions.find((row) => row.id === match.message.template_version_id)
  if (!version || !isSendableVersion(version)) {
    return { ok: false, reason: "no_sendable_version" }
  }
  const storedLocale = localeKey(event.locale)
  if (storedLocale && storedLocale !== match.message.locale) {
    return { ok: false, reason: "locale_mismatch" }
  }
  const rendered = renderApprovedVersion({
    event_id: eventId,
    locale: match.message.locale,
    version,
  })
  if (!rendered.ok) return rendered
  return renderVisualDelivery(snapshot, event, rendered)
}

/**
 * Koppelt een later providerbericht aan één history-rij.
 * Zet nooit zelf `sent` en verstuurt niets. Een bounce geldt alleen
 * voor een rij die al verzonden is. Een herhaling levert niets opnieuw af.
 */
export function planProviderWebhook(
  row: HistoryDeliveryRow,
  hook: ProviderWebhook
):
  | { action: "ignore"; reason: "duplicate" }
  | { action: "update"; patch: DeliveryHistoryPatch }
  | { action: "reject"; reason: string } {
  if (hook.event_id && hook.event_id !== row.id) return { action: "reject", reason: "wrong_message" }
  const incoming = hook.provider_message_id?.trim() || ""
  const current = row.provider_message_id?.trim() || ""
  if (incoming && current && incoming !== current) {
    return { action: "reject", reason: "wrong_message" }
  }
  if (hook.type === "delivered" && row.status === "sent" && current && (!incoming || incoming === current)) {
    return { action: "ignore", reason: "duplicate" }
  }
  if (hook.type === "bounced" && row.status === "bounced") {
    return { action: "ignore", reason: "duplicate" }
  }
  if (hook.type === "failed" && (row.status === "sent" || row.status === "bounced" || current)) {
    return { action: "ignore", reason: "duplicate" }
  }
  if (hook.type === "bounced" && row.status === "sent" && current && (!incoming || incoming === current)) {
    const locale = localeKey(row.locale)
    if (locale.length !== 2) return { action: "reject", reason: "missing_locale" }
    return {
      action: "update",
      patch: {
        id: row.id,
        status: "bounced",
        provider_message_id: current,
        bounced: true,
        locale,
        delivery_error: cleanError(hook.error || "bounced"),
        attempt_count: attempts(row),
        delivery_claim: null,
      },
    }
  }
  return { action: "reject", reason: "webhook_cannot_send" }
}

export const DELIVERY_WEBHOOK_SKEW_MS = 5 * 60 * 1000

const NONCE = /^[A-Za-z0-9_-]{16,128}$/

export function deliveryWebhookSignature(
  secret: string,
  timestamp: string,
  nonce: string,
  rawBody: string
): string {
  return createHmac("sha256", secret).update(`${timestamp}.${nonce}.${rawBody}`).digest("hex")
}

export function deliveryWebhookBodyHash(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex")
}

/**
 * Weigert een ontbrekende sleutel, een foute handtekening en een verlopen tijdstip.
 * De sleutel komt van de aanroeper; deze module bewaart er geen.
 */
export function verifyDeliveryWebhook(input: {
  secret: string | null | undefined
  rawBody: string
  signature: string | null | undefined
  timestamp: string | null | undefined
  nonce: string | null | undefined
  now: Date
}):
  | { ok: true; nonce: string; bodyHash: string }
  | { ok: false; reason: "unconfigured" | "signature" | "stale" } {
  const secret = input.secret?.trim() ?? ""
  if (!secret) return { ok: false, reason: "unconfigured" }
  const timestamp = input.timestamp?.trim() ?? ""
  const nonce = input.nonce?.trim() ?? ""
  const signature = input.signature?.trim().toLowerCase() ?? ""
  const seconds = Number(timestamp)
  if (!timestamp || !Number.isFinite(seconds) || !NONCE.test(nonce) || !/^[0-9a-f]{64}$/.test(signature)) {
    return { ok: false, reason: "signature" }
  }
  const skew = Math.abs(input.now.getTime() - seconds * 1000)
  if (skew > DELIVERY_WEBHOOK_SKEW_MS) return { ok: false, reason: "stale" }
  const expected = deliveryWebhookSignature(secret, timestamp, nonce, input.rawBody)
  const left = Buffer.from(signature, "hex")
  const right = Buffer.from(expected, "hex")
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return { ok: false, reason: "signature" }
  }
  return { ok: true, nonce, bodyHash: deliveryWebhookBodyHash(input.rawBody) }
}

/** Zelfde nonce met een andere body is een replay. Dezelfde body is idempotent. */
export function assessWebhookReplay(input: {
  bodyHash: string
  previousBodyHash: string | null
}): { ok: true; duplicate: boolean } | { ok: false; reason: "replay" } {
  if (!input.previousBodyHash) return { ok: true, duplicate: false }
  if (input.previousBodyHash === input.bodyHash) return { ok: true, duplicate: true }
  return { ok: false, reason: "replay" }
}
