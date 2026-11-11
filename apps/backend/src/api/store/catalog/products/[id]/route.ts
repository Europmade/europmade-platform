import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { loadCatalogProductDetail } from "../../catalog-helpers"
import { loadTestCatalogProductDetail } from "../../test-catalog"

type RouteParams = { id: string }

/**
 * GET /store/catalog/products/:id — publieke PDP-payload.
 * Product Cloud + Buy Box (Commerce Cloud) + Offer-commercieel + Review-service.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as RouteParams
  if (!id?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "product id is verplicht."
    )
  }

  const region_code =
    typeof req.query.region_code === "string" ? req.query.region_code : "NL"

  const loaded = await loadCatalogProductDetail(req.scope, id.trim(), region_code)
  if (!loaded) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Product niet gevonden of niet gepubliceerd."
    )
  }

  let detail = loaded
  if (loaded.availability === "not_published") {
    const testProduct = await loadTestCatalogProductDetail(req.scope, id.trim()).catch(() => null)
    if (testProduct) {
      const demo = testProduct.demo_offer
      detail = {
        ...loaded,
        test_catalog: true,
        offers: demo
          ? [
              {
                offer_id: demo.offer_id,
                seller_id: demo.seller_id,
                seller_name: demo.seller_name,
                seller_slug: demo.seller_slug,
                base_price: demo.base_price,
                shipping_cost: demo.shipping_cost,
                total_price: demo.total_price,
                regular_total_price: null,
                promo_active: false,
                quantity_available: demo.quantity_available,
                rank: 1,
                is_winner: true,
                score: 0,
                affiliate_commission_percent: null,
                affiliate_earnings: null,
              },
            ]
          : loaded.offers,
        product: {
          ...loaded.product,
          title: testProduct.title,
          description: testProduct.description,
          brand_name: testProduct.brand_name,
          category_names: testProduct.category_names,
          identifier_type: testProduct.identifier_type,
          identifier_value: testProduct.identifier_value,
          image_url: testProduct.image_url,
          media: testProduct.media,
          attributes: testProduct.attributes,
        },
      }
      res.setHeader("Cache-Control", "private, no-store")
    }
  }

  res.status(200).json(detail)
}
