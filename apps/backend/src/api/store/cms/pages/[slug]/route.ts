import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requestBackendOrigin } from "../../../../request-backend-origin"
import { CMS_MODULE } from "../../../../../modules/cms"
import type CmsModuleService from "../../../../../modules/cms/service"
import { serializePage } from "../../../../cms/serialize"

/**
 * GET /store/cms/pages/:slug — alleen gepubliceerd.
 */
export async function GET(
  req: MedusaRequest & { params: { slug: string } },
  res: MedusaResponse
) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const slug = req.params.slug?.trim().toLowerCase()
  const rows = await cms.listCmsPages(
    { slug, published: true },
    { take: 1 }
  )
  const page = rows[0]
  if (!page || !page.visible) {
    res.status(404).json({ message: "Pagina niet gevonden." })
    return
  }
  res.status(200).json({
    page: serializePage(
      page as unknown as Record<string, unknown>,
      requestBackendOrigin(req)
    ),
  })
}
