import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { ORDER_MODULE } from "../../../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../../../modules/order-service/service"
import { resolveApprovedSeller } from "../../../../../product-cloud/resolve-seller"
import { enrichOrderBundle } from "../../../../order-enrichment"

type RouteParams = { id: string }

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ["invoice"] as const

interface UploadedFile {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

/** POST multipart order document (invoice only — packing slip is generated). */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService

  const order = await orders.retrieveEmOrder(id)
  if (order.seller_id !== seller.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Deze order hoort bij een andere seller."
    )
  }

  const bodyFields = (req.body ?? {}) as Record<string, unknown>
  const typeRaw =
    typeof bodyFields.type === "string" ? bodyFields.type.trim() : ""
  if (typeRaw === "packing_slip") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Pakbonnen worden automatisch gegenereerd via /documents/packing-slip/generate."
    )
  }
  if (!ALLOWED_TYPES.includes(typeRaw as (typeof ALLOWED_TYPES)[number])) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "type moet invoice zijn."
    )
  }
  const type = typeRaw as (typeof ALLOWED_TYPES)[number]

  const files = (
    req as AuthenticatedMedusaRequest & { files?: UploadedFile[] }
  ).files
  const file = files?.[0]
  if (!file) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Bestand is verplicht (field: files)."
    )
  }
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

  const { result } = await uploadFilesWorkflow(req.scope).run({
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

  const existing = await orders.listOrderDocuments({
    order_id: id,
    type,
  })
  for (const doc of existing) {
    await orders.deleteOrderDocuments(doc.id)
  }

  await orders.createOrderDocuments({
    order_id: id,
    type,
    file_id: uploaded?.id ?? null,
    url,
    filename: file.originalname,
    mime_type: file.mimetype,
    size_bytes: file.size,
    uploaded_at: new Date(),
  })

  const bundle = await enrichOrderBundle(req.scope, orders, id)
  res.status(201).json(bundle)
}
