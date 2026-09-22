import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { VERIFICATION_MODULE } from "../../../../modules/verification"
import type VerificationModuleService from "../../../../modules/verification/service"
import {
  serializeEuropeanOwnershipClaim,
  type EuropeanOwnershipClaimRow,
} from "../../../store/product-cloud/european-ownership-helpers"

/**
 * GET /admin/product-cloud/european-ownership?status=
 * Queue of European ownership claims for review.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const verification = req.scope.resolve(
    VERIFICATION_MODULE
  ) as VerificationModuleService
  const status = String(req.query?.status || "all").trim()
  const filter: Record<string, unknown> = {}
  if (status && status !== "all") {
    filter.status = status
  }

  const claims = (await verification.listEuropeanOwnershipClaims(filter, {
    order: { updated_at: "DESC" },
    take: 200,
  })) as EuropeanOwnershipClaimRow[]

  res.json({
    claims: claims.map(serializeEuropeanOwnershipClaim),
    count: claims.length,
  })
}
