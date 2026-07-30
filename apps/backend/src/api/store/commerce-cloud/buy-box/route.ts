import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { resolveApprovedSeller } from "../../product-cloud/resolve-seller"
import { loadBuyBoxForIdentifier } from "../buy-box-helpers"

/**
 * Server-side Buy Box-resultaat (ADR-0005) voor identifier × regio.
 * Herberekent en persisteert cache (C.4).
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

  if (!identifierId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "identifier_id is verplicht."
    )
  }

  const buy_box = await loadBuyBoxForIdentifier(
    req.scope,
    identifierId,
    regionCode
  )

  res.json({ buy_box })
}
