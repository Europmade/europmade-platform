import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { REVIEW_MODULE } from "../../../../../modules/review"
import type ReviewModuleService from "../../../../../modules/review/service"

type RouteParams = { id: string }

/**
 * GET /store/catalog/products/:id — dunne publieke productweergave + reviews (ADR-0027).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as RouteParams
  if (!id?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "product id is verplicht."
    )
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const reviews = req.scope.resolve(REVIEW_MODULE) as ReviewModuleService

  let product: Awaited<ReturnType<ProductCloudModuleService["retrieveProduct"]>>
  try {
    product = await productCloud.retrieveProduct(id)
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Product niet gevonden."
    )
  }

  const versions = await productCloud.listProductVersions(
    { product_id: id, publication_status: "Gepubliceerd" },
    { order: { created_at: "DESC" }, take: 1 }
  )
  const title = versions[0]?.title ?? "Product"

  const productReviews = await reviews.listReviews(
    { product_id: id, review_type: "Productreview" },
    { order: { created_at: "DESC" }, take: 50 }
  )

  res.status(200).json({
    product: {
      id: product.id,
      title,
      lifecycle_status: product.lifecycle_status,
    },
    reviews: productReviews.map((r) => ({
      id: r.id,
      score: Number(r.score),
      text: r.text,
      created_at: r.created_at,
      review_type: r.review_type,
    })),
  })
}
