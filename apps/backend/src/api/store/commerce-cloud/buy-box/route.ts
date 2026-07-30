import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { resolveApprovedSeller } from "../../product-cloud/resolve-seller"
import {
  loadBuyBoxForIdentifier,
  loadCachedWinner,
} from "../buy-box-helpers"

/**
 * Server-side Buy Box-resultaat (ADR-0005 / ADR-0020).
 * Default: read-through recompute. `prefer_cache=true`: C.4 winner-only.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  await resolveApprovedSeller(req.scope, req.auth_context.actor_id)

  const identifierId =
    typeof req.query.identifier_id === "string"
      ? req.query.identifier_id.trim()
      : ""
  const regionCode =
    typeof req.query.region_code === "string"
      ? req.query.region_code.trim()
      : "NL"
  const preferCache =
    req.query.prefer_cache === "true" || req.query.prefer_cache === "1"

  if (!identifierId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "identifier_id is verplicht."
    )
  }

  if (preferCache) {
    const cached = await loadCachedWinner(
      req.scope,
      identifierId,
      regionCode
    )
    if (cached) {
      res.json({ buy_box: cached })
      return
    }
  }

  const buy_box = await loadBuyBoxForIdentifier(
    req.scope,
    identifierId,
    regionCode
  )

  res.json({
    buy_box: {
      source: "recompute",
      ...buy_box,
    },
  })
}
