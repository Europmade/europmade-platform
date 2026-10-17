import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { EU_MARKET_CODES } from "@europmade/types"
import { requestBackendOrigin } from "../../../request-backend-origin"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import {
  asLocalized,
  emptyLocalized,
  serializeHomepage,
} from "../../../cms/serialize"
import {
  DRAFT_HOMEPAGE_KEY,
  LIVE_HOMEPAGE_KEY,
  planHomepageSave,
  resolveHomepageEditor,
} from "./homepage-draft"

async function rowByKey(cms: CmsModuleService, documentKey: string) {
  const rows = await cms.listCmsHomepages(
    { document_key: documentKey },
    { take: 1 }
  )
  return rows[0] ?? null
}

function editorResponse(
  row: Record<string, unknown> | null,
  published: boolean,
  hasDraft: boolean,
  origin: string
) {
  const homepage = row
    ? {
        ...serializeHomepage(row, origin),
        published,
      }
    : null
  return { homepage, has_draft: hasDraft, markets: EU_MARKET_CODES }
}

/**
 * GET /admin/cms/homepage
 * Opens the concept when one exists. `published` follows the live row only.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const live = await rowByKey(cms, LIVE_HOMEPAGE_KEY)
  const draft = await rowByKey(cms, DRAFT_HOMEPAGE_KEY)
  const view = resolveHomepageEditor({
    live,
    draft,
    isLivePublished: Boolean(live?.published),
  })
  res.status(200).json(
    editorResponse(
      (view.editor as unknown as Record<string, unknown> | null) ?? null,
      view.published,
      view.hasDraft,
      requestBackendOrigin(req)
    )
  )
}

/**
 * PUT /admin/cms/homepage
 * Concept: separate draft row, live homepage unchanged.
 * Publish: replace the live row and remove the draft.
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const body = (req.body ?? {}) as Record<string, unknown>
  if (!body.document || typeof body.document !== "object") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "document is verplicht."
    )
  }

  const plan = planHomepageSave(Boolean(body.published))
  const payload = {
    document_key: plan.writeKey,
    document: body.document,
    seo_title: body.seo_title != null ? asLocalized(body.seo_title) : emptyLocalized(),
    seo_description:
      body.seo_description != null
        ? asLocalized(body.seo_description)
        : emptyLocalized(),
    seo_canonical:
      typeof body.seo_canonical === "string" ? body.seo_canonical : "/",
    og_title: body.og_title != null ? asLocalized(body.og_title) : emptyLocalized(),
    og_description:
      body.og_description != null
        ? asLocalized(body.og_description)
        : emptyLocalized(),
    published: plan.writePublished,
  }

  const existing = await rowByKey(cms, plan.writeKey)
  const row = existing
    ? await cms.updateCmsHomepages({ id: existing.id, ...payload })
    : await cms.createCmsHomepages(payload)

  if (plan.deleteDraft) {
    const draft = await rowByKey(cms, DRAFT_HOMEPAGE_KEY)
    if (draft) await cms.deleteCmsHomepages(draft.id)
  }

  const live = plan.touchLive ? row : await rowByKey(cms, LIVE_HOMEPAGE_KEY)
  res.status(200).json(
    editorResponse(
      row as unknown as Record<string, unknown>,
      Boolean(live?.published),
      !plan.deleteDraft,
      requestBackendOrigin(req)
    )
  )
}
