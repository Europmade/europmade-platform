import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { matchByEanWorkflow } from "../../../../workflows/ean-matching"
import { AdminEanMatchBodyInput } from "../validators"

/**
 * EAN/GTIN-matching — S3-03-03. Dunne admin-aanroep van de matchingworkflow
 * zodat de pijplijn end-to-end te testen is vóór S3-03-04 Product-CRUD.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminEanMatchBodyInput>,
  res: MedusaResponse
) {
  const { result } = await matchByEanWorkflow(req.scope).run({
    input: req.validatedBody,
  })
  res.json({ match: result })
}
