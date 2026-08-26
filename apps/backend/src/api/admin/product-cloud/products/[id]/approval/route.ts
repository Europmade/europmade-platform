import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { adminDecideVersionWorkflow } from "../../../../../../workflows/product-cloud"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../../../../modules/partner"
import type PartnerModuleService from "../../../../../../modules/partner/service"
import { buildSellerProductManagerDetail } from "../../../../../store/product-cloud/product-manager"

type RouteParams = { id: string }

const Body = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    reason: z.string().trim().max(2000).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.decision === "rejected" && !val.reason) {
      ctx.addIssue({
        code: "custom",
        message: "Reden is verplicht bij afwijzen.",
        path: ["reason"],
      })
    }
  })

/**
 * POST /admin/product-cloud/products/:id/approval
 * Product approval — not the same as compliance evidence approval.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const parsed = Body.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.issues[0]?.message ||
        "decision moet approved of rejected zijn."
    )
  }

  const actor =
    (req.auth_context as { actor_id?: string } | undefined)?.actor_id ?? "admin"
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const product = await productCloud.retrieveProduct(id)

  if (parsed.data.decision === "approved") {
    let commerce: CommerceCloudModuleService | null = null
    try {
      commerce = req.scope.resolve(COMMERCE_CLOUD_MODULE) as CommerceCloudModuleService
    } catch {
      commerce = null
    }
    let partner: PartnerModuleService | null = null
    try {
      partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
    } catch {
      partner = null
    }
    const detail = await buildSellerProductManagerDetail(
      productCloud,
      commerce,
      id,
      product.current_owner_seller_id,
      partner,
      req.scope
    )
    if (!detail?.completeness.publishable) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        detail?.completeness.publication_blocked_reasons?.[0] ||
          "Product is niet publiceerbaar — keur eerst verplichte documenten goed en controleer completeness."
      )
    }
  }

  const versions = await productCloud.listProductVersions({ product_id: id })
  const pending = versions.find((v: { publication_status: string }) => v.publication_status === "In review")
  if (!pending) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Geen product in wachtrij voor goedkeuring."
    )
  }

  const { result } = await adminDecideVersionWorkflow(req.scope).run({
    input: {
      product_id: id,
      version_id: pending.id,
      actor_id: actor,
      decision: parsed.data.decision,
      reason: parsed.data.reason,
    },
  })

  res.json({
    decision: parsed.data.decision,
    version: result.version,
    lifecycle_status: result.lifecycle_status,
  })
}
