import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { AFFILIATE_MODULE } from "../modules/affiliate"
import { dispatchAutomation } from "../modules/engagement/automation-run"
import { inspectQueuedMarketingDeliveries } from "../modules/engagement/delivery-run"
import { marketingPreferenceAllows } from "../modules/engagement/campaign-selection"
import { marketingPreferenceKey } from "../modules/engagement/preference-audit"
import { ENGAGEMENT_MODULE } from "../modules/engagement"
import {
  processDueEnrollments,
  type OrchestratorApi,
} from "../modules/engagement/orchestrator-run"
import type { DueEnrollmentState } from "../modules/engagement/orchestrator-rules"
import { ORDER_MODULE } from "../modules/order-service"
import { PARTNER_MODULE } from "../modules/partner"

/**
 * Eén Medusa-cron voor startmomenten, geplande campagnes en due enrollments.
 * Daarna een dry-run over queued history. Geen provider en geen verzending.
 */
const TAKE = 500

type ListFn = (filters: object, config?: { take?: number }) => Promise<unknown[]>

export default async function engagementMilestoneJob(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    await dispatchAutomation(container)
    const engagement = container.resolve(ENGAGEMENT_MODULE) as OrchestratorApi & {
      listEngagementOrganizations: ListFn
      listEngagementContacts: ListFn
      listEngagementConsumers: ListFn
      listEngagementLifecyclePrograms: ListFn
    }
    const organizations = (await engagement.listEngagementOrganizations({}, { take: TAKE })) as {
      id: string
      converted_seller_id: string | null
    }[]
    const contacts = (await engagement.listEngagementContacts({}, { take: TAKE })) as {
      id: string
      organization_id: string
      email?: string | null
    }[]
    const consumers = (await engagement.listEngagementConsumers({}, { take: TAKE }).catch(() => [])) as Array<{
      id: string
      customer_id?: string | null
      email?: string | null
      locale?: string | null
    }>
    const ordersByCustomer = new Map<string, string[]>()
    let ordersReadable = true
    try {
      const orders = container.resolve(ORDER_MODULE) as { listEmOrders: ListFn }
      const rows = (await orders.listEmOrders({}, { take: TAKE })) as Array<{
        customer_id?: string | null
        created_at?: string | null
      }>
      for (const row of rows) {
        const customerId = row.customer_id?.trim()
        if (!customerId || !row.created_at) continue
        const list = ordersByCustomer.get(customerId) ?? []
        list.push(row.created_at)
        ordersByCustomer.set(customerId, list)
      }
    } catch {
      ordersReadable = false
      ordersByCustomer.clear()
    }
    const customerByConsumer = new Map(
      consumers.flatMap((row) => {
        const customerId = row.customer_id?.trim()
        return customerId ? [[row.id, customerId] as const] : []
      })
    )
    const api = Object.create(engagement) as OrchestratorApi
    api.listConsumerOrderTimes = async (consumerId: string) => {
      if (!ordersReadable) throw new Error("Bestellingen zijn niet gelezen.")
      const customerId = customerByConsumer.get(consumerId)
      if (!customerId) return []
      return (ordersByCustomer.get(customerId) ?? []).map((created_at) => ({ created_at }))
    }
    const consumerLocale = new Map(
      consumers
        .filter((row) => row.email)
        .map((row) => [row.email!.trim().toLowerCase(), row.locale ?? null])
    )
    const consumerById = new Map(consumers.map((row) => [row.id, row.locale ?? null]))
    let sellers: {
      id: string
      locale?: string | null
      communication_preferences?: Record<string, boolean> | null
    }[] = []
    try {
      const partner = container.resolve(PARTNER_MODULE) as { listSellers: ListFn }
      sellers = (await partner.listSellers({}, { take: TAKE })) as {
        id: string
        locale?: string | null
        communication_preferences?: Record<string, boolean> | null
      }[]
    } catch {
      sellers = []
    }
    const affiliatePrefs = new Map<string, Record<string, boolean> | null>()
    try {
      const affiliate = container.resolve(AFFILIATE_MODULE) as { listAffiliates: ListFn }
      const rows = (await affiliate.listAffiliates({}, { take: TAKE })) as {
        id: string
        communication_preferences?: Record<string, boolean> | null
      }[]
      for (const row of rows) affiliatePrefs.set(row.id, row.communication_preferences ?? null)
    } catch {
      affiliatePrefs.clear()
    }
    await processDueEnrollments(
      api,
      new Date(),
      (message) => logger.info(`[engagement] ${message}`),
      async (contactId, enrollment) => {
        if (enrollment?.consumer_id && consumerById.has(enrollment.consumer_id)) {
          return consumerById.get(enrollment.consumer_id) ?? null
        }
        const contact = contacts.find((item) => item.id === contactId)
        const email = contact?.email?.trim().toLowerCase()
        if (email && consumerLocale.get(email)) return consumerLocale.get(email) ?? null
        const organization = organizations.find((item) => item.id === contact?.organization_id)
        const seller = sellers.find((item) => item.id === organization?.converted_seller_id)
        return seller?.locale?.trim() || null
      },
      async (enrollment: DueEnrollmentState) => {
        if (enrollment.program_type !== "newsletter" && enrollment.program_type !== "campaign") {
          return true
        }
        const programs = (await engagement.listEngagementLifecyclePrograms(
          { id: enrollment.program_id },
          { take: 1 }
        )) as Array<{ start_trigger?: string | null; program_type?: string | null }>
        const trigger = programs[0]?.start_trigger ?? null
        if (enrollment.affiliate_id) {
          return marketingPreferenceAllows(
            "affiliates",
            affiliatePrefs.get(enrollment.affiliate_id),
            marketingPreferenceKey("affiliates", enrollment.program_type, trigger)
          )
        }
        if (enrollment.contact_id) {
          const contact = contacts.find((item) => item.id === enrollment.contact_id)
          const organization = organizations.find((item) => item.id === contact?.organization_id)
          const seller = sellers.find((item) => item.id === organization?.converted_seller_id)
          if (!seller) return false
          return marketingPreferenceAllows(
            "sellers",
            seller.communication_preferences,
            marketingPreferenceKey("sellers", enrollment.program_type, trigger)
          )
        }
        return true
      }
    )
    try {
      const dryRun = await inspectQueuedMarketingDeliveries(container)
      if (dryRun.considered > 0) {
        logger.info(
          `[engagement] dry-run: ${dryRun.wouldDeliver} bericht(en) zouden worden afgeleverd, ${dryRun.skipped} overgeslagen. Niets verzonden.`
        )
      }
    } catch (err) {
      logger.warn(
        `[engagement] dry-run niet uitgevoerd: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  } catch (err) {
    logger.error(
      `[engagement] milestone-job gestopt: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export const config = {
  name: "engagement-milestone-scan",
  schedule: "*/15 * * * *",
}
