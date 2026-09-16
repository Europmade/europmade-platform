import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { ORDER_MODULE } from "../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../modules/order-service/service"
import {
  executeListConversationMessages,
  executeSendMessage,
  type AttachmentInput,
} from "../../../../../workflows/order-service/messages"

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

/** Buyer (or seller) conversation by id. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const { id } = req.params as RouteParams
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const conversation = await orders.retrieveEmConversation(id)

  let actor:
    | { role: "customer"; customer_id: string }
    | { role: "seller"; customer_id: string; seller_id: string }

  if (conversation.customer_id === customerId) {
    actor = { role: "customer", customer_id: customerId }
  } else {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen toegang tot deze conversatie."
    )
  }

  const result = await executeListConversationMessages(req.scope, id, actor)
  await orders.markConversationRead(customerId, id)

  let order_number: string | null = null
  if (result.conversation.order_id) {
    try {
      const order = await orders.retrieveEmOrder(result.conversation.order_id)
      order_number = order.order_number
    } catch {
      order_number = null
    }
  }

  res.json({
    conversation: {
      id: result.conversation.id,
      status: result.conversation.status,
      subject: result.conversation.subject,
      order_id: result.conversation.order_id,
      order_number,
      customer_id: result.conversation.customer_id,
      seller_id: result.conversation.seller_id,
    },
    messages: result.messages.map((m) => ({
      id: m.id,
      order_id: m.order_id,
      sender_customer_id: m.sender_customer_id,
      body: m.body,
      created_at: new Date(m.created_at).toISOString(),
      attachments: (m.attachments ?? []).map((a) => ({
        id: a.id,
        url: a.url,
        filename: a.filename,
        mime_type: a.mime_type,
        size_bytes: a.size_bytes,
      })),
    })),
    viewer_customer_id: customerId,
  })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const { id } = req.params as RouteParams
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const conversation = await orders.retrieveEmConversation(id)
  if (conversation.customer_id !== customerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen toegang tot deze conversatie."
    )
  }
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
    conversation_id: id,
    sender_customer_id: customerId,
    body: text,
    attachments,
  })
  res.status(201).json(result)
}
