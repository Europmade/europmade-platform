import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { CategoryCmsDocumentV2, CategoryCmsProfile } from "@europmade/utils"
import { CMS_MODULE } from "../../../../../../../../modules/cms"
import type CmsModuleService from "../../../../../../../../modules/cms/service"
import { cmsProposalRepository } from "../../../../../../../../modules/cms/category-cms-proposal-db"
import { acceptStoredCategoryProposal } from "../../../../../../../../modules/cms/category-cms-proposal-store"
import { slugOf, actorId, sendCategoryPd, sendPdError, type CatSlugReq } from "../../../../category-pd-http"
import { requireCategoryProfile } from "../../../../resolve-category-profile"
import { assertDraftRevision } from "../../../../../../../../modules/cms/category-published-draft"

type ProposalReq = MedusaRequest & { params: { slug: string; id: string } }

/** POST /admin/cms/categories/:slug/proposals/:id/accept */
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
  const draft = (row?.draft_document ?? null) as CategoryCmsDocumentV2 | null
  const expected = (req.body as { expected_draft_revision?: unknown } | undefined)?.expected_draft_revision
  try {
    if (row?.draft_document != null) assertDraftRevision(row, expected)
    const profile = await requireCategoryProfile(req.scope, slug)
    const decision = await acceptStoredCategoryProposal({
      proposal,
      draft,
      draftRevision: row?.draft_revision ?? null,
      saveDraft: async (document) => {
        await cms.saveCategoryDraft({
          slug,
          document,
          expectedDraftRevision: expected,
          actorId: actorId(req),
          profile: profile as CategoryCmsProfile,
        })
      },
      saveProposal: (next) => repo.update(next),
    })
    if (!decision.applied) {
      res.status(200).json(decision)
      return
    }
    const fresh = await cms.getCategoryBySlug(slug)
    if (fresh) {
      await sendCategoryPd(res, fresh as unknown as Record<string, unknown>, {
        scope: req.scope,
        slug,
        req,
      })
      return
    }
    res.status(200).json({ ...decision, category: null })
  } catch (err) {
    if (sendPdError(res, err)) return
    throw err
  }
}
