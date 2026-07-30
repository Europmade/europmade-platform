import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { matchByEanWorkflow } from "../../../../workflows/ean-matching"
import { resolveApprovedSeller } from "../resolve-seller"
import type { StoreEanMatchBodyInput } from "../validators"
import { buildProductCloudPreview } from "../product-preview"
import type { ProductCloudPreview } from "../product-preview"

export async function POST(
  req: AuthenticatedMedusaRequest<StoreEanMatchBodyInput>,
  res: MedusaResponse
) {
  await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  const body = req.validatedBody
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const { result } = await matchByEanWorkflow(req.scope).run({
    input: {
      identifier_value: body.identifier_value,
      identifier_type: body.identifier_type,
      country_scope: body.country_scope,
      draft_product_id: body.draft_product_id,
      candidate_product_ids: body.candidate_product_ids,
    },
  })

  if (result.outcome === "exact_match" && result.product_id) {
    const preferred = {
      identifier_id: result.identifier_id,
      identifier_type: body.identifier_type ?? "GTIN",
      identifier_value: body.identifier_value.trim(),
    }
    const product_preview = await buildProductCloudPreview(
      productCloud,
      result.product_id,
      preferred
    )
    res.json({
      ...result,
      confidence_label: "100% zekerheid",
      confidence_note:
        "Deterministische match (Product Cloud Architecture Deel 5) — AI ondersteunt, beslist nooit; voor deze koppeling is geen menselijke beoordeling nodig.",
      product_preview,
    })
    return
  }

  if (result.outcome === "uncertain") {
    const preferred = {
      identifier_type: body.identifier_type ?? "GTIN",
      identifier_value: body.identifier_value.trim(),
    }
    const candidateIds = new Set<string>()
    if (result.match_candidate_ids?.length) {
      const candidates = await productCloud.listMatchCandidates({
        id: result.match_candidate_ids,
      })
      for (const c of candidates) {
        candidateIds.add(c.product_id_a)
        candidateIds.add(c.product_id_b)
      }
    }
    if (body.draft_product_id) {
      candidateIds.delete(body.draft_product_id)
    }

    const candidate_previews: ProductCloudPreview[] = []
    for (const id of candidateIds) {
      candidate_previews.push(
        await buildProductCloudPreview(productCloud, id, preferred)
      )
    }

    res.json({
      ...result,
      confidence_label: "Onzeker — AI-ondersteuning",
      confidence_note:
        "Match is niet deterministisch uniek. AI ondersteunt; de verkoper beslist. Geen automatische koppeling.",
      candidate_previews,
    })
    return
  }

  res.json({
    ...result,
    confidence_label: null,
    confidence_note: null,
  })
}
