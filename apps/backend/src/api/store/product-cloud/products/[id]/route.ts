import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { resolveApprovedSeller } from "../../resolve-seller"

type RouteParams = { id: string }

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const product = await productCloud.retrieveProduct(id)
  const isOwner = product.current_owner_seller_id === seller.id

  if (!isOwner) {
    const ownProposals = await productCloud.listChangeProposals({
      product_id: id,
      submitter_seller_id: seller.id,
    })
    res.json({
      product: {
        id: product.id,
        lifecycle_status: product.lifecycle_status,
        brand_id: product.brand_id,
        manufacturer_id: product.manufacturer_id,
        current_owner_seller_id: product.current_owner_seller_id,
      },
      versions: [],
      ownership_records: [],
      own_change_proposals: ownProposals,
    })
    return
  }

  const versions = await productCloud.listProductVersions(
    { product_id: id },
    { relations: ["media_items"] }
  )
  const ownership = await productCloud.listOwnershipRecords({
    product_id: id,
  })

  res.json({
    product,
    versions,
    ownership_records: ownership,
  })
}
