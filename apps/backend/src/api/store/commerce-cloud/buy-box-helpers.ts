import type { MedusaContainer } from "@medusajs/framework/types"
import { COMMERCE_CLOUD_MODULE } from "../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../modules/commerce-cloud/service"
import { recomputeBuyBoxWorkflow } from "../../../workflows/commerce-cloud"
import type {
  BuyBoxComputationResult,
  BuyBoxWeights,
} from "../../../modules/commerce-cloud/buy-box-engine"
import { DEFAULT_BUY_BOX_WEIGHTS } from "../../../modules/commerce-cloud/buy-box-engine"

export type CachedBuyBoxWinner = {
  source: "cache"
  identifier_id: string
  region_code: string
  winning_offer_id: string
  computed_at: Date
  buy_box_computation_id: string
}

/**
 * ADR-0020: read-through recompute (full ranking + cache refresh).
 */
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

/**
 * ADR-0020: winner-only read from C.4 without recompute.
 * Returns null when cache miss — caller should fall back to recompute.
 */
export async function loadCachedWinner(
  scope: MedusaContainer,
  identifier_id: string,
  region_code: string
): Promise<CachedBuyBoxWinner | null> {
  const commerce = scope.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  const [row] = await commerce.listBuyBoxComputations({
    identifier_id,
    region_code: region_code.toUpperCase(),
  })
  if (!row) return null
  return {
    source: "cache",
    identifier_id: row.identifier_id,
    region_code: row.region_code,
    winning_offer_id: row.winning_offer_id,
    computed_at: new Date(row.computed_at),
    buy_box_computation_id: row.id,
  }
}

export async function loadActiveWeights(
  scope: MedusaContainer
): Promise<BuyBoxWeights> {
  const commerce = scope.resolve(
    COMMERCE_CLOUD_MODULE
  ) as CommerceCloudModuleService
  try {
    return await commerce.getActiveBuyBoxWeights()
  } catch {
    return { ...DEFAULT_BUY_BOX_WEIGHTS }
  }
}
