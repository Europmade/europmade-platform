import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { FINANCE_MODULE } from "../../../../../../modules/finance"
import type FinanceModuleService from "../../../../../../modules/finance/service"
import { PARTNER_MODULE } from "../../../../../../modules/partner"
import type PartnerModuleService from "../../../../../../modules/partner/service"
import { MedusaError } from "@medusajs/framework/utils"

/**
 * GET /store/finance/seller/invoices/:id — invoice detail with lines.
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

  try {
    const invoice = await finance.retrieveSellerInvoice(req.params.id)
    if (invoice.seller_id !== seller.id) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Access denied")
    }

    const lines = await finance.listSellerInvoiceLines(
      { invoice_id: invoice.id },
      { take: 500 }
    )

    res.status(200).json({
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        due_date: invoice.due_date,
        currency: invoice.currency,
        subtotal: Number(invoice.subtotal),
        vat_amount: Number(invoice.vat_amount),
        total: Number(invoice.total),
        vat_regime: invoice.vat_regime,
        status: invoice.status,
        pdf_url: invoice.pdf_url,
        specification_url: invoice.specification_url,
        credit_of_invoice_id: invoice.credit_of_invoice_id,
        settlement_id: invoice.settlement_id ?? null,
        snapshot: invoice.snapshot,
      },
      lines: lines.map((l) => ({
        id: l.id,
        line_type: l.line_type,
        description: l.description,
        source_ref: l.source_ref,
        source_type: l.source_type,
        quantity: l.quantity,
        unit_price: Number(l.unit_price),
        commission_pct: l.commission_pct,
        net_amount: Number(l.net_amount),
        vat_rate: l.vat_rate,
        vat_amount: Number(l.vat_amount),
        gross_amount: Number(l.gross_amount),
      })),
    })
    return
  } catch {
    // Fallback for legacy P2.17 data stored in finance.invoice.
    const legacy = await finance.retrieveInvoice(req.params.id)
    if (
      !legacy ||
      legacy.seller_id !== seller.id ||
      legacy.invoice_type !== "Seller-commissiefactuur"
    ) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Access denied")
    }

    const subtotal = Number(legacy.amount_excl_vat)
    const total = Number(legacy.total_amount)
    const vatAmount = Math.max(0, total - subtotal)

    res.status(200).json({
      invoice: {
        id: legacy.id,
        invoice_number: legacy.id,
        invoice_date: legacy.issued_at,
        period_start: legacy.issued_at,
        period_end: legacy.issued_at,
        due_date: legacy.issued_at,
        currency: "EUR",
        subtotal,
        vat_amount: vatAmount,
        total,
        vat_regime: "VAT_STANDARD_NL",
        status: "issued",
        pdf_url: legacy.pdf_url,
        specification_url: null,
        credit_of_invoice_id: legacy.credit_of_invoice_id,
        settlement_id: null,
        snapshot: null,
      },
      lines: [
        {
          id: `${legacy.id}_line_1`,
          line_type: "commission",
          description: "Seller-commissiefactuur",
          source_ref: legacy.order_id,
          source_type: "order",
          quantity: 1,
          unit_price: subtotal,
          commission_pct: null,
          net_amount: subtotal,
          vat_rate: subtotal > 0 ? vatAmount / subtotal : 0,
          vat_amount: vatAmount,
          gross_amount: total,
        },
      ],
    })
  }
}
