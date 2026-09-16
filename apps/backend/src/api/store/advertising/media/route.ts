import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { persistMediaReference, resolveMediaUrl } from "@europmade/utils"
import { resolveApprovedSeller } from "../../product-cloud/resolve-seller"
import { requestBackendOrigin } from "../../../request-backend-origin"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"

interface UploadedFile {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"])

/**
 * POST /store/advertising/media — seller banner image upload.
 * Returns { url } of the uploaded file.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  await resolveApprovedSeller(req.scope, req.auth_context.actor_id)

  const file = (req as AuthenticatedMedusaRequest & { file?: UploadedFile })
    .file
  if (!file) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "File is required.")
  }
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Only JPEG, PNG and WebP images are allowed."
    )
  }
  if (file.size > MAX_BYTES) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "File too large (max 5 MB)."
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
  const stored = persistMediaReference(uploaded?.url || uploaded?.id) || uploaded?.id
  if (!stored) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Upload failed — no storage reference."
    )
  }
  const origin = requestBackendOrigin(req)

  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const asset = await cms.createCmsAssets({
    placement: "cms_banner",
    storage_reference: stored,
    mime_type: file.mimetype,
    original_filename: file.originalname,
    size_bytes: file.size,
    width: null,
    height: null,
    alt_text: null,
  })

  res.status(201).json({
    asset_id: asset.id,
    url: resolveMediaUrl(stored, origin) ?? stored,
    mime_type: file.mimetype,
    original_filename: file.originalname,
  })
}
