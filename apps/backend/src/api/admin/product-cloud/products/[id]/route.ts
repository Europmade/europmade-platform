import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"

type RouteParams = { id: string }

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const product = await productCloud.retrieveProduct(id)
  const versions = await productCloud.listProductVersions(
    { product_id: id },
    { relations: ["media_items"] }
  )
  const ownership = await productCloud.listOwnershipRecords({
    product_id: id,
  })
  const claims = await productCloud.listClaims({ product_id: id })
  const proposals = await productCloud.listChangeProposals({
    product_id: id,
  })

  res.json({
    product,
    versions,
    ownership_records: ownership,
    claims,
    change_proposals: proposals,
  })
}
