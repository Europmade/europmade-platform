import type { Metadata } from "next"
import { Homepage } from "./_components/homepage/homepage"
import { fetchStoreCmsHomepage } from "./_lib/cms/fetch-store-cms"
import { resolveHomepageCms } from "./_lib/cms/resolve-homepage"
import { getStorefrontLocaleFromCookies } from "./_lib/i18n/get-storefront-locale"
import {
  getStorefrontMarketFromRequest,
  parseMarketSearchParam,
} from "./_lib/i18n/get-storefront-market"
import { pickLocalized } from "./_lib/i18n/locales"

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({
  searchParams,
}: HomeProps): Promise<Metadata> {
  const locale = await getStorefrontLocaleFromCookies()
  const sp = searchParams ? await searchParams : {}
  const marketParam = parseMarketSearchParam(sp.market)
  const market = marketParam ?? (await getStorefrontMarketFromRequest())
  const remote = await fetchStoreCmsHomepage(market)

  const fallbackTitle =
    "EuropMade — Europese producten, rechtstreeks van de makers"
  const fallbackDescription =
    "EuropMade is de marketplace waar je precies weet wie iets maakt, waar het vandaan komt, en bij wie je koopt — vergelijk aanbieders, koop veilig. Uitsluitend producten geproduceerd in Europa."

  if (!remote?.homepage?.published) {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
        locale: locale === "en" ? "en_GB" : `${locale}_${locale.toUpperCase()}`,
        type: "website",
      },
      alternates: { canonical: "/" },
    }
  }

  const seoTitle = remote.homepage.seo_title
    ? pickLocalized(remote.homepage.seo_title, locale)
    : fallbackTitle
  const seoDesc = remote.homepage.seo_description
    ? pickLocalized(remote.homepage.seo_description, locale)
    : fallbackDescription
  const ogTitle = remote.homepage.og_title
    ? pickLocalized(remote.homepage.og_title, locale)
    : seoTitle
  const ogDesc = remote.homepage.og_description
    ? pickLocalized(remote.homepage.og_description, locale)
    : seoDesc

  return {
    title: seoTitle,
    description: seoDesc,
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      locale: locale === "en" ? "en_GB" : `${locale}_${locale.toUpperCase()}`,
      type: "website",
    },
    alternates: {
      canonical: remote.homepage.seo_canonical || "/",
    },
  }
}

export const dynamic = "force-dynamic"

export default async function HomePage({ searchParams }: HomeProps) {
  const sp = searchParams ? await searchParams : {}
  const marketParam = parseMarketSearchParam(sp.market)
  const previewRaw = Array.isArray(sp.adPreview) ? sp.adPreview[0] : sp.adPreview
  const adPreviewId =
    typeof previewRaw === "string" && /^adcmp_[0-9A-Za-z]+$/.test(previewRaw)
      ? previewRaw
      : null
  return <Homepage marketOverride={marketParam} adPreviewId={adPreviewId} />
}
