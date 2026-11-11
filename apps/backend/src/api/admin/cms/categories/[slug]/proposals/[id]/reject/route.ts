import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { CategoryCmsDocumentV2 } from "@europmade/utils"
import { CMS_MODULE } from "../../../../../../../../modules/cms"
import type CmsModuleService from "../../../../../../../../modules/cms/service"
import { cmsProposalRepository } from "../../../../../../../../modules/cms/category-cms-proposal-db"
import { rejectStoredCategoryProposal } from "../../../../../../../../modules/cms/category-cms-proposal-store"
import { slugOf, type CatSlugReq } from "../../../../category-pd-http"

type ProposalReq = MedusaRequest & { params: { slug: string; id: string } }

/** POST /admin/cms/categories/:slug/proposals/:id/reject */
export async function POST(req: ProposalReq, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const slug = slugOf(req as CatSlugReq)
  const repo = cmsProposalRepository(cms)
  const proposal = (await repo.list(slug)).find((row) => row.id === req.params.id)
  if (!proposal) {
    res.status(404).json({ type: "proposal_not_found", message: "Voorstel niet gevonden." })
    return
  }
  const row = await cms.getCategoryBySlug(slug)
  const before = JSON.stringify(row?.draft_document ?? null)
  const decision = await rejectStoredCategoryProposal({
    proposal,
    draft: (row?.draft_document ?? null) as CategoryCmsDocumentV2 | null,
    saveDraft: async () => {
      throw new Error("Afwijzen schrijft de draft niet.")
    },
    saveProposal: (next) => repo.update(next),
  })
  const after = await cms.getCategoryBySlug(slug)
  if (JSON.stringify(after?.draft_document ?? null) !== before) {
    throw new Error("Afwijzen heeft de draft gewijzigd.")
  }
  res.status(200).json(decision)
}
