import type { MedusaContainer } from "@medusajs/framework/types"
import { COMMERCE_CLOUD_MODULE } from "../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../modules/commerce-cloud/service"
import { recomputeBuyBoxWorkflow } from "../../../workflows/commerce-cloud"
import type { BuyBoxComputationResult } from "../../../modules/commerce-cloud/buy-box-engine"

export async function loadBuyBoxForIdentifier(
  scope: MedusaContainer,
  identifier_id: string,
  region_code: string
): Promise<BuyBoxComputationResult> {
  const { result } = await recomputeBuyBoxWorkflow(scope).run({
    input: { identifier_id, region_code },
  })
  return result
}

export async function loadCachedWinner(
  scope: MedusaContainer,
  identifier_id: string,
  region_code: string
): Promise<{ winning_offer_id: string; computed_at: Date } | null> {
  const commerce = scope.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  const [row] = await commerce.listBuyBoxComputations({
    identifier_id,
    region_code: region_code.toUpperCase(),
  })
  if (!row) return null
  return {
    winning_offer_id: row.winning_offer_id,
    computed_at: new Date(row.computed_at),
  }
}
