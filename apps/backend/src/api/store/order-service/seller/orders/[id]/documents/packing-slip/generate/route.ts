import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { ORDER_MODULE } from "../../../../../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../../../../../modules/order-service/service"
import { resolveApprovedSeller } from "../../../../../../../product-cloud/resolve-seller"
import { enrichOrderBundle } from "../../../../../../order-enrichment"
import { generatePackingSlipPdf } from "../../../../../../packing-slip-pdf"

type RouteParams = { id: string }

/**
 * POST — generate (or regenerate) packing slip PDF from live order data.
 * Replaces any previous packing_slip document for this order.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService

  const order = await orders.retrieveEmOrder(id)
  if (order.seller_id !== seller.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Deze order hoort bij een andere seller."
    )
  }

  const bundle = await enrichOrderBundle(req.scope, orders, id)
  const filename = `packing-slip-${bundle.order.order_number}.pdf`
  const structured = bundle.order.shipping_address_structured
  const addressLines: string[] = []
  if (structured) {
    if (structured.street) addressLines.push(structured.street)
    const postalCity = [structured.postal_code, structured.city]
      .filter(Boolean)
      .join(" ")
    if (postalCity) addressLines.push(postalCity)
    if (structured.province) addressLines.push(structured.province)
    if (structured.country || structured.country_code) {
      addressLines.push(
        structured.country || structured.country_code || ""
      )
    }
  }
  if (addressLines.length === 0) {
    for (const line of String(bundle.order.shipping_address || "").split(
      /\n|,/
    )) {
      if (line.trim()) addressLines.push(line.trim())
    }
  }

  const pdf = await generatePackingSlipPdf({
    order_number: bundle.order.order_number,
    order_date: new Date(bundle.order.created_at).toISOString().slice(0, 10),
    seller_id: bundle.order.seller_id,
    customer_name: bundle.order.customer_name,
    shipping_address_lines: addressLines,
    carrier: bundle.order.carrier,
    tracking_code: bundle.order.tracking_code,
    lines: bundle.lines.map((l) => ({
      product_name: l.product_name || l.product_label || "—",
      variant_name: l.variant_name,
      sku: l.sku,
      quantity: l.quantity,
    })),
  })

  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: [
        {
          filename,
          mimeType: "application/pdf",
          content: pdf.toString("base64"),
          access: "public",
        },
      ],
    },
  })
  const uploaded = result?.[0] as { id?: string; url?: string } | undefined
  const url = uploaded?.url || uploaded?.id
  if (!url) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Packing slip upload mislukt."
    )
  }

  const existing = await orders.listOrderDocuments({
    order_id: id,
    type: "packing_slip",
  })
  for (const doc of existing) {
    await orders.deleteOrderDocuments(doc.id)
  }

  await orders.createOrderDocuments({
    order_id: id,
    type: "packing_slip",
    file_id: uploaded?.id ?? null,
    url,
    filename,
    mime_type: "application/pdf",
    size_bytes: pdf.length,
    uploaded_at: new Date(),
  })

  const next = await enrichOrderBundle(req.scope, orders, id)
  res.status(201).json(next)
}
