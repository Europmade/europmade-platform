import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { ORDER_MODULE } from "../../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../../modules/order-service/service"
import {
  executeListMessages,
  executeSendMessage,
  resolveSellerForCustomer,
  type AttachmentInput,
  type OrderParticipant,
} from "../../../../../../workflows/order-service"

type RouteParams = { id: string }

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]
const MAX_BYTES = 10 * 1024 * 1024

interface UploadedFile {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

async function resolveActor(
  container: AuthenticatedMedusaRequest["scope"],
  customerId: string,
  orderId: string
): Promise<OrderParticipant> {
  const orders = container.resolve(ORDER_MODULE) as OrderServiceModuleService
  const order = await orders.retrieveEmOrder(orderId)
  if (order.customer_id === customerId) {
    return { role: "customer", customer_id: customerId }
  }
  const seller = await resolveSellerForCustomer(container, customerId)
  if (seller && order.seller_id === seller.id) {
    return {
      role: "seller",
      customer_id: customerId,
      seller_id: seller.id,
    }
  }
  throw new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    "Geen toegang tot berichten van deze order."
  )
}

async function uploadAttachments(
  scope: AuthenticatedMedusaRequest["scope"],
  files: UploadedFile[]
): Promise<AttachmentInput[]> {
  const out: AttachmentInput[] = []
  for (const file of files) {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Ongeldig bestandsformaat. Toegestaan: JPG, PNG, WEBP, PDF."
      )
    }
    if (file.size > MAX_BYTES) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Bestand is te groot (max. 10 MB)."
      )
    }
    const { result } = await uploadFilesWorkflow(scope).run({
      input: {
        files: [
          {
            filename: file.originalname,
            mimeType: file.mimetype,
            content: file.buffer.toString("base64"),
            access: "public",
          },
        ],
      },
    })
    const uploaded = result?.[0] as { id?: string; url?: string } | undefined
    const url = uploaded?.url || uploaded?.id
    if (!url) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Upload mislukt."
      )
    }
    out.push({
      url,
      file_id: uploaded?.id ?? null,
      filename: file.originalname,
      mime_type: file.mimetype,
      size_bytes: file.size,
    })
  }
  return out
}

/** Thread voor één order (klant of seller). Opening marks the conversation read. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const customerId = req.auth_context.actor_id
  const actor = await resolveActor(req.scope, customerId, id)
  const result = await executeListMessages(req.scope, id, actor)
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const order = await orders.retrieveEmOrder(id)
  try {
    const [conversation] = await orders.listEmConversations({
      order_id: order.id,
    })
    if (conversation) {
      await orders.markConversationRead(customerId, conversation.id)
    }
  } catch {
    // never block
  }
  res.json({
    order_id: order.id,
    order_number: order.order_number,
    customer_id: order.customer_id,
    seller_id: order.seller_id,
    viewer_customer_id: customerId,
    ...result,
  })
}

/** Nieuw bericht in order-thread (JSON of multipart met files). */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const customerId = req.auth_context.actor_id
  await resolveActor(req.scope, customerId, id)
  const bodyFields = (req.body ?? {}) as Record<string, unknown>
  const text =
    typeof bodyFields.body === "string" ? bodyFields.body.trim() : ""
  if (!text) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Berichttekst is verplicht."
    )
  }
  const files = (
    req as AuthenticatedMedusaRequest & { files?: UploadedFile[] }
  ).files
  const attachments = files?.length
    ? await uploadAttachments(req.scope, files)
    : []

  const result = await executeSendMessage(req.scope, {
    order_id: id,
    sender_customer_id: customerId,
    body: text,
    attachments,
  })
  res.status(201).json(result)
}
