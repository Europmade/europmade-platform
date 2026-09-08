import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../modules/cms"
import type CmsModuleService from "../../../../../modules/cms/service"
import { serializeCmsProduct } from "../../../../cms/serialize"

function isMissingTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes("cms_product") && msg.includes("does not exist")
}

/**
 * GET /store/cms/products/:id — alleen gepubliceerde product-CMS (id = pc_product.id).
 */
export async function GET(
  req: MedusaRequest & { params: { id: string } },
  res: MedusaResponse
) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const productId = decodeURIComponent(req.params.id ?? "").trim()
  try {
    const rows = await cms.listCmsProducts(
      { product_id: productId, published: true },
      { take: 1 }
    )
    const row = rows[0]
    if (!row) {
      res.status(200).json({ product: null })
      return
    }
    res.status(200).json({
      product: serializeCmsProduct(row as unknown as Record<string, unknown>),
    })
  } catch (err) {
    if (isMissingTable(err)) {
      res.status(200).json({ product: null })
      return
    }
    throw err
  }
}
