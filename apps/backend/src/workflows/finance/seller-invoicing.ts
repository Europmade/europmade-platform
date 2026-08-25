/**
 * P2.17 / G3 — EuropMade → Seller dienstenfactuur helpers.
 * Period close: zie seller-period-close.ts
 * VAT-regimes: bestaande configuratie, geen fiscale goedkeuring.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FINANCE_MODULE } from "../../modules/finance"
import type FinanceModuleService from "../../modules/finance/service"
import { PARTNER_MODULE } from "../../modules/partner"
import type PartnerModuleService from "../../modules/partner/service"
import PDFDocument from "pdfkit"
import { closeSellerFinancePeriod } from "./seller-period-close"

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

const EUROPMADE_DETAILS = {
  company_name: "EuropMade B.V.",
  address: "Keizersgracht 100, 1015 AA Amsterdam",
  country: "NL",
  kvk: "90123456",
  vat_number: "NL862345678B01",
}

type VatRegime = "VAT_STANDARD_NL" | "VAT_REVERSE_CHARGE_EU" | "VAT_OUT_OF_SCOPE"

export function determineVatRegime(
  sellerCountry: string | null | undefined,
  sellerVatNumber: string | null | undefined
): { regime: VatRegime; rate: number; reverseChargeNote: string | null } {
  const country = (sellerCountry || "NL").toUpperCase()
  if (country === "NL") {
    return { regime: "VAT_STANDARD_NL", rate: 0.21, reverseChargeNote: null }
  }
  const euCountries = [
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "PL",
    "PT", "RO", "SK", "SI", "ES", "SE",
  ]
  if (euCountries.includes(country) && sellerVatNumber) {
    return {
      regime: "VAT_REVERSE_CHARGE_EU",
      rate: 0,
      reverseChargeNote: "VAT reverse-charged — Art. 196 Council Directive 2006/112/EC",
    }
  }
  if (!euCountries.includes(country)) {
    return { regime: "VAT_OUT_OF_SCOPE", rate: 0, reverseChargeNote: null }
  }
  return { regime: "VAT_STANDARD_NL", rate: 0.21, reverseChargeNote: null }
}

export async function getNextInvoiceNumber(
  container: MedusaContainer
): Promise<string> {
  const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as {
    raw: (
      sql: string,
      bindings?: unknown[]
    ) => Promise<{ rows?: Array<Record<string, unknown>> }>
  }
  const result = await pg.raw(
    "SELECT nextval('seller_invoice_number_seq') AS seq"
  )
  const seq = Number(result?.rows?.[0]?.seq ?? 1)
  const year = new Date().getFullYear()
  return `EM-${year}-${String(seq).padStart(6, "0")}`
}

export type InvoiceLineInput = {
  line_type: string
  description: string
  source_ref?: string | null
  source_type?: string | null
  quantity: number
  unit_price: number
  commission_pct?: number | null
  net_amount: number
  vat_rate: number
  vat_amount: number
  gross_amount: number
}

/**
 * G3 — period close (settlement + dienstenfactuur).
 */
export async function generateMonthlySellerInvoice(
  container: MedusaContainer,
  sellerId: string,
  periodStart: Date,
  periodEnd: Date
) {
  return closeSellerFinancePeriod(container, sellerId, periodStart, periodEnd)
}

export async function generateCreditNote(
  container: MedusaContainer,
  originalInvoiceId: string,
  reason: string
) {
  const finance = container.resolve(FINANCE_MODULE) as FinanceModuleService
  const original = await finance.retrieveSellerInvoice(originalInvoiceId)

  if (original.status === "cancelled" || original.status === "credited") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Cannot credit an already cancelled/credited invoice."
    )
  }

  const invoiceNumber = await getNextInvoiceNumber(container)
  const snapshot = original.snapshot as any
  const negSubtotal = roundMoney(-Math.abs(Number(original.subtotal)))
  const negVat = roundMoney(-Math.abs(Number(original.vat_amount)))
  const negTotal = roundMoney(-Math.abs(Number(original.total)))

  const creditInvoice = await finance.createSellerInvoices({
    seller_id: original.seller_id,
    invoice_number: invoiceNumber,
    invoice_date: new Date(),
    period_start: new Date(original.period_start),
    period_end: new Date(original.period_end),
    due_date: new Date(),
    currency: original.currency,
    subtotal: negSubtotal,
    vat_amount: negVat,
    total: negTotal,
    vat_regime: original.vat_regime,
    status: "issued",
    pdf_url: null,
    specification_url: null,
    credit_of_invoice_id: original.id,
    settlement_id: original.settlement_id ?? null,
    snapshot: {
      ...snapshot,
      credit_reason: reason,
      original_invoice_number: original.invoice_number,
    },
  })

  await finance.createSellerInvoiceLines({
    invoice_id: creditInvoice.id,
    line_type: "credit",
    description: `Credit note: ${reason} (ref: ${original.invoice_number})`,
    source_ref: original.id,
    source_type: "invoice",
    quantity: 1,
    unit_price: 0,
    net_amount: negSubtotal,
    vat_rate: snapshot?.vat_rate ?? 0,
    vat_amount: negVat,
    gross_amount: negTotal,
    commission_pct: null,
  })

  await finance.updateSellerInvoices({
    id: original.id,
    status: "credited",
  })

  return {
    credit_invoice_id: creditInvoice.id,
    credit_invoice_number: invoiceNumber,
  }
}

export async function runMonthlyInvoicing(
  container: MedusaContainer,
  year: number,
  month: number
) {
  const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
  const sellers = await partner.listSellers(
    { onboarding_status: "Goedgekeurd" },
    { take: 5000 }
  )

  const periodStart = new Date(Date.UTC(year, month - 1, 1))
  const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))

  const results: Array<{ seller_id: string; result: any }> = []
  for (const seller of sellers) {
    try {
      const result = await generateMonthlySellerInvoice(
        container,
        seller.id,
        periodStart,
        periodEnd
      )
      results.push({ seller_id: seller.id, result })
    } catch (err: any) {
      results.push({
        seller_id: seller.id,
        result: { error: err.message },
      })
    }
  }
  return { period: `${year}-${String(month).padStart(2, "0")}`, results }
}

export async function generateInvoicePdf(
  invoice: any,
  lines: InvoiceLineInput[],
  snapshot: any
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, compress: false })
    const chunks: Buffer[] = []
    doc.on("data", (c) => chunks.push(c as Buffer))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    doc.fontSize(20).fillColor("#000").text("EuropMade", { align: "left" })
    doc.moveDown(0.3)
    doc.fontSize(14).fillColor("#333").text("FACTUUR / INVOICE")
    doc.moveDown(1)

    const em = snapshot.europmade ?? EUROPMADE_DETAILS
    doc.fontSize(9).fillColor("#555")
    doc.text(`${em.company_name}`)
    doc.text(`${em.address}`)
    doc.text(`KvK: ${em.kvk}`)
    doc.text(`BTW-nr: ${em.vat_number}`)
    doc.moveDown(0.8)

    const sel = snapshot.seller ?? {}
    doc.fontSize(10).fillColor("#000").text("Aan / To:", { underline: true })
    doc.fontSize(9).fillColor("#555")
    if (sel.company_name) doc.text(sel.company_name)
    if (sel.address) doc.text(sel.address)
    if (sel.vat_number) doc.text(`BTW-nr: ${sel.vat_number}`)
    doc.moveDown(0.8)

    doc.fontSize(10).fillColor("#000")
    doc.text(`Factuurnummer: ${invoice.invoice_number ?? snapshot.invoice_number}`)
    doc.text(`Factuurdatum: ${new Date(invoice.invoice_date).toLocaleDateString("nl-NL")}`)
    doc.text(`Periode: ${new Date(invoice.period_start).toLocaleDateString("nl-NL")} - ${new Date(invoice.period_end).toLocaleDateString("nl-NL")}`)
    doc.text(`Vervaldatum: ${new Date(invoice.due_date).toLocaleDateString("nl-NL")}`)
    doc.text(`Valuta: EUR`)
    doc.moveDown(1)

    doc.fontSize(10).fillColor("#000").text("Factuurregels / Line items", { underline: true })
    doc.moveDown(0.5)

    const tableTop = doc.y
    doc.fontSize(8)
    doc.text("Omschrijving", 50, tableTop, { width: 250 })
    doc.text("Netto", 310, tableTop, { width: 70, align: "right" })
    doc.text("BTW", 385, tableTop, { width: 60, align: "right" })
    doc.text("Bruto", 450, tableTop, { width: 80, align: "right" })
    doc.moveTo(50, tableTop + 12).lineTo(530, tableTop + 12).stroke()
    doc.y = tableTop + 16

    for (const line of lines) {
      const y = doc.y
      doc.fontSize(8).fillColor("#333")
      doc.text(line.description.substring(0, 60), 50, y, { width: 250 })
      doc.text(formatNum(line.net_amount), 310, y, { width: 70, align: "right" })
      doc.text(formatNum(line.vat_amount), 385, y, { width: 60, align: "right" })
      doc.text(formatNum(line.gross_amount), 450, y, { width: 80, align: "right" })
      doc.moveDown(0.6)
    }

    doc.moveDown(0.5)
    doc.moveTo(50, doc.y).lineTo(530, doc.y).stroke()
    doc.moveDown(0.3)

    doc.fontSize(10).fillColor("#000")
    const totY = doc.y
    doc.text("Subtotaal excl. BTW:", 310, totY, { width: 130, align: "right" })
    doc.text(formatNum(snapshot.subtotal), 450, totY, { width: 80, align: "right" })
    doc.moveDown(0.3)
    const vatY = doc.y
    doc.text(`BTW (${(snapshot.vat_rate * 100).toFixed(0)}%):`, 310, vatY, { width: 130, align: "right" })
    doc.text(formatNum(snapshot.vat_amount), 450, vatY, { width: 80, align: "right" })
    doc.moveDown(0.3)
    const totalY = doc.y
    doc.fontSize(11).font("Helvetica-Bold")
    doc.text("TOTAAL:", 310, totalY, { width: 130, align: "right" })
    doc.text(`€ ${formatNum(snapshot.total)}`, 450, totalY, { width: 80, align: "right" })

    doc.font("Helvetica")
    doc.moveDown(1.5)

    if (snapshot.reverse_charge_note) {
      doc.fontSize(8).fillColor("#666").text(snapshot.reverse_charge_note)
      doc.moveDown(0.5)
    }

    doc.fontSize(8).fillColor("#999").text(`BTW-regime: ${snapshot.vat_regime}`)
    doc.moveDown(1)
    doc.fontSize(7).fillColor("#aaa").text(
      "Concept-PDF — fiscale layout afhankelijk van goedkeuring belastingadviseur."
    )

    doc.end()
  })
}

function formatNum(n: number): string {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}
