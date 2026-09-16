import { persistMediaReference } from "@europmade/utils"
import { MedusaError } from "@medusajs/framework/utils"
import type CmsModuleService from "../../../modules/cms/service"
import { normalizeWeekStart } from "./helpers"

export type ParsedCampaignInput = {
  name: string
  placement: string
  target_type: string
  target_value: string | null
  markets: string[]
  weekStarts: Date[]
  image_url: string | null
  headline: string | null
  subline: string | null
  cta_key: string
  design_key: string
  product_ids: string[]
}

/**
 * Shared Seller create/resubmit validation (same rules as POST).
 * destination_url is NOT accepted from the client — set by the API.
 */
export function parseCampaignInput(body: Record<string, unknown>): ParsedCampaignInput {
  const name = typeof body.name === "string" ? body.name.trim() : ""
  if (!name) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "name is required.")
  }

  const placement = typeof body.placement === "string" ? body.placement : ""
  if (!["homepage", "category", "search"].includes(placement)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "placement must be homepage, category, or search."
    )
  }

  const target_type = placement
  let target_value: string | null = null
  if (placement === "category") {
    target_value =
      typeof body.target_value === "string" ? body.target_value.trim() : ""
    if (!target_value) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "category target_value is required."
      )
    }
  } else if (placement === "search") {
    target_value =
      typeof body.target_value === "string"
        ? body.target_value.trim().toLowerCase()
        : ""
    if (!target_value) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "search keyword target_value is required."
      )
    }
  }

  const markets = Array.isArray(body.markets)
    ? (body.markets as string[]).filter(
        (m) => typeof m === "string" && m.length === 2
      )
    : []
  if (markets.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "At least one market is required."
    )
  }

  const weekStarts = Array.isArray(body.week_starts)
    ? ((body.week_starts as string[])
        .map((w) => normalizeWeekStart(w))
        .filter(Boolean) as Date[])
    : []
  if (weekStarts.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "At least one week is required."
    )
  }

  const image_url =
    typeof body.image_url === "string" && body.image_url.trim()
      ? persistMediaReference(body.image_url.trim())
      : null
  const headline =
    typeof body.headline === "string" ? body.headline.trim() || null : null
  const subline =
    typeof body.subline === "string" ? body.subline.trim() || null : null
  const cta_key =
    typeof body.cta_key === "string" ? body.cta_key : "view_product"
  const design_key =
    typeof body.design_key === "string" ? body.design_key : "design_1"

  const product_ids = Array.isArray(body.product_ids)
    ? Array.from(
        new Set(
          (body.product_ids as unknown[])
            .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
            .map((id) => id.trim())
        )
      )
    : []
  if (product_ids.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "At least one product is required."
    )
  }

  return {
    name,
    placement,
    target_type,
    target_value,
    markets,
    weekStarts,
    image_url,
    headline,
    subline,
    cta_key,
    design_key,
    product_ids,
  }
}

/**
 * Slot uniqueness — exclude soft-deleted weeks and optionally the campaign
 * being resubmitted (its residual week rows must not block itself).
 */
export async function assertSlotsAvailable(
  cms: CmsModuleService,
  input: Pick<
    ParsedCampaignInput,
    "placement" | "target_type" | "target_value" | "markets" | "weekStarts"
  >,
  options?: { excludeCampaignId?: string }
): Promise<void> {
  const conflicts: string[] = []
  for (const market of input.markets) {
    for (const ws of input.weekStarts) {
      const existing = await cms.listAdCampaignWeeks({
        placement: input.placement,
        target_type: input.target_type,
        target_value: input.target_value ?? "",
        market_code: market,
        week_start: ws,
      })
      const blocking = existing.filter((e: Record<string, unknown>) => {
        if (
          options?.excludeCampaignId &&
          String(e.campaign_id) === options.excludeCampaignId
        ) {
          return false
        }
        return true
      })
      if (blocking.length > 0) {
        const label = ws.toISOString().slice(0, 10)
        conflicts.push(`${market}:${label}`)
      }
    }
  }
  if (conflicts.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Slot(s) already booked: ${conflicts.join(", ")}`
    )
  }
}
