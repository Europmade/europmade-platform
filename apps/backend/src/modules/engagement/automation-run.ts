/**
 * Start actieve automatiseringen vanuit de bestaande job en events.
 * Schrijft enrollments en queued history. Verzendt niets.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { AFFILIATE_MODULE } from "../affiliate"
import { COMMERCE_CLOUD_MODULE } from "../commerce-cloud"
import { ORDER_MODULE } from "../order-service"
import { PARTNER_MODULE } from "../partner"
import { PRODUCT_CLOUD_MODULE } from "../product-cloud"
import {
  computeProductCompleteness,
  type AttributeInput,
} from "../product-cloud/completeness"
import { VERIFICATION_MODULE } from "../verification"
import { ENGAGEMENT_MODULE } from "."
import {
  dedupeEnrollCalls,
  planOccurrenceEnrollments,
  planScheduledEnrollments,
  type DispatchProgram,
  type EnrollCall,
  type ScheduledRecipient,
} from "./automation-dispatch"
import {
  buildCampaignDirectory,
  catalogLinks,
  filterCampaignCalls,
} from "./campaign-selection"
import {
  collectOccurrences,
  expandBroadcasts,
  sellerOnboardedOccurrence,
  type AutomationSnapshot,
} from "./automation-occurrences"
import { planSellerRecipient, type ContactRef, type OrganizationRef, type SellerRef } from "./orchestrator-rules"
import type { OrchestratorApi } from "./orchestrator-run"

const TAKE = 500

type ListFn = (filters: object, config?: { take?: number }) => Promise<unknown[]>

type RunApi = OrchestratorApi & {
  enrollRecipient?(input: {
    consumer_id?: string | null
    affiliate_id?: string | null
    program_id: string
    sequence_id: string
    sequence_step_id: string
    trigger_key: string
    entry_source: string
    next_step_at?: Date | null
  }): Promise<{ id: string }>
  listEngagementLifecyclePrograms: (
    filters: object,
    config?: { take?: number; relations?: string[] }
  ) => Promise<DispatchProgram[]>
  listEngagementOrganizations: ListFn
  listEngagementContacts: ListFn
  listEngagementConsumers: ListFn
}

export async function dispatchAutomation(
  container: MedusaContainer,
  options?: { only?: string[]; sellerId?: string }
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const log = (message: string) => logger.warn(`[engagement] ${message}`)
  const engagement = container.resolve(ENGAGEMENT_MODULE) as RunApi
  const now = new Date()
  const programs = await engagement.listEngagementLifecyclePrograms(
    {},
    { take: TAKE, relations: ["sequences", "sequences.steps"] }
  )
  const active = programs.filter((program) => program.activation_status === "active")
  if (options?.sellerId) {
    const snapshot = await loadSnapshot(container, log, now)
    await enrollCalls(
      engagement,
      filterCampaignCalls(
        active,
        planOccurrenceEnrollments({
          programs: active,
          occurrences: [sellerOnboardedOccurrence(options.sellerId)],
          now,
        }),
        campaignDirectory(snapshot)
      ),
      container,
      log,
      now
    )
    return
  }
  const wanted = options?.only?.length
    ? options.only
    : [
        ...new Set(
          active
            .map((program) => program.start_trigger?.trim() || "")
            .filter((key) => key && key !== "seller_onboarded")
        ),
      ]
  if (!options?.only) {
    const snapshot = await loadSnapshot(container, log, now)
    const occurrences = expandBroadcasts(collectOccurrences(snapshot, wanted), snapshot)
    const directory = campaignDirectory(snapshot)
    await enrollCalls(
      engagement,
      filterCampaignCalls(
        active,
        planOccurrenceEnrollments({ programs: active, occurrences, now }),
        directory
      ),
      container,
      log,
      now
    )
    await enrollCalls(
      engagement,
      filterCampaignCalls(
        active,
        planScheduledEnrollments({
          programs: active,
          recipients: scheduledRecipients(snapshot),
          now,
        }),
        directory
      ),
      container,
      log,
      now
    )
    return
  }
  const snapshot = await loadSnapshot(container, log, now)
  const occurrences = expandBroadcasts(collectOccurrences(snapshot, wanted), snapshot)
  await enrollCalls(
    engagement,
    filterCampaignCalls(
      active,
      planOccurrenceEnrollments({ programs: active, occurrences, now }),
      campaignDirectory(snapshot)
    ),
    container,
    log,
    now
  )
}

function campaignDirectory(snapshot: AutomationSnapshot) {
  return buildCampaignDirectory({
    consumers: snapshot.consumers,
    sellers: snapshot.sellers,
    affiliates: snapshot.affiliates,
    links: catalogLinks({
      versions: snapshot.versions,
      products: snapshot.products,
      product_categories: snapshot.product_categories,
      affiliate_links: snapshot.affiliate_links,
    }),
    organizations: snapshot.organizations,
    contacts: snapshot.contacts,
    suppressions: snapshot.suppressions,
  })
}

async function enrollCalls(
  api: RunApi,
  calls: EnrollCall[],
  container: MedusaContainer,
  log: (message: string) => void,
  now: Date
) {
  const unique = dedupeEnrollCalls(calls)
  if (unique.length === 0) return
  const sellers = await listSellers(container, log)
  const organizations = (await api.listEngagementOrganizations({}, { take: TAKE })) as OrganizationRef[]
  const contacts = (await api.listEngagementContacts({}, { take: TAKE })) as ContactRef[]
  for (const call of unique) {
    try {
      if (call.seller_id) {
        const recipient = planSellerRecipient({
          seller: (sellers.find((seller) => seller.id === call.seller_id) as SellerRef | undefined) ?? null,
          organizations,
          contacts,
        })
        if (!recipient.ok) {
          log(recipient.reason)
          continue
        }
        for (const contactId of recipient.contact_ids) {
          await api.enrollContact({
            contact_id: contactId,
            program_id: call.program_id,
            sequence_id: call.sequence_id,
            sequence_step_id: call.sequence_step_id,
            trigger_key: call.trigger_key,
            entry_source: call.entry_source,
            next_step_at: call.next_step_at ?? now,
          })
        }
        continue
      }
      if (!api.enrollRecipient) continue
      await api.enrollRecipient({
        consumer_id: call.consumer_id,
        affiliate_id: call.affiliate_id,
        program_id: call.program_id,
        sequence_id: call.sequence_id,
        sequence_step_id: call.sequence_step_id,
        trigger_key: call.trigger_key,
        entry_source: call.entry_source,
        next_step_at: call.next_step_at,
      })
    } catch (err) {
      log(
        `Start ${call.entry_source} overgeslagen: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}

export function scheduledRecipients(snapshot: AutomationSnapshot): ScheduledRecipient[] {
  return [
    ...snapshot.sellers.map((seller) => ({
      audience: "sellers" as const,
      seller_id: seller.id,
    })),
    ...snapshot.consumers
      .filter((consumer) => consumer.newsletter_enabled)
      .map((consumer) => ({
        audience: "consumers" as const,
        consumer_id: consumer.id,
      })),
    ...snapshot.affiliates
      .filter((affiliate) => affiliate.onboarding_status === "Goedgekeurd")
      .map((affiliate) => ({
        audience: "affiliates" as const,
        affiliate_id: affiliate.id,
      })),
  ]
}

export async function loadSnapshot(
  container: MedusaContainer,
  log: (message: string) => void,
  now: Date
): Promise<AutomationSnapshot> {
  const snapshot: AutomationSnapshot = {
    now,
    sellers: await listSellers(container, log),
    versions: [],
    origins: [],
    orders: [],
    consumers: [],
    brands: [],
    affiliates: [],
    conversions: [],
    shipments: [],
    products: [],
    product_categories: [],
    prices: [],
    affiliate_links: [],
    organizations: [],
    contacts: [],
    suppressions: [],
  }
  try {
    const productCloud = container.resolve(PRODUCT_CLOUD_MODULE) as unknown as Record<string, ListFn>
    snapshot.versions = (await productCloud.listProductVersions({}, { take: TAKE })) as AutomationSnapshot["versions"]
    snapshot.versions = await withCompleteness(productCloud, snapshot.versions, log)
  } catch (err) {
    log(`Product-startmomenten niet gelezen: ${err instanceof Error ? err.message : String(err)}`)
  }
  try {
    const verification = container.resolve(VERIFICATION_MODULE) as { listProductOrigins: ListFn }
    snapshot.origins = (await verification.listProductOrigins({}, { take: TAKE })) as AutomationSnapshot["origins"]
  } catch (err) {
    log(`Verificatie niet gelezen: ${err instanceof Error ? err.message : String(err)}`)
  }
  try {
    const orders = container.resolve(ORDER_MODULE) as { listEmOrders: ListFn }
    snapshot.orders = (await orders.listEmOrders({}, { take: TAKE })) as AutomationSnapshot["orders"]
  } catch (err) {
    log(`Bestellingen niet gelezen: ${err instanceof Error ? err.message : String(err)}`)
  }
  try {
    const engagement = container.resolve(ENGAGEMENT_MODULE) as { listEngagementConsumers: ListFn }
    snapshot.consumers = (await engagement.listEngagementConsumers({}, { take: TAKE })) as AutomationSnapshot["consumers"]
    const engagementLists = container.resolve(ENGAGEMENT_MODULE) as {
      listEngagementOrganizations: ListFn
      listEngagementContacts: ListFn
      listEngagementSuppressions: ListFn
    }
    snapshot.organizations = (await engagementLists.listEngagementOrganizations({}, { take: TAKE })) as AutomationSnapshot["organizations"]
    snapshot.contacts = (await engagementLists.listEngagementContacts({}, { take: TAKE })) as AutomationSnapshot["contacts"]
    snapshot.suppressions = (await engagementLists.listEngagementSuppressions(
      { active: true },
      { take: TAKE }
    )) as AutomationSnapshot["suppressions"]
  } catch (err) {
    log(`Consumenten niet gelezen: ${err instanceof Error ? err.message : String(err)}`)
  }
  try {
    const partner = container.resolve(PARTNER_MODULE) as { listBrands: ListFn }
    snapshot.brands = (await partner.listBrands({}, { take: TAKE })) as AutomationSnapshot["brands"]
  } catch (err) {
    log(`Merken niet gelezen: ${err instanceof Error ? err.message : String(err)}`)
  }
  try {
    const affiliate = container.resolve(AFFILIATE_MODULE) as {
      listAffiliates: ListFn
      listConversions: ListFn
      listAffiliateLinks: ListFn
    }
    snapshot.affiliates = (await affiliate.listAffiliates({}, { take: TAKE })) as AutomationSnapshot["affiliates"]
    snapshot.conversions = (await affiliate.listConversions({}, { take: TAKE })) as AutomationSnapshot["conversions"]
    snapshot.affiliate_links = (await affiliate.listAffiliateLinks({}, { take: TAKE })) as AutomationSnapshot["affiliate_links"]
  } catch (err) {
    log(`Affiliates niet gelezen: ${err instanceof Error ? err.message : String(err)}`)
  }
  try {
    const orders = container.resolve(ORDER_MODULE) as { listShipments: ListFn }
    snapshot.shipments = (await orders.listShipments({}, { take: TAKE })) as AutomationSnapshot["shipments"]
  } catch (err) {
    log(`Zendingen niet gelezen: ${err instanceof Error ? err.message : String(err)}`)
  }
  try {
    const productCloud = container.resolve(PRODUCT_CLOUD_MODULE) as unknown as Record<string, ListFn>
    snapshot.products = (await productCloud.listProducts({}, { take: TAKE })) as AutomationSnapshot["products"]
    snapshot.product_categories = (await productCloud.listProductCategories(
      {},
      { take: TAKE }
    )) as AutomationSnapshot["product_categories"]
  } catch (err) {
    log(`Categorieën niet gelezen: ${err instanceof Error ? err.message : String(err)}`)
  }
  try {
    const commerce = container.resolve(COMMERCE_CLOUD_MODULE) as { listOfferPrices: ListFn }
    snapshot.prices = (await commerce.listOfferPrices({}, { take: TAKE })) as AutomationSnapshot["prices"]
  } catch (err) {
    log(`Aanbiedingen niet gelezen: ${err instanceof Error ? err.message : String(err)}`)
  }
  return snapshot
}

async function listSellers(container: MedusaContainer, log: (message: string) => void) {
  try {
    const partner = container.resolve(PARTNER_MODULE) as { listSellers: ListFn }
    return (await partner.listSellers({}, { take: TAKE })) as AutomationSnapshot["sellers"]
  } catch (err) {
    log(`Sellers niet gelezen: ${err instanceof Error ? err.message : String(err)}`)
    return []
  }
}

async function withCompleteness(
  productCloud: Record<string, ListFn>,
  versions: AutomationSnapshot["versions"],
  log: (message: string) => void
) {
  try {
    const products = (await productCloud.listProducts({}, { take: TAKE })) as {
      id: string
      brand_id: string | null
      manufacturer_id: string | null
    }[]
    const categories = (await productCloud.listProductCategories({}, { take: TAKE })) as {
      product_id: string
      category_id: string
    }[]
    const categoryRows = (await productCloud.listCategories({}, { take: TAKE })) as {
      id: string
      name: string
    }[]
    const definitions = (await productCloud.listAttributeDefinitions({}, { take: TAKE })) as {
      id: string
      category_id: string
      name: string
      code: string | null
      requirement_tier: AttributeInput["tier"]
    }[]
    const values = (await productCloud.listAttributeValues({}, { take: TAKE })) as {
      product_version_id: string
      attribute_definition_id: string
      value: string | null
    }[]
    const media = (await productCloud.listProductMedias({}, { take: TAKE })) as {
      product_version_id: string
      media_type: string
    }[]
    const variants = (await productCloud.listProductVariants({}, { take: TAKE })) as {
      id: string
      product_id: string
    }[]
    const identifiers = (await productCloud.listIdentifiers({}, { take: TAKE })) as {
      product_variant_id: string
      identifier_type: string
      identifier_value: string
    }[]
    const categoryName = new Map(categoryRows.map((row) => [row.id, row.name]))
    return versions.map((version) => {
      const productId = version.product_id
      const product = products.find((row) => row.id === productId)
      const categoryIds = categories
        .filter((row) => row.product_id === productId)
        .map((row) => row.category_id)
      const variantIds = new Set(
        variants.filter((row) => row.product_id === productId).map((row) => row.id)
      )
      const identifier = identifiers.find(
        (row) => variantIds.has(row.product_variant_id) && row.identifier_type === "GTIN"
      )
      const attributes = definitions
        .filter((definition) => categoryIds.includes(definition.category_id))
        .map((definition) => ({
          code: definition.code || definition.id,
          name: definition.name,
          tier: definition.requirement_tier,
          value:
            values.find(
              (value) =>
                value.product_version_id === version.id &&
                value.attribute_definition_id === definition.id
            )?.value ?? null,
        }))
      const report = computeProductCompleteness({
        basis: {
          title: version.title ?? null,
          brand_id: product?.brand_id,
          manufacturer_id: product?.manufacturer_id,
          category_names: categoryIds.map((id) => categoryName.get(id) || id),
          identifier_value: identifier?.identifier_value ?? null,
          has_primary_image: media.some(
            (row) => row.product_version_id === version.id && row.media_type === "Hoofdafbeelding"
          ),
        },
        attributes,
      })
      return { ...version, information_quality: report.information_quality }
    })
  } catch (err) {
    log(`Completeness niet berekend: ${err instanceof Error ? err.message : String(err)}`)
    return versions
  }
}
