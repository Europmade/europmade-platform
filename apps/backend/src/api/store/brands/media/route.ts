import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { persistMediaReference, resolveMediaUrl } from "@europmade/utils"
import { resolveApprovedSeller } from "../../product-cloud/resolve-seller"
import { requestBackendOrigin } from "../../../request-backend-origin"

interface UploadedFile {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"])

/**
 * POST /store/brands/media — public image for official brand page.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  const file = (req as AuthenticatedMedusaRequest & { file?: UploadedFile }).file
  if (!file) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Bestand is verplicht.")
  }
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Alleen JPEG, PNG en WebP zijn toegestaan."
    )
  }
  if (file.size > MAX_BYTES) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Bestand is te groot (max. 5 MB)."
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
  const stored =
    persistMediaReference(uploaded?.url || uploaded?.id) || uploaded?.id
  if (!stored) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Upload mislukt."
    )
  }
  const origin = requestBackendOrigin(req)
  res.status(201).json({
    url: resolveMediaUrl(stored, origin) ?? stored,
    storage_reference: stored,
  })
}
