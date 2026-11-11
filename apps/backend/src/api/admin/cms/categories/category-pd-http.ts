import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CategoryPdError } from "../../../../modules/cms/category-published-draft"
import { withResolvedCategoryMedia } from "../../../cms/category-asset-urls"
import { serializeCmsCategoryPd } from "../../../cms/serialize"
import { requestBackendOrigin } from "../../../request-backend-origin"
import { requireCategoryProfile } from "./resolve-category-profile"

type Scope = { resolve: (key: string) => unknown }

export type CatSlugReq = MedusaRequest & { params: { slug: string } }

export function slugOf(req: CatSlugReq): string {
  return decodeURIComponent(req.params.slug ?? "").trim().toLowerCase()
}

export function actorId(req: MedusaRequest): string | null {
  const auth = (req as { auth_context?: Record<string, unknown> }).auth_context
  if (!auth) return null
  const id = auth.actor_id ?? auth.user_id ?? auth.actorId
  return typeof id === "string" && id ? id : null
}

export function sendPdError(res: MedusaResponse, err: unknown): boolean {
  if (!(err instanceof CategoryPdError)) return false
  res.status(err.httpStatus).json({
    type: err.code,
    message: err.message,
    ...(err.details ? { details: err.details } : {}),
  })
  return true
}

async function taxonomyFor(scope: Scope, slug: string) {
  try {
    return { profile: await requireCategoryProfile(scope, slug), profile_error: null }
  } catch (err) {
    if (err instanceof CategoryPdError) {
      return { profile: null, profile_error: err.code }
    }
    throw err
  }
}

export async function sendCategoryPd(
  res: MedusaResponse,
  row: Record<string, unknown>,
  extra?: {
    restoredFromVersion?: number | null
    scope?: Scope
    slug?: string
    req?: MedusaRequest
  }
) {
  const taxonomy =
    extra?.scope && extra.slug ? await taxonomyFor(extra.scope, extra.slug) : {}
  const serialized = {
    ...serializeCmsCategoryPd(row, {
      restoredFromVersion: extra?.restoredFromVersion ?? null,
    }),
    ...taxonomy,
  }
  const origin = extra?.req ? requestBackendOrigin(extra.req) : "http://localhost:9000"
  const category = await withResolvedCategoryMedia(extra?.scope, serialized, origin)
  res.status(200).json({ category })
}
