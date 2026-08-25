import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { FINANCE_MODULE } from "../../../../../../modules/finance"
import type FinanceModuleService from "../../../../../../modules/finance/service"
import { PARTNER_MODULE } from "../../../../../../modules/partner"
import type PartnerModuleService from "../../../../../../modules/partner/service"
import { serializeSellerSettlement } from "../../../../../../modules/finance/serialize-settlement"

/**
 * GET /store/finance/seller/settlements/:id — own settlement + invoice.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const finance = req.scope.resolve(FINANCE_MODULE) as FinanceModuleService

  const [seller] = await partner.listSellers({
    customer_id: req.auth_context.actor_id,
  })
  if (!seller) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Not a seller")
  }

  const settlement = await finance.retrieveSellerSettlement(req.params.id)
  if (settlement.seller_id !== seller.id) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Access denied")
  }

  let invoice = null
  let lines: unknown[] = []
  if (settlement.invoice_id) {
    const inv = await finance.retrieveSellerInvoice(settlement.invoice_id)
    const invLines = await finance.listSellerInvoiceLines(
      { invoice_id: inv.id },
      { take: 500 }
    )
    invoice = {
      id: inv.id,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      status: inv.status,
      subtotal: Number(inv.subtotal),
      vat_amount: Number(inv.vat_amount),
      total: Number(inv.total),
      vat_regime: inv.vat_regime,
      pdf_url: inv.pdf_url,
      settlement_id: inv.settlement_id ?? settlement.id,
    }
    lines = invLines.map((l) => ({
      id: l.id,
      line_type: l.line_type,
      description: l.description,
      net_amount: Number(l.net_amount),
      vat_amount: Number(l.vat_amount),
      gross_amount: Number(l.gross_amount),
    }))
  }

  res.status(200).json({
    settlement: serializeSellerSettlement(settlement),
    invoice,
    lines,
  })
}
