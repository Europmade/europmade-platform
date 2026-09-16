import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { ORDER_MODULE } from "../../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../../modules/order-service/service"
import { resolveApprovedSeller } from "../../../../product-cloud/resolve-seller"
import {
  executeListConversationMessages,
  executeSendMessage,
  executeSetConversationStatus,
  type AttachmentInput,
  type ConversationStatus,
} from "../../../../../../workflows/order-service/messages"
import { enrichOrderBundle } from "../../../order-enrichment"

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

/** GET conversation detail + messages; marks read for seller. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const result = await executeListConversationMessages(req.scope, id, {
    role: "seller",
    customer_id: seller.customer_id,
    seller_id: seller.id,
  })

  await orders.markConversationRead(seller.customer_id, id)

  let customer_email: string | null = null
  let customer_name: string | null = null
  try {
    const customers = req.scope.resolve(Modules.CUSTOMER) as ICustomerModuleService
    const customer = await customers.retrieveCustomer(
      result.conversation.customer_id
    )
    customer_email = customer.email ?? null
    customer_name = [customer.first_name, customer.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || null
  } catch {
    // ignore
  }

  let order_number: string | null = null
  let order_summary: Awaited<ReturnType<typeof enrichOrderBundle>> | null =
    null
  if (result.conversation.order_id) {
    try {
      order_summary = await enrichOrderBundle(
        req.scope,
        orders,
        result.conversation.order_id
      )
      order_number = order_summary.order.order_number
    } catch {
      order_number = null
      order_summary = null
    }
  }

  res.json({
    conversation: {
      id: result.conversation.id,
      status: result.conversation.status,
      subject: result.conversation.subject,
      seller_id: result.conversation.seller_id,
      customer_id: result.conversation.customer_id,
      customer_email,
      customer_name,
      order_id: result.conversation.order_id,
      order_number,
      last_message_at: result.conversation.last_message_at
        ? new Date(result.conversation.last_message_at).toISOString()
        : null,
    },
    messages: result.messages.map((m) => ({
      id: m.id,
      order_id: m.order_id,
      conversation_id: result.conversation.id,
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
    viewer_customer_id: seller.customer_id,
    order_summary,
  })
}

/** POST reply (JSON or multipart). */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const files = (
    req as AuthenticatedMedusaRequest & { files?: UploadedFile[] }
  ).files
  const bodyFields = (req.body ?? {}) as Record<string, unknown>
  const text =
    typeof bodyFields.body === "string" ? bodyFields.body.trim() : ""
  if (!text) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Berichttekst is verplicht."
    )
  }

  const attachments = files?.length
    ? await uploadAttachments(req.scope, files)
    : []

  const result = await executeSendMessage(req.scope, {
    conversation_id: id,
    sender_customer_id: seller.customer_id,
    body: text,
    attachments,
  })
  res.status(201).json(result)
}

/** PATCH status: resolved | waiting_for_customer | waiting_for_seller */
export async function PATCH(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const body = (req.body ?? {}) as { status?: string }
  const allowed: ConversationStatus[] = [
    "waiting_for_seller",
    "waiting_for_customer",
    "resolved",
  ]
  if (!body.status || !allowed.includes(body.status as ConversationStatus)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "status moet waiting_for_seller, waiting_for_customer of resolved zijn."
    )
  }
  const conversation = await executeSetConversationStatus(
    req.scope,
    id,
    seller.id,
    body.status as ConversationStatus
  )
  res.json({
    conversation: {
      id: conversation.id,
      status: conversation.status,
    },
  })
}
