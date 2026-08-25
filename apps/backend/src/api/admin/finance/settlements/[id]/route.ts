import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { FINANCE_MODULE } from "../../../../../modules/finance"
import type FinanceModuleService from "../../../../../modules/finance/service"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"
import {
  loadInvoiceBundle,
  serializeSellerSettlement,
} from "../../settlement-serialize"

/**
 * GET /admin/finance/settlements/:id
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const finance = req.scope.resolve(FINANCE_MODULE) as FinanceModuleService
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const settlement = await finance.retrieveSellerSettlement(req.params.id)
  if (!settlement) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Settlement not found")
  }

  let sellerName = settlement.seller_id
  try {
    const seller = await partner.retrieveSeller(settlement.seller_id)
    sellerName = seller.id
  } catch {
    // keep id
  }

  let invoice = null
  let lines: unknown[] = []
  if (settlement.invoice_id) {
    const bundle = await loadInvoiceBundle(finance, settlement.invoice_id)
    invoice = bundle.invoice
    lines = bundle.lines
  }

  res.status(200).json({
    settlement: {
      ...serializeSellerSettlement(settlement),
      seller_name: sellerName,
    },
    invoice,
    lines,
  })
}
