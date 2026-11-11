import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { CategoryCmsDocumentV2 } from "@europmade/utils"
import { CMS_MODULE } from "../../../../../../../modules/cms"
import type CmsModuleService from "../../../../../../../modules/cms/service"
import { cmsProposalRepository } from "../../../../../../../modules/cms/category-cms-proposal-db"
import { modifyStoredCategoryProposal } from "../../../../../../../modules/cms/category-cms-proposal-store"
import type { CategoryCmsProposalContent } from "../../../../../../../modules/cms/category-cms-proposals"
import { slugOf, type CatSlugReq } from "../../../category-pd-http"

type ProposalReq = MedusaRequest & { params: { slug: string; id: string } }

/** PATCH /admin/cms/categories/:slug/proposals/:id  Body: { content } */
export async function PATCH(req: ProposalReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const slug = slugOf(req as CatSlugReq)
  const repo = cmsProposalRepository(cms)
  const proposal = (await repo.list(slug)).find((row) => row.id === req.params.id)
  if (!proposal) {
    res.status(404).json({ type: "proposal_not_found", message: "Voorstel niet gevonden." })
    return
  }
  const content = (req.body as { content?: CategoryCmsProposalContent } | undefined)?.content
  if (!content?.nl || !content.en || !content.de || !content.fr) {
    res.status(400).json({
      type: "content_locales",
      message: "Content moet nl, en, de en fr bevatten.",
    })
    return
  }
  const saved = await modifyStoredCategoryProposal({
    proposal,
    content,
    saveProposal: (next) => repo.update(next),
  })
  res.status(200).json({ proposal: saved, published: false })
}
