import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  generateMonthlySellerInvoice,
  runMonthlyInvoicing,
} from "../../../../workflows/finance/seller-invoicing"

/**
 * POST /admin/finance/invoicing — trigger monthly invoicing.
 * Body: { seller_id?, year, month }
 * If seller_id is given, generate for that seller only.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { seller_id, year, month } = req.body as {
    seller_id?: string
    year: number
    month: number
  }

  if (!year || !month) {
    res.status(400).json({ error: "year and month are required" })
    return
  }

  const periodStart = new Date(Date.UTC(year, month - 1, 1))
  const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))

  if (seller_id) {
    const result = await generateMonthlySellerInvoice(
      req.scope,
      seller_id,
      periodStart,
      periodEnd
    )
    res.status(200).json(result)
  } else {
    const result = await runMonthlyInvoicing(req.scope, year, month)
    res.status(200).json(result)
  }
}
