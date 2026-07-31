import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { MODERATION_MODULE } from "../../modules/moderation"
import type ModerationModuleService from "../../modules/moderation/service"
import { PRODUCT_CLOUD_MODULE } from "../../modules/product-cloud"
import type ProductCloudModuleService from "../../modules/product-cloud/service"
import {
  executeGenerateAiRecommendation,
  executeGetAiMetadataForSubject,
} from "../ai-support/workflows"

export type QueueKey =
  | "claims"
  | "ownership"
  | "matching"
  | "disputes"
  | "fraude"
  | "meldingen"
  | "hoog-risico"

export const QUEUE_KEYS: QueueKey[] = [
  "claims",
  "ownership",
  "matching",
  "disputes",
  "fraude",
  "meldingen",
  "hoog-risico",
]

export type QueueItem = {
  queue: QueueKey
  id: string
  item_type: string
  title: string
  status: string
  product_id: string | null
  seller_id: string | null
  affiliate_id: string | null
  signal_code: string | null
  created_at: string
  age_hours: number
}

function ageHours(createdAt: Date | string): number {
  const t = new Date(createdAt).getTime()
  return Math.max(0, Math.round((Date.now() - t) / 3_600_000))
}

function asIso(createdAt: Date | string): string {
  return new Date(createdAt).toISOString()
}

export async function executeOpenFraudSignal(
  container: MedusaContainer,
  input: {
    signal_code: string
    affiliate_id?: string | null
    subject_customer_id?: string | null
    source_entity_type?: string | null
    source_entity_id?: string | null
    product_id?: string | null
    seller_id?: string | null
  }
) {
  const moderation = container.resolve(
    MODERATION_MODULE
  ) as ModerationModuleService
  const eventBus = container.resolve(Modules.EVENT_BUS)

  const created = await moderation.createModerationCases({
    product_id: input.product_id ?? null,
    seller_id: input.seller_id ?? null,
    case_type: "Fraude-signaal",
    status: "Gesignaleerd",
    ai_metadata_id: null,
    signal_code: input.signal_code,
    affiliate_id: input.affiliate_id ?? null,
    subject_customer_id: input.subject_customer_id ?? null,
    source_entity_type: input.source_entity_type ?? null,
    source_entity_id: input.source_entity_id ?? null,
    decision_reason: null,
    decided_at: null,
  })

  await eventBus.emit({
    name: "ModerationCaseOpened",
    data: {
      case_id: created.id,
      case_type: created.case_type,
      signal_code: input.signal_code,
      affiliate_id: input.affiliate_id ?? null,
    },
  })

  return { case: created }
}

export async function executeListQueueSummary(container: MedusaContainer) {
  const items = await executeListAllOpenQueueItems(container)
  const counts: Record<QueueKey, number> = {
    claims: 0,
    ownership: 0,
    matching: 0,
    disputes: 0,
    fraude: 0,
    meldingen: 0,
    "hoog-risico": 0,
  }
  for (const item of items) {
    counts[item.queue] += 1
  }
  return {
    queues: QUEUE_KEYS.map((key) => ({
      key,
      count: counts[key],
    })),
  }
}

export async function executeListQueue(
  container: MedusaContainer,
  queue: QueueKey
) {
  const all = await executeListAllOpenQueueItems(container)
  const items = all
    .filter((i) => i.queue === queue)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  return { queue, items, count: items.length }
}

export async function executeListAllOpenQueueItems(
  container: MedusaContainer
): Promise<QueueItem[]> {
  const moderation = container.resolve(
    MODERATION_MODULE
  ) as ModerationModuleService
  const productCloud = container.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const items: QueueItem[] = []

  const claims = await productCloud.listClaims(
    { status: "In beoordeling" },
    { take: 500, order: { created_at: "ASC" } }
  )
  for (const c of claims) {
    items.push({
      queue: "claims",
      id: c.id,
      item_type: "Claim",
      title: `Claim ${c.id}`,
      status: c.status,
      product_id: c.product_id ?? null,
      seller_id: c.claimant_seller_id ?? null,
      affiliate_id: null,
      signal_code: null,
      created_at: asIso(c.created_at),
      age_hours: ageHours(c.created_at),
    })
  }

  // Route B: geen aparte pending-transfer-entiteit in MVP — wachtrij blijft zichtbaar/leeg.
  // (OwnershipRecord is append-only historie, geen Ingediend-status.)

  const matches = await productCloud.listMatchCandidates(
    { status: "Kandidaat" },
    { take: 500, order: { created_at: "ASC" } }
  )
  for (const m of matches) {
    items.push({
      queue: "matching",
      id: m.id,
      item_type: "Matching-kandidaat",
      title: `Match ${m.product_id_a} / ${m.product_id_b}`,
      status: m.status,
      product_id: m.product_id_a ?? null,
      seller_id: null,
      affiliate_id: null,
      signal_code: null,
      created_at: asIso(m.created_at),
      age_hours: ageHours(m.created_at),
    })
  }

  const disputes = await productCloud.listDisputes(
    { status: "Open" },
    { take: 500, order: { created_at: "ASC" } }
  )
  for (const d of disputes) {
    items.push({
      queue: "disputes",
      id: d.id,
      item_type: "Geschil",
      title: `Dispute ${d.id}`,
      status: d.status,
      product_id: d.product_id ?? null,
      seller_id: null,
      affiliate_id: null,
      signal_code: null,
      created_at: asIso(d.created_at),
      age_hours: ageHours(d.created_at),
    })
  }

  const cases = await moderation.listModerationCases(
    { status: "Gesignaleerd" },
    { take: 1000, order: { created_at: "ASC" } }
  )
  for (const row of cases) {
    let queue: QueueKey = "fraude"
    if (row.case_type === "Melding derde partij") queue = "meldingen"
    if (row.case_type === "Hoog-risico wijziging") queue = "hoog-risico"
    items.push({
      queue,
      id: row.id,
      item_type: row.case_type,
      title: row.signal_code
        ? `${row.case_type}: ${row.signal_code}`
        : row.case_type,
      status: row.status,
      product_id: row.product_id,
      seller_id: row.seller_id,
      affiliate_id: row.affiliate_id,
      signal_code: row.signal_code,
      created_at: asIso(row.created_at),
      age_hours: ageHours(row.created_at),
    })
  }

  const proposals = await productCloud.listChangeProposals(
    { status: "In behandeling" },
    { take: 500, order: { created_at: "ASC" } }
  )
  for (const p of proposals) {
    items.push({
      queue: "hoog-risico",
      id: p.id,
      item_type: "Hoog-risico publicatiewijziging",
      title: p.proposed_title || `Wijzigingsvoorstel ${p.id}`,
      status: p.status,
      product_id: p.product_id ?? null,
      seller_id: p.submitter_seller_id ?? null,
      affiliate_id: null,
      signal_code: null,
      created_at: asIso(p.created_at),
      age_hours: ageHours(p.created_at),
    })
  }

  return items
}

export async function executeGetQueueItem(
  container: MedusaContainer,
  queue: QueueKey,
  id: string
) {
  const list = await executeListQueue(container, queue)
  const item = list.items.find((i) => i.id === id)
  if (!item) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Moderatie-item niet gevonden in deze wachtrij."
    )
  }

  if (queue === "fraude" || queue === "meldingen" || queue === "hoog-risico") {
    const moderation = container.resolve(
      MODERATION_MODULE
    ) as ModerationModuleService
    try {
      const row = await moderation.retrieveModerationCase(id)
      let ai_metadata = await executeGetAiMetadataForSubject(
        container,
        "moderation_case",
        id
      )
      if (!ai_metadata) {
        const generated = await executeGenerateAiRecommendation(container, {
          subject_type: "moderation_case",
          subject_id: id,
        })
        ai_metadata = generated.ai_metadata
      }
      const pct = Math.round(ai_metadata.confidence_score * 100)
      return {
        item,
        detail: {
          case_type: row.case_type,
          signal_code: row.signal_code,
          affiliate_id: row.affiliate_id,
          subject_customer_id: row.subject_customer_id,
          source_entity_type: row.source_entity_type,
          source_entity_id: row.source_entity_id,
          decision_reason: row.decision_reason,
          status: row.status,
          ai_note: `AI-advies: ${ai_metadata.explanation ?? "Geen toelichting."}`,
          ai_metadata: {
            id: ai_metadata.id,
            recommendation_type: ai_metadata.recommendation_type,
            confidence_score: ai_metadata.confidence_score,
            confidence_percent: pct,
            explanation: ai_metadata.explanation,
            label: "Aanbeveling — AI ondersteunt, mens beslist",
          },
        },
        actions: ["geen_actie", "escaleren"] as const,
      }
    } catch {
      // change proposal in hoog-risico
    }
  }

  return {
    item,
    detail: {
      case_type: item.item_type,
      signal_code: item.signal_code,
      affiliate_id: item.affiliate_id,
      subject_customer_id: null,
      source_entity_type: queue,
      source_entity_id: id,
      decision_reason: null,
      status: item.status,
      ai_note:
        "AI ondersteunt met context waar beschikbaar; AI beslist nooit.",
      ai_metadata: null,
    },
    actions: ["open_underlying"] as const,
  }
}

export async function executeDecideModerationCase(
  container: MedusaContainer,
  input: {
    case_id: string
    decision: "geen_actie" | "escaleren"
    reason?: string | null
    actor_user_id?: string | null
  }
) {
  const moderation = container.resolve(
    MODERATION_MODULE
  ) as ModerationModuleService
  const eventBus = container.resolve(Modules.EVENT_BUS)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const row = await moderation.retrieveModerationCase(input.case_id)
  if (row.status !== "Gesignaleerd") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Case is al besloten."
    )
  }

  const reason = input.reason?.trim() || null
  if (input.decision === "escaleren" && !reason) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "reason is verplicht bij escalatie."
    )
  }
  // F6: Geen actie wordt ook gelogd — reason optioneel maar status altijd gezet.
  const status = input.decision === "geen_actie" ? "Geen actie" : "Geëscaleerd"
  const updated = await moderation.updateModerationCases({
    id: row.id,
    status,
    decision_reason:
      reason ||
      (input.decision === "geen_actie" ? "Geen actie (expliciet gelogd)" : null),
    decided_at: new Date(),
  })

  await eventBus.emit({
    name: "ModerationCaseResolved",
    data: {
      case_id: updated.id,
      case_type: updated.case_type,
      status: updated.status,
      decision: input.decision,
      reason: updated.decision_reason,
      actor_user_id: input.actor_user_id ?? null,
      signal_code: updated.signal_code,
      affiliate_id: updated.affiliate_id,
    },
  })

  logger.info(
    `[moderation] case=${updated.id} decision=${input.decision} status=${updated.status}`
  )

  return { case: updated }
}
