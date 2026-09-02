import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { persistMediaReference } from "@europmade/utils"
import {
  detectPngHasAlpha,
  validateMedia,
} from "@europmade/utils"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../../modules/product-cloud/service"
import { addMediaWorkflow } from "../../../../../../../workflows/product-cloud"
import { resolveApprovedSeller } from "../../../../resolve-seller"

type RouteParams = { id: string }

interface UploadedFile {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

/** Max ~3 MB per product image/video upload. */
const MAX_BYTES = 3 * 1024 * 1024
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
  "video/webm",
])

/**
 * POST multipart file upload for product media.
 * Fields: file, media_type?, version_id?
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const file = (req as AuthenticatedMedusaRequest & { file?: UploadedFile })
    .file
  const body = (req.body ?? {}) as Record<string, unknown>

  if (!file) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Bestand is verplicht."
    )
  }
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Toegestaan: JPEG, PNG, WebP of MP4/WebM. Maximaal 3 MB."
    )
  }
  if (file.size > MAX_BYTES) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Bestand is te groot. Maximum is 3 MB per bestand."
    )
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const product = await productCloud.retrieveProduct(id)
  if (product.current_owner_seller_id !== seller.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Alleen de producteigenaar mag media uploaden."
    )
  }

  let versionId =
    typeof body.version_id === "string" ? body.version_id : undefined
  if (!versionId) {
    const versions = await productCloud.listProductVersions({
      product_id: id,
    })
    versionId = [...versions].sort(
      (a: { version_number: number }, b: { version_number: number }) =>
        b.version_number - a.version_number
    )[0]?.id
  }
  if (!versionId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Geen productversie gevonden."
    )
  }

  const mediaTypeRaw =
    typeof body.media_type === "string" ? body.media_type : ""
  const isVideo = file.mimetype.startsWith("video/")
  const media_type =
    mediaTypeRaw === "Hoofdafbeelding" ||
    mediaTypeRaw === "Overige afbeelding" ||
    mediaTypeRaw === "Video"
      ? mediaTypeRaw
      : isVideo
        ? "Video"
        : "Overige afbeelding"

  if (media_type === "Hoofdafbeelding" && !isVideo) {
    const alpha =
      file.mimetype === "image/png"
        ? detectPngHasAlpha(file.buffer)
        : file.mimetype === "image/webp" || file.mimetype === "image/avif"
          ? null
          : false
    const validation = validateMedia({
      placement: "product_main",
      mimeType: file.mimetype,
      sizeBytes: file.size,
      hasAlpha: alpha,
      fileName: file.originalname,
    })
    if (!validation.ok) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, validation.message)
    }
  }

  const { result: uploaded } = await uploadFilesWorkflow(req.scope).run({
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
  const fileRow = uploaded?.[0] as { id?: string; url?: string } | undefined
  const storage_reference =
    persistMediaReference(fileRow?.url || fileRow?.id) || fileRow?.id
  if (!storage_reference) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Upload mislukt — geen storage-referentie."
    )
  }

  if (media_type === "Hoofdafbeelding") {
    const existing = await productCloud.listProductMedias({
      product_version_id: versionId,
      media_type: "Hoofdafbeelding",
    })
    for (const row of existing) {
      await productCloud.updateProductMedias({
        id: row.id,
        media_type: "Overige afbeelding",
      })
    }
  }

  const { result } = await addMediaWorkflow(req.scope).run({
    input: {
      product_id: id,
      version_id: versionId,
      seller_id: seller.id,
      media_type,
      storage_reference,
    },
  })

  res.status(201).json({
    media: result,
    limits: {
      max_bytes: MAX_BYTES,
      mime_types: [...ALLOWED_MIME],
      recommended: "JPEG/WebP, max 3 MB, bij voorkeur 1:1 of 4:5",
    },
  })
}
