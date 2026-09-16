import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { FINANCE_MODULE } from "../../../../../modules/finance"
import type FinanceModuleService from "../../../../../modules/finance/service"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"
import { MedusaError } from "@medusajs/framework/utils"

/**
 * GET /store/finance/seller/invoices — seller's EuropMade invoices.
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

  const sellerInvoices = await finance.listSellerInvoices(
    { seller_id: seller.id },
    { take: 200, order: { invoice_date: "DESC" } }
  )

  if (sellerInvoices.length > 0) {
    res.status(200).json({
      invoices: sellerInvoices.map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        period_start: inv.period_start,
        period_end: inv.period_end,
        period: `${new Date(inv.period_start).toISOString().slice(0, 10)}..${new Date(inv.period_end).toISOString().slice(0, 10)}`,
        due_date: inv.due_date,
        currency: inv.currency,
        subtotal: Number(inv.subtotal),
        vat_amount: Number(inv.vat_amount),
        total: Number(inv.total),
        vat_regime: inv.vat_regime,
        status: inv.status,
        pdf_url: inv.pdf_url,
        specification_url: inv.specification_url,
        credit_of_invoice_id: inv.credit_of_invoice_id,
        settlement_id: null,
        settlement_id: inv.settlement_id ?? null,
      })),
    })
    return
  }

  // Backward-compatible fallback for pre-P2.17.4 data:
  // expose legacy Seller-commissiefactuur records when seller_invoice is empty.
  const legacyInvoices = await finance.listInvoices(
    {
      seller_id: seller.id,
      invoice_type: "Seller-commissiefactuur",
    },
    { take: 200, order: { issued_at: "DESC" } }
  )

  res.status(200).json({
    invoices: legacyInvoices.map((inv) => ({
      id: inv.id,
      invoice_number: inv.id,
      invoice_date: inv.issued_at,
      period_start: inv.issued_at,
      period_end: inv.issued_at,
      period: inv.period ?? new Date(inv.issued_at).toISOString().slice(0, 10),
      due_date: inv.issued_at,
      currency: "EUR",
      subtotal: Number(inv.amount_excl_vat),
      vat_amount: Math.max(
        0,
        Number(inv.total_amount) - Number(inv.amount_excl_vat)
      ),
      total: Number(inv.total_amount),
      vat_regime: "VAT_STANDARD_NL",
      status: "issued",
      pdf_url: inv.pdf_url,
      specification_url: null,
      credit_of_invoice_id: inv.credit_of_invoice_id,
      settlement_id: null,
    })),
  })
}
