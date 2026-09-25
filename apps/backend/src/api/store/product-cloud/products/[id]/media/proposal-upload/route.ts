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
import {
  mapUploadedProductImageRefs,
  processProductImageBuffer,
} from "../../../../../../../modules/product-cloud/product-media-processor"
import { normalizeProposalImageMime } from "../../../../../../../modules/product-cloud/proposal-image-mime"
import { resolveApprovedSeller } from "../../../../resolve-seller"
import {
  sellerCanDirectEditCatalog,
  sellerHasOfferOnProduct,
} from "../../../../catalog-edit-guard"

type RouteParams = { id: string }

interface UploadedFile {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

/**
 * Staging upload for change proposals.
 * Stores the file via existing Medusa upload infra but does NOT attach it
 * to live product media until an admin/PM accepts the proposal.
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

  if (!file) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Bestand is verplicht."
    )
  }
  const normalizedMime = normalizeProposalImageMime(
    file.mimetype,
    file.originalname
  )
  if (!normalizedMime) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Voor mediavoorstellen zijn alleen afbeeldingen toegestaan (JPG, PNG, WebP, AVIF)."
    )
  }
  // Prefer normalized mime for downstream processing (Windows often sends image/jpg).
  file.mimetype = normalizedMime

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const product = await productCloud.retrieveProduct(id)
  const direct = await sellerCanDirectEditCatalog(req.scope, product, seller)
  const hasOffer = await sellerHasOfferOnProduct(req.scope, id, seller.id)
  if (!direct.allowed && !hasOffer) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Je mag alleen een mediavoorstel uploaden als je dit product aanbiedt."
    )
  }

  const reqLimits = getMediaRequirements("product_other")
  if (file.size > reqLimits.maxBytes) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Bestand is te groot. Maximum is ${Math.round(reqLimits.maxBytes / (1024 * 1024))} MB.`
    )
  }

  const alpha =
    file.mimetype === "image/png"
      ? detectPngHasAlpha(file.buffer)
      : file.mimetype === "image/jpeg"
        ? false
        : null
  const validation = validateMedia({
    placement: "product_other",
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
    "Overige afbeelding"
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

  const mapped = mapUploadedProductImageRefs(
    uploaded as Array<{
      url?: string
      id?: string
      filename?: string
      file_name?: string
      key?: string
    }>,
    file.originalname
  )
  if (mapped.original_reference) {
    processed.metadata.original_reference = mapped.original_reference
  }

  const storage_reference =
    persistMediaReference(
      mapped.variants.webp?.["800"] ||
        mapped.variants.jpeg?.["800"] ||
        mapped.original_reference ||
        processed.metadata.original_reference ||
        processed.display_reference
    ) ||
    mapped.original_reference ||
    processed.display_reference

  if (!storage_reference) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Upload mislukt — geen storage-referentie."
    )
  }

  res.status(201).json({
    storage_reference,
    purpose: "change_proposal",
    metadata: {
      ...processed.metadata,
      variants: mapped.variants,
      purpose: "change_proposal",
      proposed_by_seller_id: seller.id,
      product_id: id,
    },
    // Explicit: this upload is NOT attached to live product media.
    attached_to_product: false,
  })
}
