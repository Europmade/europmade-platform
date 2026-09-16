import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { ORDER_MODULE } from "../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../modules/order-service/service"
import { resolveApprovedSeller } from "../../../product-cloud/resolve-seller"
import {
  executeSendMessage,
  type AttachmentInput,
} from "../../../../../workflows/order-service/messages"

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

/**
 * POST /store/order-service/seller/conversations
 * Start a conversation (customer required, order optional).
 * multipart: body, subject?, customer_id, order_id?, files[]
 * or JSON: { body, subject?, customer_id, order_id? }
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const files = (
    req as AuthenticatedMedusaRequest & { files?: UploadedFile[] }
  ).files
  const bodyFields = (req.body ?? {}) as Record<string, unknown>
  const customer_id =
    typeof bodyFields.customer_id === "string"
      ? bodyFields.customer_id.trim()
      : ""
  const order_id =
    typeof bodyFields.order_id === "string" && bodyFields.order_id.trim()
      ? bodyFields.order_id.trim()
      : null
  const subject =
    typeof bodyFields.subject === "string" ? bodyFields.subject.trim() : null
  const text =
    typeof bodyFields.body === "string" ? bodyFields.body.trim() : ""

  if (!customer_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "customer_id is verplicht."
    )
  }
  if (!text) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Berichttekst is verplicht."
    )
  }

  if (order_id) {
    const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
    const order = await orders.retrieveEmOrder(order_id)
    if (order.seller_id !== seller.id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Order hoort niet bij deze seller."
      )
    }
    if (order.customer_id !== customer_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Order hoort niet bij de gekozen klant."
      )
    }
  } else {
    // Customer must have at least one order with this seller (no free spam)
    const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
    const related = await orders.listEmOrders({
      seller_id: seller.id,
      customer_id,
    })
    if (related.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Klant heeft geen bestellingen bij jou — conversatie niet toegestaan."
      )
    }
  }

  const attachments = files?.length
    ? await uploadAttachments(req.scope, files)
    : []

  const result = await executeSendMessage(req.scope, {
    order_id,
    customer_id,
    sender_customer_id: seller.customer_id,
    body: text,
    subject,
    attachments,
  })

  res.status(201).json(result)
}

/** GET /store/order-service/seller/conversations — alias handled by messages list. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  // Re-use list via redirect-style: callers should use /seller/messages
  res.status(404).json({
    message: "Gebruik GET /store/order-service/seller/messages",
  })
}
