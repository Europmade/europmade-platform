import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { resolveApprovedSeller } from "../resolve-seller"
import { searchExistingProductCloudProducts } from "../search-existing"
import {
  searchQueryIsEmpty,
  searchQueryIsTooShort,
  normalizeSearchQuery,
} from "../../../../modules/product-cloud/existing-product-search"

/**
 * GET /store/product-cloud/search
 * Find existing Product Cloud products for offer attach (read-only catalog).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const q = typeof req.query.q === "string" ? req.query.q : ""
  const offset =
    typeof req.query.offset === "string" ? Number(req.query.offset) : 0
  const limit =
    typeof req.query.limit === "string" ? Number(req.query.limit) : 20

  if (searchQueryIsEmpty(q) || searchQueryIsTooShort(q)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Vul een zoekterm in (productnaam, merk, EAN, MPN of artikelnummer)."
    )
  }

  const result = await searchExistingProductCloudProducts({
    container: req.scope,
    sellerId: seller.id,
    q: normalizeSearchQuery(q),
    offset: Number.isFinite(offset) ? offset : 0,
    limit: Number.isFinite(limit) ? limit : 20,
  })

  res.json(result)
}
