const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export type PublicAdProduct = {
  id: string
  title: string | null
  slug: string | null
  image_url: string | null
  href: string
}

export type PublicAdSeller = {
  id: string
  name: string
  slug: string
  href: string
}

export type PublicAdCampaign = {
  id: string
  name: string
  image_url: string | null
  headline: string | null
  subline: string | null
  cta_key: string
  design_key: string
  destination_url: string
  product_ids: string[]
  campaign_slug: string | null
  seller_public_slug: string | null
  status: string
}

export const CTA_LABELS_NL: Record<string, string> = {
  view_product: "Bekijk product",
  more_info: "Meer informatie",
  discover: "Ontdek het product",
  view_now: "Nu bekijken",
  view_offer: "Bekijk aanbieding",
}

async function storeFetch(path: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  }
  if (PUBLISHABLE_KEY) {
    headers["x-publishable-api-key"] = PUBLISHABLE_KEY
  }
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers,
    next: { revalidate: 30 },
  })
  if (!res.ok) return null
  return res.json().catch(() => null)
}

export async function fetchPublicSellerShop(sellerSlug: string) {
  const body = await storeFetch(
    `/store/advertising/public/sellers/${encodeURIComponent(sellerSlug)}`
  )
  if (!body?.seller) return null
  return body as {
    seller: PublicAdSeller
    products: PublicAdProduct[]
  }
}

export async function fetchPublicCampaignLanding(
  sellerSlug: string,
  campaignSlug: string
) {
  const body = await storeFetch(
    `/store/advertising/public/sellers/${encodeURIComponent(sellerSlug)}/campaigns/${encodeURIComponent(campaignSlug)}`
  )
  if (!body?.campaign || !body?.seller) return null
  return body as {
    seller: PublicAdSeller
    campaign: PublicAdCampaign
    products: PublicAdProduct[]
  }
}
