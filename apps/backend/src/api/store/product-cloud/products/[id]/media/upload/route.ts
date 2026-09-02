import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import {
  detectPngHasAlpha,
  getMediaRequirements,
  persistMediaReference,
  validateMedia,
} from "@europmade/utils"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../../modules/product-cloud/service"
import { processProductImageBuffer } from "../../../../../../../modules/product-cloud/product-media-processor"
import { addMediaWorkflow } from "../../../../../../../workflows/product-cloud"
import { resolveApprovedSeller } from "../../../../resolve-seller"

type RouteParams = { id: string }

interface UploadedFile {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
])
const VIDEO_MIME = new Set(["video/mp4", "video/webm"])

function placementForMediaType(
  media_type: "Hoofdafbeelding" | "Overige afbeelding" | "Video"
) {
  if (media_type === "Hoofdafbeelding") return "product_main" as const
  if (media_type === "Video") return "product_video" as const
  return "product_other" as const
}

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

  const isVideo = VIDEO_MIME.has(file.mimetype)
  const isImage = IMAGE_MIME.has(file.mimetype)
  if (!isVideo && !isImage) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Toegestaan: JPG, PNG, WebP, AVIF of MP4/WebM."
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
  const media_type =
    mediaTypeRaw === "Hoofdafbeelding" ||
    mediaTypeRaw === "Overige afbeelding" ||
    mediaTypeRaw === "Video"
      ? mediaTypeRaw
      : isVideo
        ? "Video"
        : "Overige afbeelding"

  if (media_type === "Video" && !isVideo) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Voor video gebruik je een MP4/WebM-bestand of voeg een YouTube/Vimeo-link toe."
    )
  }
  if (media_type === "Hoofdafbeelding" && isVideo) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "De hoofdafbeelding moet een afbeelding zijn."
    )
  }

  const placement = placementForMediaType(media_type)
  const reqLimits = getMediaRequirements(placement)
  if (file.size > reqLimits.maxBytes) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Bestand is te groot. Maximum is ${Math.round(reqLimits.maxBytes / (1024 * 1024))} MB.`
    )
  }

  let storage_reference = ""
  let metadata: Record<string, unknown> | null = null

  if (isImage) {
    const alpha =
      file.mimetype === "image/png"
        ? detectPngHasAlpha(file.buffer)
        : file.mimetype === "image/jpeg"
          ? false
          : null
    const validation = validateMedia({
      placement,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      hasAlpha: alpha,
      fileName: file.originalname,
    })
    if (!validation.ok) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, validation.message)
    }

    const processed = await processProductImageBuffer(
      file.buffer,
      file.originalname,
      file.mimetype,
      media_type === "Hoofdafbeelding" ? "Hoofdafbeelding" : "Overige afbeelding"
    )

    const { result: uploaded } = await uploadFilesWorkflow(req.scope).run({
      input: {
        files: processed.files.map((f) => ({
          filename: f.filename,
          mimeType: f.mimeType,
          content: f.content,
          access: "public" as const,
        })),
      },
    })

    const variantRefs: typeof processed.metadata.variants = {
      webp: {},
      avif: {},
      jpeg: {},
      png: processed.metadata.variants?.png,
    }
    for (const row of uploaded ?? []) {
      const ref = persistMediaReference(
        (row as { url?: string }).url || (row as { id?: string }).id
      )
      if (!ref) continue
      const name = (row as { filename?: string }).filename || ""
      for (const width of ["400", "800", "1200"] as const) {
        if (name.includes(`-${width}.webp`)) variantRefs.webp![width] = ref
        if (name.includes(`-${width}.avif`)) variantRefs.avif![width] = ref
        if (name.includes(`-${width}.jpg`)) variantRefs.jpeg![width] = ref
        if (name.includes(`-1200.png`)) {
          variantRefs.png = { ...variantRefs.png, "1200": ref }
        }
      }
      if (name === file.originalname.replace(/[^\w.\-() ]+/g, "_")) {
        processed.metadata.original_reference = ref
      }
    }

    metadata = { ...processed.metadata, variants: variantRefs }
    storage_reference =
      persistMediaReference(
        variantRefs.webp?.["800"] ||
          processed.metadata.original_reference ||
          processed.display_reference
      ) || processed.display_reference
  } else {
    const validation = validateMedia({
      placement: "product_video",
      mimeType: file.mimetype,
      sizeBytes: file.size,
      fileName: file.originalname,
    })
    if (!validation.ok) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, validation.message)
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
    storage_reference =
      persistMediaReference(fileRow?.url || fileRow?.id) || fileRow?.id || ""
    metadata = { mime_type: file.mimetype }
  }

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
      metadata,
    },
  })

  res.status(201).json({
    media: result,
    limits: {
      max_bytes: reqLimits.maxBytes,
      mime_types: reqLimits.mimeTypes,
    },
  })
}
