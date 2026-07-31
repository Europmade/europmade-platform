import type { MedusaContainer } from "@medusajs/framework/types"
import { AUDIT_MODULE } from "../../modules/audit"
import type AuditModuleService from "../../modules/audit/service"
import type { AppendAuditLogInput } from "../../modules/audit/service"

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim()
  return null
}

/**
 * Map domeinevent → audit_log-rij (F.2 / eventmodel §13).
 */
export function mapDomainEventToAudit(
  eventName: string,
  data: Record<string, unknown>
): AppendAuditLogInput | null {
  switch (eventName) {
    case "OrderPlaced":
      return {
        actor_customer_id: asString(data.customer_id),
        entity_type: "order_set",
        entity_id: asString(data.order_set_id) ?? "",
        action_type: eventName,
        reason: null,
      }
    case "OrderSplit":
      return {
        actor_customer_id: asString(data.customer_id),
        entity_type: "em_order",
        entity_id: asString(data.order_id) ?? "",
        action_type: eventName,
        reason: null,
      }
    case "OrderSplitFailed":
      return {
        actor_customer_id: asString(data.customer_id),
        entity_type: "order_set",
        entity_id: asString(data.order_set_id) ?? "",
        action_type: eventName,
        reason: asString(data.reason),
      }
    case "OrderExceptionResolved":
      return {
        actor_customer_id: asString(data.actor_customer_id),
        entity_type: "em_order",
        entity_id: asString(data.order_id) ?? "",
        action_type: eventName,
        reason: asString(data.reason),
      }
    case "MessageSent":
      return {
        actor_customer_id: asString(data.sender_customer_id),
        entity_type: "order_message",
        entity_id: asString(data.message_id) ?? "",
        action_type: eventName,
        reason: null,
      }
    case "ReturnRequested":
      return {
        actor_customer_id: asString(data.customer_id),
        entity_type: "em_return",
        entity_id: asString(data.return_id) ?? "",
        action_type: eventName,
        reason: asString(data.reason),
      }
    case "ReturnStatusChanged":
      return {
        actor_customer_id: asString(data.actor_customer_id) ?? asString(data.customer_id),
        entity_type: "em_return",
        entity_id: asString(data.return_id) ?? "",
        action_type: eventName,
        reason:
          asString(data.decision_reason) ??
          asString(data.reason) ??
          (asString(data.from_status) && asString(data.to_status)
            ? `${asString(data.from_status)}→${asString(data.to_status)}`
            : null),
      }
    case "RefundExecuted":
      return {
        actor_customer_id: asString(data.customer_id),
        entity_type: "em_return",
        entity_id: asString(data.return_id) ?? "",
        action_type: eventName,
        reason: asString(data.refund_reference),
      }
    case "NotificationDispatched":
      return {
        actor_customer_id: asString(data.recipient_customer_id),
        entity_type: "in_app_notification",
        entity_id: asString(data.feed_id) ?? "",
        action_type: eventName,
        reason: asString(data.notification_type),
      }
    case "SellerOnboarded":
      return {
        actor_customer_id: null,
        entity_type: "seller",
        entity_id: asString(data.seller_id) ?? "",
        action_type: eventName,
        reason: null,
      }
    case "BuyBoxRecomputed":
      return {
        actor_customer_id: null,
        entity_type: "buy_box_computation",
        entity_id:
          asString(data.buy_box_computation_id) ??
          `${asString(data.identifier_id) ?? "unknown"}:${asString(data.region_code) ?? "*"}`,
        action_type: eventName,
        reason: asString(data.winning_offer_id),
      }
    case "ReviewSubmitted":
      return {
        actor_customer_id: asString(data.customer_id),
        entity_type: "review",
        entity_id: asString(data.review_id) ?? "",
        action_type: eventName,
        reason: asString(data.review_type),
      }
    case "ReviewAggregateChanged":
      return {
        actor_customer_id: null,
        entity_type: "seller",
        entity_id: asString(data.seller_id) ?? "",
        action_type: eventName,
        reason:
          asString(data.average_score) ??
          (typeof data.average_score === "number"
            ? String(data.average_score)
            : null),
      }
    default:
      return {
        actor_customer_id:
          asString(data.actor_customer_id) ??
          asString(data.customer_id) ??
          asString(data.sender_customer_id),
        entity_type: asString(data.entity_type) ?? "unknown",
        entity_id:
          asString(data.entity_id) ??
          asString(data.id) ??
          asString(data.order_id) ??
          asString(data.return_id) ??
          "unknown",
        action_type: eventName,
        reason: asString(data.reason),
      }
  }
}

export async function executeAppendAuditFromEvent(
  container: MedusaContainer,
  eventName: string,
  data: Record<string, unknown>
): Promise<{ id: string } | null> {
  const mapped = mapDomainEventToAudit(eventName, data)
  if (!mapped || !mapped.entity_id) {
    return null
  }
  const audit = container.resolve(AUDIT_MODULE) as AuditModuleService
  const row = await audit.append(mapped)
  return { id: row.id }
}
