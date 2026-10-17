import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"
import {
  ApprovalRejected,
  runBulkProductApproval,
} from "../../../../../modules/product-cloud/product-approval-decision"
import { buildAdminApprovalDeps } from "../approval-deps"

const Body = z.object({
  mode: z.enum(["selected", "relation", "choices"]),
  product_ids: z.array(z.string().trim().min(1)).max(200).optional(),
  brand_id: z.string().trim().min(1).optional(),
  manufacturer_id: z.string().trim().min(1).optional(),
  dry_run: z.boolean().optional(),
})

/**
 * POST /admin/product-cloud/products/bulk-approval
 * Preview or approve products with the individual approval gates.
 * Does not create manufacturers and does not write offers.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const parsed = Body.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.issues[0]?.message || "Ongeldige bulkgoedkeuring."
    )
  }

  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  if (parsed.data.mode === "choices") {
    const [brands, manufacturers] = await Promise.all([
      partner.listBrands({}, { take: 500, order: { name: "ASC" } }).catch(() => []),
      partner.listManufacturers({}, { take: 500, order: { name: "ASC" } }).catch(() => []),
    ])
    res.json({
      mode: "choices",
      brands: (brands as Array<{ id: string; name?: string | null }>).map((row) => ({
        id: row.id,
        name: row.name?.trim() || row.id,
      })),
      manufacturers: (manufacturers as Array<{ id: string; name?: string | null }>).map(
        (row) => ({
          id: row.id,
          name: row.name?.trim() || row.id,
        })
      ),
    })
    return
  }

  const actor =
    (req.auth_context as { actor_id?: string } | undefined)?.actor_id ?? "admin"
  try {
    const report = await runBulkProductApproval(buildAdminApprovalDeps(req.scope), {
      mode: parsed.data.mode,
      product_ids: parsed.data.product_ids,
      brand_id: parsed.data.brand_id,
      manufacturer_id: parsed.data.manufacturer_id,
      dry_run: parsed.data.dry_run,
      actor_id: actor,
    })
    res.json(report)
  } catch (err) {
    if (err instanceof ApprovalRejected) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, err.message)
    }
    throw err
  }
}
