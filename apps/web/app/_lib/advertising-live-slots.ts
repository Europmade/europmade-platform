import type { EuMarketCode } from "@europmade/types"
import {
  rewriteMediaStrings,
  type AdVisibilityReason,
  type SellerBannerPresentation,
} from "@europmade/utils"
import { getPageBackendOrigin } from "./page-backend-origin"
import { medusaBackendUrl } from "./medusa-backend-url"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export type LiveAdSlot = {
  id: string
  source: "seller"
  status: string
  name: string
  placement: string
  image_url: string | null
  logo_url?: string | null
  headline: string | null
  subline: string | null
  destination_url: string
  product_ids?: string[]
  cta_key: string
  design_key?: string | null
  banner_presentation?: SellerBannerPresentation | null
  preview?: boolean
}

export type AdPreviewResult = {
  slot: LiveAdSlot | null
  publicNow: boolean
  reasons: AdVisibilityReason[]
  activeFrom: string | null
  activeUntil: string | null
}

export async function fetchLiveAdSlots(
  placement: string,
  market: EuMarketCode | null,
  target?: string | null
): Promise<LiveAdSlot[]> {
  try {
    const qs = new URLSearchParams({ placement })
    if (market) qs.set("market", market)
    if (target?.trim()) qs.set("target", target.trim())
    const res = await fetch(`${medusaBackendUrl()}/store/advertising/live-slots?${qs}`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(PUBLISHABLE_KEY
          ? { "x-publishable-api-key": PUBLISHABLE_KEY }
          : {}),
      },
    })
    if (!res.ok) return []
    const body = (await res.json()) as { slots?: LiveAdSlot[] }
    const slots = Array.isArray(body.slots) ? body.slots : []
    const origin = await getPageBackendOrigin()
    return rewriteMediaStrings(slots, origin)
  } catch {
    return []
  }
}

/** Read-only look at one campaign. Does not change its booking or public status. */
export async function fetchAdPreview(
  campaignId: string,
  placement: string,
  market: EuMarketCode | null
): Promise<AdPreviewResult> {
  const empty: AdPreviewResult = {
    slot: null,
    publicNow: false,
    reasons: ["not_approved"],
    activeFrom: null,
    activeUntil: null,
  }
  try {
    const qs = new URLSearchParams({ placement, preview: campaignId })
    if (market) qs.set("market", market)
    const res = await fetch(`${medusaBackendUrl()}/store/advertising/live-slots?${qs}`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(PUBLISHABLE_KEY
          ? { "x-publishable-api-key": PUBLISHABLE_KEY }
          : {}),
      },
    })
    if (!res.ok) return empty
    const body = (await res.json()) as {
      slots?: LiveAdSlot[]
      publicNow?: boolean
      reasons?: AdVisibilityReason[]
      activeFrom?: string | null
      activeUntil?: string | null
    }
    const origin = await getPageBackendOrigin()
    const slots = rewriteMediaStrings(
      Array.isArray(body.slots) ? body.slots : [],
      origin
    )
    return {
      slot: slots[0] ? { ...slots[0], preview: true } : null,
      publicNow: Boolean(body.publicNow),
      reasons: Array.isArray(body.reasons) ? body.reasons : [],
      activeFrom: body.activeFrom ?? null,
      activeUntil: body.activeUntil ?? null,
    }
  } catch {
    return empty
  }
}
