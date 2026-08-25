import type FinanceModuleService from "../../../modules/finance/service"
import { serializeSellerSettlement } from "../../../modules/finance/serialize-settlement"

export async function loadInvoiceBundle(
  finance: FinanceModuleService,
  invoiceId: string
) {
  const invoice = await finance.retrieveSellerInvoice(invoiceId)
  const lines = await finance.listSellerInvoiceLines(
    { invoice_id: invoice.id },
    { take: 500 }
  )
  return {
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
      settlement_id: invoice.settlement_id ?? null,
      credit_of_invoice_id: invoice.credit_of_invoice_id,
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
  }
}

export { serializeSellerSettlement }
