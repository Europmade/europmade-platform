import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { revalidateCheckoutLines } from "../../../../../workflows/order-service"
import type { StoreCheckoutRevalidateBodyInput } from "../../validators"

/** Server-side Offer prijs/voorraad-revalidatie vóór checkout. */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreCheckoutRevalidateBodyInput>,
  res: MedusaResponse
) {
  const lines = await revalidateCheckoutLines(req.scope, req.validatedBody.lines)
  const sellers = new Set(lines.map((l) => l.seller_id))
  res.json({
    lines,
    seller_count: sellers.size,
    split_notice:
      sellers.size >= 2
        ? `Je bestelling wordt opgesplitst in ${sellers.size} deelbestellingen — één per verkoper.`
        : null,
  })
}
