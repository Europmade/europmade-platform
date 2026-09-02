import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../../modules/product-cloud/service"
import { resolveApprovedSeller } from "../../../../resolve-seller"

type RouteParams = { id: string; mediaId: string }

async function assertMediaOwner(
  productCloud: ProductCloudModuleService,
  productId: string,
  mediaId: string,
  sellerId: string
) {
  const product = await productCloud.retrieveProduct(productId)
  if (product.current_owner_seller_id !== sellerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Alleen de producteigenaar mag media beheren."
    )
  }
  const media = await productCloud.retrieveProductMedia(mediaId)
  const version = await productCloud.retrieveProductVersion(
    media.product_version_id
  )
  if (version.product_id !== productId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Media hoort niet bij dit product."
    )
  }
  return { product, media, version }
}

/** Set as primary image or change type. */
export async function PATCH(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id, mediaId } = req.params as RouteParams
  const body = (req.body ?? {}) as {
    set_primary?: boolean
    media_type?: "Hoofdafbeelding" | "Overige afbeelding" | "Video"
  }
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const { media, version } = await assertMediaOwner(
    productCloud,
    id,
    mediaId,
    seller.id
  )

  if (body.set_primary || body.media_type === "Hoofdafbeelding") {
    const existing = await productCloud.listProductMedias({
      product_version_id: version.id,
      media_type: "Hoofdafbeelding",
    })
    for (const row of existing) {
      if (row.id === media.id) continue
      await productCloud.updateProductMedias({
        id: row.id,
        media_type: "Overige afbeelding",
      })
    }
    await productCloud.updateProductMedias({
      id: media.id,
      media_type: "Hoofdafbeelding",
    })
    await productCloud.createProductFieldChanges({
      product_id: id,
      product_version_id: version.id,
      seller_id: seller.id,
      actor_customer_id: req.auth_context.actor_id,
      field_code: "media.primary",
      field_label: "Hoofdafbeelding gewijzigd",
      old_value: existing[0]?.id ?? null,
      new_value: media.id,
      status: "current",
      reason: null,
    })
  } else if (body.media_type) {
    await productCloud.updateProductMedias({
      id: media.id,
      media_type: body.media_type,
    })
  }

  const updated = await productCloud.retrieveProductMedia(mediaId)
  res.json({ media: updated })
}

/** Soft-delete media. */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id, mediaId } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  await assertMediaOwner(productCloud, id, mediaId, seller.id)
  await productCloud.softDeleteProductMedias([mediaId])
  res.json({ deleted: true, media_id: mediaId })
}
