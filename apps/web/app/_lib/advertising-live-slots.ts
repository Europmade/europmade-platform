import type { EuMarketCode } from "@europmade/types"
import { rewriteMediaStrings } from "@europmade/utils"
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
  headline: string | null
  subline: string | null
  destination_url: string
  cta_key: string
}

export async function fetchLiveAdSlots(
  placement: string,
  market: EuMarketCode | null
): Promise<LiveAdSlot[]> {
  try {
    const qs = new URLSearchParams({ placement })
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
    if (!res.ok) return []
    const body = (await res.json()) as { slots?: LiveAdSlot[] }
    const slots = Array.isArray(body.slots) ? body.slots : []
    const origin = await getPageBackendOrigin()
    return rewriteMediaStrings(slots, origin)
  } catch {
    return []
  }
}
