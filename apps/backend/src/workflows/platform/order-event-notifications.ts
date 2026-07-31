import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../modules/partner"
import type PartnerModuleService from "../../modules/partner/service"
import { ORDER_MODULE } from "../../modules/order-service"
import type OrderServiceModuleService from "../../modules/order-service/service"
import { executeDispatchNotification } from "./dispatch-notification"

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim()
  return null
}

async function sellerCustomerId(
  container: MedusaContainer,
  sellerId: string | null
): Promise<string | null> {
  if (!sellerId) return null
  const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
  const sellers = await partner.listSellers({ id: sellerId }, { take: 1 })
  return sellers[0]?.customer_id ?? null
}

async function orderCustomerAndSeller(
  container: MedusaContainer,
  orderId: string
): Promise<{ customer_id: string; seller_id: string } | null> {
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  try {
    const order = await orders.retrieveEmOrder(orderId)
    return { customer_id: order.customer_id, seller_id: order.seller_id }
  } catch {
    return null
  }
}

type NotifyTarget = {
  recipient_customer_id: string
  notification_type: string
  source_entity_type: string
  source_entity_id: string
  data?: Record<string, unknown>
}

/**
 * Bepaalt welke betrokkene(n) een Order-/Message-/Return-event moeten zien.
 */
export async function resolveOrderNotificationTargets(
  container: MedusaContainer,
  eventName: string,
  data: Record<string, unknown>
): Promise<NotifyTarget[]> {
  const targets: NotifyTarget[] = []

  const push = (
    recipient: string | null,
    notification_type: string,
    source_entity_type: string,
    source_entity_id: string | null
  ) => {
    if (!recipient || !source_entity_id) return
    targets.push({
      recipient_customer_id: recipient,
      notification_type,
      source_entity_type,
      source_entity_id,
      data: { event: eventName, ...data },
    })
  }

  switch (eventName) {
    case "OrderPlaced": {
      push(
        asString(data.customer_id),
        "OrderPlaced",
        "order_set",
        asString(data.order_set_id)
      )
      break
    }
    case "OrderSplit": {
      const sellerCid = await sellerCustomerId(
        container,
        asString(data.seller_id)
      )
      push(sellerCid, "OrderSplit", "em_order", asString(data.order_id))
      break
    }
    case "OrderSplitFailed": {
      let customerId = asString(data.customer_id)
      if (!customerId && asString(data.order_set_id)) {
        const orders = container.resolve(
          ORDER_MODULE
        ) as OrderServiceModuleService
        try {
          const set = await orders.retrieveOrderSet(asString(data.order_set_id)!)
          customerId = set.customer_id
        } catch {
          customerId = null
        }
      }
      push(
        customerId,
        "OrderSplitFailed",
        "order_set",
        asString(data.order_set_id)
      )
      break
    }
    case "OrderExceptionResolved": {
      const orderId = asString(data.order_id)
      if (!orderId) break
      const ctx = await orderCustomerAndSeller(container, orderId)
      if (!ctx) break
      push(ctx.customer_id, "OrderExceptionResolved", "em_order", orderId)
      push(
        await sellerCustomerId(container, ctx.seller_id),
        "OrderExceptionResolved",
        "em_order",
        orderId
      )
      break
    }
    case "MessageSent": {
      const sender = asString(data.sender_customer_id)
      const buyer = asString(data.customer_id)
      const sellerCid = await sellerCustomerId(
        container,
        asString(data.seller_id)
      )
      const counterpart =
        sender && buyer && sender === buyer ? sellerCid : buyer
      push(
        counterpart,
        "MessageSent",
        "order_message",
        asString(data.message_id)
      )
      break
    }
    case "ReturnRequested": {
      push(
        await sellerCustomerId(container, asString(data.seller_id)),
        "ReturnRequested",
        "em_return",
        asString(data.return_id)
      )
      break
    }
    case "ReturnStatusChanged": {
      // Initiële Aangevraagd wordt al door ReturnRequested gemeld.
      if (asString(data.from_status) === null) break
      const toStatus = asString(data.to_status)
      const returnId = asString(data.return_id)
      const buyer = asString(data.customer_id)
      const sellerCid = await sellerCustomerId(
        container,
        asString(data.seller_id)
      )
      if (toStatus === "Geëscaleerd") {
        push(sellerCid, "ReturnStatusChanged", "em_return", returnId)
        push(buyer, "ReturnStatusChanged", "em_return", returnId)
      } else {
        // Seller-acties → koper; overige → seller als vangnet
        push(buyer, "ReturnStatusChanged", "em_return", returnId)
      }
      break
    }
    case "RefundExecuted": {
      push(
        asString(data.customer_id),
        "RefundExecuted",
        "em_return",
        asString(data.return_id)
      )
      break
    }
    default:
      break
  }

  // Dedup per ontvanger+type+bron
  const seen = new Set<string>()
  return targets.filter((t) => {
    const key = `${t.recipient_customer_id}|${t.notification_type}|${t.source_entity_id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function executeNotifyForOrderEvent(
  container: MedusaContainer,
  eventName: string,
  data: Record<string, unknown>
): Promise<number> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const targets = await resolveOrderNotificationTargets(
    container,
    eventName,
    data
  )
  let count = 0
  for (const target of targets) {
    try {
      await executeDispatchNotification(container, target)
      count += 1
    } catch (err) {
      logger.error(
        `[notification] dispatch failed type=${target.notification_type} recipient=${target.recipient_customer_id}: ${String(err)}`
      )
    }
  }
  return count
}
