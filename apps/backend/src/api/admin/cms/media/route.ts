import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import type { MediaPlacement } from "@europmade/types"
import {
  detectPngHasAlpha,
  getMediaRequirements,
  normalizeMediaMimeType,
  persistMediaReference,
  resolveMediaUrl,
  validateMedia,
} from "@europmade/utils"
import { requestBackendOrigin } from "../../../request-backend-origin"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"

interface UploadedFile {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

const PLACEMENTS: MediaPlacement[] = [
  "cms_banner",
  "cms_action_banner",
  "cms_site_logo",
  "homepage_hero",
  "brand_logo",
  "seller_logo",
  "seller_storefront_banner",
  "product_main",
  "product_other",
  "facility_photo",
  "brand_story_photo",
  "commercial_nav_icon",
]

function isPlacement(value: string): value is MediaPlacement {
  return (PLACEMENTS as string[]).includes(value)
}

/**
 * POST /admin/cms/media — multipart file + placement.
 * Publieke file-module upload + cms_asset metadata + validateMedia.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const file = (req as AuthenticatedMedusaRequest & { file?: UploadedFile })
    .file
  const body = (req.body ?? {}) as Record<string, unknown>
  const placementRaw =
    typeof body.placement === "string" ? body.placement.trim() : "cms_banner"

  if (!file) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Bestand is verplicht."
    )
  }
  if (!isPlacement(placementRaw)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Ongeldige media-placement."
    )
  }

  const reqs = getMediaRequirements(placementRaw)
  let width: number | null =
    typeof body.width === "string" || typeof body.width === "number"
      ? Number(body.width)
      : null
  let height: number | null =
    typeof body.height === "string" || typeof body.height === "number"
      ? Number(body.height)
      : null
  if (!Number.isFinite(width)) width = null
  if (!Number.isFinite(height)) height = null

  const mimeType = normalizeMediaMimeType(file.mimetype, file.originalname)
  if (
    (!width || !height) &&
    mimeType.startsWith("image/") &&
    mimeType !== "image/svg+xml"
  ) {
    try {
      const sharp = (await import("sharp")).default
      const meta = await sharp(file.buffer).metadata()
      if (typeof meta.width === "number" && meta.width > 0) width = meta.width
      if (typeof meta.height === "number" && meta.height > 0) {
        height = meta.height
      }
    } catch {
      /* validateMedia handles missing dimensions */
    }
  }

  const hasAlpha =
    mimeType === "image/png"
      ? detectPngHasAlpha(file.buffer)
      : mimeType === "image/jpeg"
        ? false
        : null

  const validation = validateMedia({
    placement: placementRaw,
    mimeType,
    sizeBytes: file.size,
    width,
    height,
    hasAlpha,
    fileName: file.originalname,
  })
  if (!validation.ok) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, validation.message)
  }

  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: [
        {
          filename: file.originalname,
          mimeType,
          content: file.buffer.toString("base64"),
          access: "public",
        },
      ],
    },
  })

  const uploaded = result?.[0] as
    | { id?: string; url?: string }
    | undefined
  const stored =
    persistMediaReference(uploaded?.url || uploaded?.id) || uploaded?.id
  if (!stored) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Upload mislukt — geen storage-referentie."
    )
  }
  const origin = requestBackendOrigin(req)

  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const asset = await cms.createCmsAssets({
    placement: placementRaw,
    storage_reference: stored,
    mime_type: mimeType,
    original_filename: file.originalname,
    size_bytes: file.size,
    width,
    height,
    alt_text: null,
  })

  res.status(201).json({
    asset: {
      id: asset.id,
      placement: asset.placement,
      url: resolveMediaUrl(stored, origin) ?? stored,
      mime_type: asset.mime_type,
      size_bytes: asset.size_bytes,
      width: asset.width,
      height: asset.height,
      requirements: {
        placement: reqs.placement,
        maxBytes: reqs.maxBytes,
        mimeTypes: reqs.mimeTypes,
        aspectRatio: reqs.aspectRatio,
        transparency: reqs.transparency,
      },
    },
  })
}
