import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AdCampaignLandingPreview } from "@europmade/ui"
import { parseSellerBannerPresentation } from "@europmade/utils"
import { PublicStorefrontChrome } from "../../../../_components/marketplace/public-storefront-chrome"
import { getStorefrontLocaleFromCookies } from "../../../../_lib/i18n/get-storefront-locale"
import {
  CTA_LABELS_NL,
  fetchPublicCampaignLanding,
} from "../../../../_lib/advertising-public"

type PageProps = {
  params: Promise<{ sellerSlug: string; campaignSlug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { sellerSlug, campaignSlug } = await params
  const data = await fetchPublicCampaignLanding(sellerSlug, campaignSlug)
  if (!data) return { title: "Campagne niet gevonden — EuropMade" }
  const title =
    data.campaign.headline?.trim() ||
    data.campaign.name ||
    "Campagne"
  return {
    title: `${title} — ${data.seller.name} — EuropMade`,
    description: data.campaign.subline || undefined,
  }
}

export default async function PublicSellerCampaignPage({ params }: PageProps) {
  const { sellerSlug, campaignSlug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const data = await fetchPublicCampaignLanding(sellerSlug, campaignSlug)
  if (!data) notFound()

  const ctaKey = data.campaign.cta_key || "view_product"
  const ctaLabel = CTA_LABELS_NL[ctaKey] || ctaKey

  return (
    <PublicStorefrontChrome locale={locale}>
      <div className="px-4 py-8 tablet:px-8">
        <AdCampaignLandingPreview
          banner={{
            designKey: data.campaign.design_key,
            headline: data.campaign.headline,
            subline: data.campaign.subline,
            ctaLabel,
            imageUrl: data.campaign.image_url,
            logoUrl: data.campaign.logo_url,
            presentation: parseSellerBannerPresentation(
              data.campaign.banner_presentation
            ),
          }}
          sellerName={data.seller.name}
          products={data.products}
          moreProductsHref={data.seller.href}
        />
        <div className="mt-10 text-sm text-wf-500">
          <Link href="/" className="hover:underline">
            ← EuropMade
          </Link>
        </div>
      </div>
    </PublicStorefrontChrome>
  )
}
