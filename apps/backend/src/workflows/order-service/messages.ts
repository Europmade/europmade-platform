import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ORDER_MODULE } from "../../modules/order-service"
import type OrderServiceModuleService from "../../modules/order-service/service"
import { PARTNER_MODULE } from "../../modules/partner"
import type PartnerModuleService from "../../modules/partner/service"

export type SendMessageInput = {
  order_id: string
  sender_customer_id: string
  body: string
}

export type OrderParticipant =
  | { role: "customer"; customer_id: string }
  | { role: "seller"; customer_id: string; seller_id: string }
  | { role: "admin"; user_id: string }

async function assertCanAccessOrder(
  container: MedusaContainer,
  orderId: string,
  actor: OrderParticipant
) {
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const order = await orders.retrieveEmOrder(orderId)

  if (actor.role === "customer") {
    if (order.customer_id !== actor.customer_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Je mag alleen berichten op je eigen orders zien."
      )
    }
    return order
  }

  if (actor.role === "seller") {
    if (order.seller_id !== actor.seller_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Deze order hoort bij een andere seller."
      )
    }
    return order
  }

  // Admin: alleen bij geëscaleerd retour-geschil (messaging-reviews-qa/spec.md §1)
  const lines = await orders.listOrderLines({ order_id: order.id })
  let escalated = false
  for (const line of lines) {
    const returns = await orders.listEmReturns({ order_line_id: line.id })
    if (returns.some((r) => r.status === "Geëscaleerd")) {
      escalated = true
      break
    }
  }
  if (!escalated) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Beheerder mag alleen meelezen bij een geëscaleerd retourgeschil."
    )
  }
  return order
}

export async function resolveSellerForCustomer(
  container: MedusaContainer,
  customerId: string
): Promise<{ id: string } | null> {
  const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
  const [seller] = await partner.listSellers({ customer_id: customerId })
  if (!seller || seller.onboarding_status !== "Goedgekeurd") return null
  return { id: seller.id }
}

export async function executeSendMessage(
  container: MedusaContainer,
  input: SendMessageInput
) {
  const body = input.body.trim()
  if (body.length < 1 || body.length > 5000) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Berichttekst moet 1–5000 tekens zijn."
    )
  }

  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const order = await orders.retrieveEmOrder(input.order_id)

  const seller = await resolveSellerForCustomer(
    container,
    input.sender_customer_id
  )
  const isCustomer = order.customer_id === input.sender_customer_id
  const isSeller = seller !== null && order.seller_id === seller.id

  if (!isCustomer && !isSeller) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Alleen de klant of de seller van deze order mag berichten sturen."
    )
  }

  const created = await orders.createOrderMessages({
    order_id: order.id,
    sender_customer_id: input.sender_customer_id,
    body,
  })

  const eventBus = container.resolve(Modules.EVENT_BUS)
  await eventBus.emit({
    name: "MessageSent",
    data: {
      message_id: created.id,
      order_id: order.id,
      sender_customer_id: input.sender_customer_id,
      seller_id: order.seller_id,
      customer_id: order.customer_id,
    },
  })

  return { message: created }
}

export async function executeListMessages(
  container: MedusaContainer,
  orderId: string,
  actor: OrderParticipant
) {
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  await assertCanAccessOrder(container, orderId, actor)
  const messages = await orders.listOrderMessages(
    { order_id: orderId },
    { order: { created_at: "ASC" } }
  )
  return { messages }
}

const sendMessageStep = createStep(
  "send-order-message",
  async (input: SendMessageInput, { container }) => {
    const result = await executeSendMessage(container, input)
    return new StepResponse(result)
  }
)

export const sendMessageWorkflow = createWorkflow(
  "send-order-message",
  function (input: SendMessageInput) {
    const result = sendMessageStep(input)
    return new WorkflowResponse(result)
  }
)
