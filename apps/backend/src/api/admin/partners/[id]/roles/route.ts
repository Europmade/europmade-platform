import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"
import {
  normalizeRoleFlags,
  serializePartnerAccess,
} from "../../../../../modules/partner/permissions"
import { AdminPatchPartnerRolesBody } from "../../validators"

type RouteParams = { id: string }

/**
 * PATCH /admin/partners/:id/roles — admin past Partner-rollen aan (ADR-0041).
 */
export async function PATCH(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const body = AdminPatchPartnerRolesBody.parse(
    (req as { validatedBody?: unknown }).validatedBody ?? req.body ?? {}
  )

  let seller: Awaited<ReturnType<PartnerModuleService["retrieveSeller"]>>
  try {
    seller = await partner.retrieveSeller(id)
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Partner niet gevonden."
    )
  }

  const is_brand_owner =
    body.is_brand_owner ??
    Boolean((seller as { is_brand_owner?: boolean }).is_brand_owner)
  const is_producer =
    body.is_producer ??
    Boolean((seller as { is_producer?: boolean }).is_producer)
  const next = normalizeRoleFlags({
    is_retailer: body.is_retailer ?? seller.is_retailer,
    is_distributor: body.is_distributor ?? seller.is_distributor,
    is_brand_owner,
    is_producer,
    is_producer_or_brand_owner: is_brand_owner || is_producer,
  })

  if (
    !next.is_retailer &&
    !next.is_brand_owner &&
    !next.is_producer &&
    !next.is_distributor
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Kies ten minste één rol."
    )
  }

  const updated = await partner.updateSellers({
    id: seller.id,
    is_retailer: next.is_retailer,
    is_distributor: next.is_distributor,
    is_brand_owner: next.is_brand_owner,
    is_producer: next.is_producer,
    is_producer_or_brand_owner: next.is_producer_or_brand_owner,
  })

  res.status(200).json({
    partner: {
      id: updated.id,
      ...serializePartnerAccess(updated),
    },
  })
}
