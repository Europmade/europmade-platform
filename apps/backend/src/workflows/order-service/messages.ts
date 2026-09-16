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

export type ConversationStatus =
  | "waiting_for_seller"
  | "waiting_for_customer"
  | "resolved"

export type AttachmentInput = {
  url: string
  file_id?: string | null
  filename: string
  mime_type: string
  size_bytes: number
}

export type SendMessageInput = {
  order_id?: string | null
  conversation_id?: string | null
  sender_customer_id: string
  body: string
  subject?: string | null
  customer_id?: string | null
  attachments?: AttachmentInput[]
}

export type OrderParticipant =
  | { role: "customer"; customer_id: string }
  | { role: "seller"; customer_id: string; seller_id: string }
  | { role: "admin"; user_id: string }

export async function resolveSellerForCustomer(
  container: MedusaContainer,
  customerId: string
): Promise<{ id: string; customer_id: string } | null> {
  const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
  const [seller] = await partner.listSellers({ customer_id: customerId })
  if (!seller || seller.onboarding_status !== "Goedgekeurd") return null
  return { id: seller.id, customer_id: seller.customer_id }
}

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

export async function assertCanAccessConversation(
  container: MedusaContainer,
  conversationId: string,
  actor: OrderParticipant
) {
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const conversation = await orders.retrieveEmConversation(conversationId)

  if (actor.role === "customer") {
    if (conversation.customer_id !== actor.customer_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Geen toegang tot deze conversatie."
      )
    }
    return conversation
  }

  if (actor.role === "seller") {
    if (conversation.seller_id !== actor.seller_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Geen toegang tot deze conversatie."
      )
    }
    return conversation
  }

  if (conversation.order_id) {
    await assertCanAccessOrder(container, conversation.order_id, actor)
  } else {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Beheerder mag alleen meelezen bij een geëscaleerd retourgeschil."
    )
  }
  return conversation
}

async function findOrCreateConversationForOrder(
  orders: OrderServiceModuleService,
  order: { id: string; seller_id: string; customer_id: string },
  subject?: string | null
) {
  const existing = await orders.listEmConversations({ order_id: order.id })
  if (existing[0]) return existing[0]

  const created = await orders.createEmConversations({
    seller_id: order.seller_id,
    customer_id: order.customer_id,
    order_id: order.id,
    subject: subject?.trim() || null,
    status: "waiting_for_seller",
    last_message_at: null,
  })
  return Array.isArray(created) ? created[0] : created
}

function nextStatusAfterSend(params: {
  senderIsCustomer: boolean
  previous: ConversationStatus
}): ConversationStatus {
  if (params.senderIsCustomer) {
    return "waiting_for_seller"
  }
  return "waiting_for_customer"
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
  const sellerActor = await resolveSellerForCustomer(
    container,
    input.sender_customer_id
  )

  let conversation:
    | Awaited<ReturnType<OrderServiceModuleService["retrieveEmConversation"]>>
    | null = null
  let order: { id: string; seller_id: string; customer_id: string } | null =
    null

  if (input.conversation_id) {
    conversation = await orders.retrieveEmConversation(input.conversation_id)
    if (conversation.order_id) {
      order = await orders.retrieveEmOrder(conversation.order_id)
    }
  } else if (input.order_id) {
    order = await orders.retrieveEmOrder(input.order_id)
    conversation = await findOrCreateConversationForOrder(
      orders,
      order,
      input.subject
    )
  } else if (sellerActor && input.customer_id) {
    const existing = await orders.listEmConversations({
      seller_id: sellerActor.id,
      customer_id: input.customer_id.trim(),
    })
    const withoutOrder = existing.find((c) => !c.order_id)
    if (withoutOrder) {
      conversation = withoutOrder
    } else {
      const created = await orders.createEmConversations({
        seller_id: sellerActor.id,
        customer_id: input.customer_id.trim(),
        order_id: null,
        subject: input.subject?.trim() || null,
        status: "waiting_for_customer",
        last_message_at: null,
      })
      conversation = Array.isArray(created) ? created[0] : created
    }
  } else {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "conversation_id, order_id of (seller + customer_id) is verplicht."
    )
  }

  if (!conversation) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Conversatie kon niet worden aangemaakt."
    )
  }

  const isCustomer = conversation.customer_id === input.sender_customer_id
  const isSeller =
    sellerActor !== null && conversation.seller_id === sellerActor.id

  if (!isCustomer && !isSeller) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Alleen de klant of de seller van deze conversatie mag berichten sturen."
    )
  }

  const created = await orders.createOrderMessages({
    conversation_id: conversation.id,
    order_id: conversation.order_id ?? order?.id ?? null,
    sender_customer_id: input.sender_customer_id,
    body,
  })
  const message = Array.isArray(created) ? created[0] : created

  const attachments = input.attachments ?? []
  if (attachments.length > 0) {
    await orders.createOrderMessageAttachments(
      attachments.map((att) => ({
        message_id: message.id,
        file_id: att.file_id ?? null,
        url: att.url,
        filename: att.filename,
        mime_type: att.mime_type,
        size_bytes: att.size_bytes,
      }))
    )
  }

  const status = nextStatusAfterSend({
    senderIsCustomer: isCustomer,
    previous: conversation.status as ConversationStatus,
  })

  await orders.updateEmConversations({
    id: conversation.id,
    status,
    last_message_at: new Date(),
    subject:
      conversation.subject ||
      (input.subject?.trim() ? input.subject.trim() : conversation.subject),
  })

  if (isSeller) {
    await orders.markConversationRead(
      input.sender_customer_id,
      conversation.id
    )
  }

  const eventBus = container.resolve(Modules.EVENT_BUS)
  await eventBus.emit({
    name: "MessageSent",
    data: {
      message_id: message.id,
      conversation_id: conversation.id,
      order_id: conversation.order_id,
      sender_customer_id: input.sender_customer_id,
      seller_id: conversation.seller_id,
      customer_id: conversation.customer_id,
    },
  })

  const storedAttachments = await orders.listOrderMessageAttachments({
    message_id: message.id,
  })

  return {
    message: {
      ...message,
      attachments: storedAttachments,
    },
    conversation_id: conversation.id,
    status,
  }
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
  const withAttachments = []
  for (const message of messages) {
    const attachments = await orders.listOrderMessageAttachments({
      message_id: message.id,
    })
    withAttachments.push({ ...message, attachments })
  }
  return { messages: withAttachments }
}

export async function executeListConversationMessages(
  container: MedusaContainer,
  conversationId: string,
  actor: OrderParticipant
) {
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const conversation = await assertCanAccessConversation(
    container,
    conversationId,
    actor
  )
  const messages = await orders.listOrderMessages(
    { conversation_id: conversationId },
    { order: { created_at: "ASC" } }
  )
  const withAttachments = []
  for (const message of messages) {
    const attachments = await orders.listOrderMessageAttachments({
      message_id: message.id,
    })
    withAttachments.push({ ...message, attachments })
  }
  return { conversation, messages: withAttachments }
}

export async function executeSetConversationStatus(
  container: MedusaContainer,
  conversationId: string,
  sellerId: string,
  status: ConversationStatus
) {
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const conversation = await orders.retrieveEmConversation(conversationId)
  if (conversation.seller_id !== sellerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen toegang tot deze conversatie."
    )
  }
  const updated = await orders.updateEmConversations({
    id: conversationId,
    status,
  })
  return Array.isArray(updated) ? updated[0] : updated
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
