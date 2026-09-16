import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  RETURN_PERIOD_DAYS,
  computeReturnPeriod,
  buildTrackingUrl,
} from "@europmade/utils"
import { ORDER_MODULE } from "../../modules/order-service"
import type OrderServiceModuleService from "../../modules/order-service/service"
import {
  getRefundService,
  toStoredRefundStatus,
} from "../../modules/order-service/refund-service"

/** EuropMade marketplace return window — ADR-0040. */
export const RETURN_COOLING_OFF_DAYS = RETURN_PERIOD_DAYS

export type ReturnStatus =
  | "Aangevraagd"
  | "Bevestigd"
  | "Onderweg"
  | "Ontvangen"
  | "Verwerkt"
  | "Afgewezen"
  | "Geëscaleerd"

export type RefundStatus =
  | "requested"
  | "processing"
  | "processed"
  | "failed"
  | "forced"

const OPEN_STATUSES: ReturnStatus[] = [
  "Aangevraagd",
  "Bevestigd",
  "Onderweg",
  "Ontvangen",
  "Geëscaleerd",
]

type ReturnEventName =
  | "ReturnRequested"
  | "ReturnStatusChanged"
  | "RefundExecuted"

async function emitReturnEvent(
  container: MedusaContainer,
  name: ReturnEventName,
  data: Record<string, unknown>
) {
  const eventBus = container.resolve(Modules.EVENT_BUS)
  await eventBus.emit({ name, data })
}

export function toMoneyNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return roundMoney(value)
  if (typeof value === "string" && value.trim() !== "") {
    return roundMoney(Number(value))
  }
  if (value && typeof value === "object") {
    if ("numeric" in value && typeof (value as { numeric: unknown }).numeric === "string") {
      return roundMoney(Number((value as { numeric: string }).numeric))
    }
    if (
      "value" in value &&
      typeof (value as { value: unknown }).value === "string"
    ) {
      return roundMoney(Number((value as { value: string }).value))
    }
  }
  const n = Number(value)
  if (!Number.isFinite(n)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Kon bedrag niet als getal lezen."
    )
  }
  return roundMoney(n)
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function coolingOffEndsAt(deliveredAt: Date | string): Date {
  const period = computeReturnPeriod({ deliveredAt })
  if (!period.deadline_at) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Retourtermijn start pas na aflevering."
    )
  }
  return new Date(period.deadline_at)
}

export function assertWithinCoolingOff(
  deliveredAt: Date | string | null | undefined,
  now: Date = new Date()
) {
  const period = computeReturnPeriod({
    deliveredAt: deliveredAt ?? null,
    now,
  })
  if (!period.delivered_at) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Retour is pas mogelijk nadat de order is afgeleverd."
    )
  }
  if (!period.is_open) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Retourtermijn van ${RETURN_COOLING_OFF_DAYS} dagen is verstreken.`
    )
  }
}

async function latestDeliveredAt(
  orders: OrderServiceModuleService,
  orderId: string
): Promise<Date | string | null> {
  const shipments = await orders.listShipments({ order_id: orderId })
  const delivered = shipments
    .filter((s) => s.delivered_at)
    .sort(
      (a, b) =>
        new Date(b.delivered_at as Date).getTime() -
        new Date(a.delivered_at as Date).getTime()
    )
  return delivered[0]?.delivered_at ?? null
}

async function loadReturnContext(
  orders: OrderServiceModuleService,
  returnId: string
) {
  const ret = await orders.retrieveEmReturn(returnId)
  const line = await orders.retrieveOrderLine(ret.order_line_id)
  const order = await orders.retrieveEmOrder(line.order_id)
  return { ret, line, order }
}

export type RequestReturnInput = {
  customer_id: string
  order_line_id: string
  reason: string
}

export async function executeRequestReturn(
  container: MedusaContainer,
  input: RequestReturnInput
) {
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const line = await orders.retrieveOrderLine(input.order_line_id)
  const order = await orders.retrieveEmOrder(line.order_id)

  if (order.customer_id !== input.customer_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Je mag alleen retouren aanmelden op je eigen orders."
    )
  }
  if (order.payment_status !== "Betaald") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Retour alleen mogelijk voor betaalde orders."
    )
  }

  const deliveredAt = await latestDeliveredAt(orders, order.id)
  assertWithinCoolingOff(deliveredAt)

  const existing = await orders.listEmReturns({
    order_line_id: line.id,
  })
  const open = existing.find((r) =>
    OPEN_STATUSES.includes(r.status as ReturnStatus)
  )
  if (open) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Er loopt al een open retour voor deze orderregel."
    )
  }

  const refund_amount = roundMoney(
    toMoneyNumber(line.unit_price_snapshot) * line.quantity
  )
  const created = await orders.createEmReturns({
    order_line_id: line.id,
    reason: input.reason.trim(),
    status: "Aangevraagd",
    seller_decision_reason: null,
    force_reason: null,
    force_admin_user_id: null,
    cooling_off_ends_at: coolingOffEndsAt(deliveredAt!),
    refund_amount,
    refund_status: "requested",
    refund_reference: null,
    refund_executed_at: null,
    carrier: null,
    tracking_code: null,
    tracking_url: null,
  })

  await emitReturnEvent(container, "ReturnRequested", {
    return_id: created.id,
    order_id: order.id,
    order_line_id: line.id,
    seller_id: order.seller_id,
    customer_id: order.customer_id,
    status: created.status,
  })
  await emitReturnEvent(container, "ReturnStatusChanged", {
    return_id: created.id,
    from_status: null,
    to_status: "Aangevraagd",
    order_id: order.id,
    seller_id: order.seller_id,
    customer_id: order.customer_id,
  })

  return { return: created, order_id: order.id, seller_id: order.seller_id }
}

export type SellerTransitionInput = {
  return_id: string
  seller_id: string
  action: "confirm" | "receive" | "approve" | "reject"
  decision_reason?: string
}

async function executeSimulatedRefund(
  container: MedusaContainer,
  orders: OrderServiceModuleService,
  returnId: string,
  opts: {
    forced: boolean
    force_reason?: string
    force_admin_user_id?: string
    from_status: ReturnStatus
  }
) {
  const { ret, line, order } = await loadReturnContext(orders, returnId)
  const amount =
    ret.refund_amount != null
      ? toMoneyNumber(ret.refund_amount)
      : roundMoney(toMoneyNumber(line.unit_price_snapshot) * line.quantity)

  await orders.updateEmReturns({
    id: ret.id,
    refund_status: "processing",
  })

  const refundService = getRefundService()
  const result = await refundService.executeRefund({
    return_id: ret.id,
    amount,
    forced: opts.forced,
  })

  if (result.status === "failed") {
    await orders.updateEmReturns({
      id: ret.id,
      refund_status: "failed",
      refund_reference: result.reference,
    })
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Refund kon niet worden verwerkt."
    )
  }

  const refund_status = toStoredRefundStatus(result.status)
  const updated = await orders.updateEmReturns({
    id: ret.id,
    status: "Verwerkt",
    refund_amount: amount,
    refund_status,
    refund_reference: result.reference,
    refund_executed_at: new Date(result.executed_at),
    force_reason: opts.forced ? (opts.force_reason ?? null) : ret.force_reason,
    force_admin_user_id: opts.forced
      ? (opts.force_admin_user_id ?? null)
      : ret.force_admin_user_id,
  })

  await emitReturnEvent(container, "ReturnStatusChanged", {
    return_id: ret.id,
    from_status: opts.from_status,
    to_status: "Verwerkt",
    order_id: order.id,
    seller_id: order.seller_id,
    customer_id: order.customer_id,
    forced: opts.forced,
  })
  await emitReturnEvent(container, "RefundExecuted", {
    return_id: ret.id,
    order_id: order.id,
    order_line_id: line.id,
    seller_id: order.seller_id,
    customer_id: order.customer_id,
    refund_amount: amount,
    refund_status,
    refund_reference: result.reference,
    forced: opts.forced,
    provider: result.provider,
  })

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info(
    `[return] refund ${result.reference} amount=${amount} status=${refund_status} provider=${result.provider}`
  )

  return { return: Array.isArray(updated) ? updated[0] : updated }
}

export async function executeSellerReturnTransition(
  container: MedusaContainer,
  input: SellerTransitionInput
) {
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const { ret, order } = await loadReturnContext(orders, input.return_id)

  if (order.seller_id !== input.seller_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Deze retour hoort bij een andere seller."
    )
  }

  const current = ret.status as ReturnStatus

  if (input.action === "confirm") {
    if (current !== "Aangevraagd") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Alleen status Aangevraagd kan worden bevestigd."
      )
    }
    const updated = await orders.updateEmReturns({
      id: ret.id,
      status: "Bevestigd",
    })
    await emitReturnEvent(container, "ReturnStatusChanged", {
      return_id: ret.id,
      from_status: current,
      to_status: "Bevestigd",
      order_id: order.id,
      seller_id: order.seller_id,
      customer_id: order.customer_id,
    })
    return { return: Array.isArray(updated) ? updated[0] : updated }
  }

  if (input.action === "receive") {
    if (current !== "Bevestigd" && current !== "Onderweg") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Alleen status Bevestigd of Onderweg kan als Ontvangen worden gemarkeerd."
      )
    }
    const updated = await orders.updateEmReturns({
      id: ret.id,
      status: "Ontvangen",
    })
    await emitReturnEvent(container, "ReturnStatusChanged", {
      return_id: ret.id,
      from_status: current,
      to_status: "Ontvangen",
      order_id: order.id,
      seller_id: order.seller_id,
      customer_id: order.customer_id,
    })
    return { return: Array.isArray(updated) ? updated[0] : updated }
  }

  if (input.action === "approve") {
    if (current !== "Ontvangen") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Refund vereist status Ontvangen (Seller-bevestiging van ontvangst)."
      )
    }
    return await executeSimulatedRefund(container, orders, ret.id, {
      forced: false,
      from_status: current,
    })
  }

  if (input.action === "reject") {
    const reason = input.decision_reason?.trim()
    if (!reason || reason.length < 3) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Afwijzing vereist een reden (min. 3 tekens)."
      )
    }
    if (!["Aangevraagd", "Bevestigd", "Onderweg", "Ontvangen"].includes(current)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Deze retour kan niet meer worden afgewezen."
      )
    }
    const updated = await orders.updateEmReturns({
      id: ret.id,
      status: "Afgewezen",
      seller_decision_reason: reason,
      refund_status: null,
    })
    await emitReturnEvent(container, "ReturnStatusChanged", {
      return_id: ret.id,
      from_status: current,
      to_status: "Afgewezen",
      order_id: order.id,
      seller_id: order.seller_id,
      customer_id: order.customer_id,
      decision_reason: reason,
    })
    return { return: Array.isArray(updated) ? updated[0] : updated }
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Onbekende seller-actie: ${input.action}`
  )
}

export type EscalateReturnInput = {
  customer_id: string
  return_id: string
}

export async function executeEscalateReturn(
  container: MedusaContainer,
  input: EscalateReturnInput
) {
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const { ret, order } = await loadReturnContext(orders, input.return_id)
  if (order.customer_id !== input.customer_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Je mag alleen eigen retouren escaleren."
    )
  }
  if (ret.status !== "Afgewezen") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Alleen afgewezen retouren kunnen worden geëscaleerd."
    )
  }
  const updated = await orders.updateEmReturns({
    id: ret.id,
    status: "Geëscaleerd",
  })
  await emitReturnEvent(container, "ReturnStatusChanged", {
    return_id: ret.id,
    from_status: "Afgewezen",
    to_status: "Geëscaleerd",
    order_id: order.id,
    seller_id: order.seller_id,
    customer_id: order.customer_id,
  })
  return { return: Array.isArray(updated) ? updated[0] : updated }
}

export type ForceRefundInput = {
  return_id: string
  admin_user_id: string
  force_reason: string
}

export async function executeForceRefund(
  container: MedusaContainer,
  input: ForceRefundInput
) {
  const reason = input.force_reason.trim()
  if (reason.length < 3) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "force_reason is verplicht (min. 3 tekens)."
    )
  }
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const { ret } = await loadReturnContext(orders, input.return_id)
  const current = ret.status as ReturnStatus
  if (current === "Verwerkt") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Deze retour is al verwerkt."
    )
  }
  return await executeSimulatedRefund(container, orders, ret.id, {
    forced: true,
    force_reason: reason,
    force_admin_user_id: input.admin_user_id,
    from_status: current,
  })
}

export type SellerCreateReturnInput = {
  seller_id: string
  order_line_id: string
  reason: string
}

/** Seller initiates a return on behalf of / for an order line they own. */
export async function executeSellerCreateReturn(
  container: MedusaContainer,
  input: SellerCreateReturnInput
) {
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const line = await orders.retrieveOrderLine(input.order_line_id)
  const order = await orders.retrieveEmOrder(line.order_id)

  if (order.seller_id !== input.seller_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Retour alleen op eigen orders."
    )
  }
  if (order.payment_status !== "Betaald") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Retour alleen mogelijk voor betaalde orders."
    )
  }

  const deliveredAt = await latestDeliveredAt(orders, order.id)
  assertWithinCoolingOff(deliveredAt)

  const existing = await orders.listEmReturns({ order_line_id: line.id })
  const open = existing.find((r) =>
    OPEN_STATUSES.includes(r.status as ReturnStatus)
  )
  if (open) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Er loopt al een open retour voor deze orderregel."
    )
  }

  const refund_amount = roundMoney(
    toMoneyNumber(line.unit_price_snapshot) * line.quantity
  )
  const created = await orders.createEmReturns({
    order_line_id: line.id,
    reason: input.reason.trim(),
    status: "Aangevraagd",
    seller_decision_reason: null,
    force_reason: null,
    force_admin_user_id: null,
    cooling_off_ends_at: coolingOffEndsAt(deliveredAt!),
    refund_amount,
    refund_status: "requested",
    refund_reference: null,
    refund_executed_at: null,
    carrier: null,
    tracking_code: null,
    tracking_url: null,
  })

  await emitReturnEvent(container, "ReturnRequested", {
    return_id: created.id,
    order_id: order.id,
    order_line_id: line.id,
    seller_id: order.seller_id,
    customer_id: order.customer_id,
    status: created.status,
    initiated_by: "seller",
  })

  return { return: created, order_id: order.id }
}

export type UpdateReturnTrackingInput = {
  return_id: string
  seller_id: string
  carrier?: string | null
  tracking_code?: string | null
  tracking_url?: string | null
  mark_in_transit?: boolean
}

export async function executeUpdateReturnTracking(
  container: MedusaContainer,
  input: UpdateReturnTrackingInput
) {
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const { ret, order } = await loadReturnContext(orders, input.return_id)
  if (order.seller_id !== input.seller_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Retour hoort niet bij deze seller."
    )
  }

  const carrier =
    input.carrier !== undefined ? input.carrier?.trim() || null : ret.carrier
  const tracking_code =
    input.tracking_code !== undefined
      ? input.tracking_code?.trim() || null
      : ret.tracking_code
  const tracking_url =
    input.tracking_url !== undefined
      ? input.tracking_url?.trim() || null
      : ret.tracking_url
  const resolvedUrl = buildTrackingUrl(carrier, tracking_code, tracking_url)

  let status = ret.status as ReturnStatus
  if (
    input.mark_in_transit &&
    (status === "Aangevraagd" ||
      status === "Bevestigd" ||
      status === "Onderweg")
  ) {
    // Tracking means the return parcel is in transit
    status = "Onderweg"
  }

  const updated = await orders.updateEmReturns({
    id: ret.id,
    carrier,
    tracking_code,
    tracking_url: resolvedUrl,
    status,
  })

  if (status !== ret.status) {
    await emitReturnEvent(container, "ReturnStatusChanged", {
      return_id: ret.id,
      from_status: ret.status,
      to_status: status,
      order_id: order.id,
      seller_id: order.seller_id,
      customer_id: order.customer_id,
    })
  }

  return { return: Array.isArray(updated) ? updated[0] : updated }
}

const requestReturnStep = createStep(
  "request-return",
  async (input: RequestReturnInput, { container }) => {
    const result = await executeRequestReturn(container, input)
    return new StepResponse(result)
  }
)

export const requestReturnWorkflow = createWorkflow(
  "request-return",
  function (input: RequestReturnInput) {
    const result = requestReturnStep(input)
    return new WorkflowResponse(result)
  }
)

const sellerTransitionStep = createStep(
  "seller-return-transition",
  async (input: SellerTransitionInput, { container }) => {
    const result = await executeSellerReturnTransition(container, input)
    return new StepResponse(result)
  }
)

export const sellerReturnTransitionWorkflow = createWorkflow(
  "seller-return-transition",
  function (input: SellerTransitionInput) {
    const result = sellerTransitionStep(input)
    return new WorkflowResponse(result)
  }
)

const escalateReturnStep = createStep(
  "escalate-return",
  async (input: EscalateReturnInput, { container }) => {
    const result = await executeEscalateReturn(container, input)
    return new StepResponse(result)
  }
)

export const escalateReturnWorkflow = createWorkflow(
  "escalate-return",
  function (input: EscalateReturnInput) {
    const result = escalateReturnStep(input)
    return new WorkflowResponse(result)
  }
)

const forceRefundStep = createStep(
  "force-refund-return",
  async (input: ForceRefundInput, { container }) => {
    const result = await executeForceRefund(container, input)
    return new StepResponse(result)
  }
)

export const forceRefundWorkflow = createWorkflow(
  "force-refund-return",
  function (input: ForceRefundInput) {
    const result = forceRefundStep(input)
    return new WorkflowResponse(result)
  }
)
