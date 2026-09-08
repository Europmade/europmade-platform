import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../modules/cms"
import type CmsModuleService from "../../../../../modules/cms/service"
import { serializeCmsProduct } from "../../../../cms/serialize"

type ProdReq = MedusaRequest & { params: { id: string } }

function isMissingTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes("cms_product") && msg.includes("does not exist")
}

export async function GET(req: ProdReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const productId = decodeURIComponent(req.params.id ?? "").trim()
  try {
    const rows = await cms.listCmsProducts({ product_id: productId }, { take: 1 })
    const row = rows[0] ?? null
    res.status(200).json({
      product: row
        ? serializeCmsProduct(row as unknown as Record<string, unknown>)
        : {
            id: null,
            product_id: productId,
            document: {},
            published: false,
            i18n_meta: null,
          },
    })
  } catch (err) {
    if (isMissingTable(err)) {
      res.status(200).json({
        product: {
          id: null,
          product_id: productId,
          document: {},
          published: false,
          i18n_meta: null,
        },
      })
      return
    }
    throw err
  }
}

export async function PUT(req: ProdReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const productId = decodeURIComponent(req.params.id ?? "").trim()
  const body = (req.body ?? {}) as Record<string, unknown>
  const payload = {
    product_id: productId,
    document:
      body.document && typeof body.document === "object" ? body.document : {},
    published: Boolean(body.published),
    i18n_meta:
      body.i18n_meta && typeof body.i18n_meta === "object"
        ? body.i18n_meta
        : null,
  }
  const existing = (
    await cms.listCmsProducts({ product_id: productId }, { take: 1 })
  )[0]
  const row = existing
    ? await cms.updateCmsProducts({ id: existing.id, ...payload })
    : await cms.createCmsProducts(payload)
  res.status(200).json({
    product: serializeCmsProduct(row as unknown as Record<string, unknown>),
  })
}
