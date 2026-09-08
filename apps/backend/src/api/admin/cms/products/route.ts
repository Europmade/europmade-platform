import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import { serializeCmsProduct } from "../../../cms/serialize"

function isMissingTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes("cms_product") && msg.includes("does not exist")
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  try {
    const rows = await cms.listCmsProducts(
      {},
      { order: { updated_at: "DESC" }, take: 200 }
    )
    res.status(200).json({
      products: rows.map((r) =>
        serializeCmsProduct(r as unknown as Record<string, unknown>)
      ),
    })
  } catch (err) {
    if (isMissingTable(err)) {
      res.status(200).json({ products: [] })
      return
    }
    throw err
  }
}
