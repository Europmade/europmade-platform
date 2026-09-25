import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../../modules/product-cloud/service"
import { resolveApprovedSeller } from "../../../../resolve-seller"
import { assertSellerCanDirectEditCatalog } from "../../../../catalog-edit-guard"

type RouteParams = { id: string }

const Body = z.object({
  media_ids: z.array(z.string().trim().min(1)).min(1).max(40),
})

/**
 * POST /store/product-cloud/products/:id/media/reorder
 * Persist seller-defined gallery order. Primary image is independent.
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
  const parsed = Body.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "media_ids is verplicht."
    )
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const product = await productCloud.retrieveProduct(id)
  await assertSellerCanDirectEditCatalog(req.scope, product, seller)

  const versions = await productCloud.listProductVersions({ product_id: id })
  const working = [...versions].sort(
    (a: { version_number: number }, b: { version_number: number }) =>
      b.version_number - a.version_number
  )[0]
  if (!working) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Geen productversie gevonden."
    )
  }

  const existing = await productCloud.listProductMedias({
    product_version_id: working.id,
  })
  const byId = new Map(
    existing.map((m: { id: string }) => [m.id, m] as const)
  )
  for (const mediaId of parsed.data.media_ids) {
    if (!byId.has(mediaId)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Media hoort niet bij dit product."
      )
    }
  }

  let order = 0
  for (const mediaId of parsed.data.media_ids) {
    await productCloud.updateProductMedias({
      id: mediaId,
      sort_order: order,
    })
    order += 1
  }

  await productCloud.createProductFieldChanges({
    product_id: id,
    product_version_id: working.id,
    seller_id: seller.id,
    actor_customer_id: req.auth_context.actor_id,
    field_code: "media.sort_order",
    field_label: "Foto-volgorde gewijzigd",
    old_value: existing
      .map((m: { id: string }) => m.id)
      .join(","),
    new_value: parsed.data.media_ids.join(","),
    status: "current",
    reason: null,
  })

  const media = await productCloud.listProductMedias(
    { product_version_id: working.id },
    { order: { sort_order: "ASC" } }
  )
  res.json({ media })
}
