import type { MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../../modules/cms"
import type CmsModuleService from "../../../../../../modules/cms/service"
import { cmsProposalRepository } from "../../../../../../modules/cms/category-cms-proposal-db"
import { slugOf, type CatSlugReq } from "../../category-pd-http"

/** GET /admin/cms/categories/:slug/proposals */
export async function GET(req: CatSlugReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const slug = slugOf(req)
  const repo = cmsProposalRepository(cms)
  const [proposals, costs] = await Promise.all([repo.list(slug), repo.listCosts(slug)])
  res.status(200).json({ proposals, costs })
}
