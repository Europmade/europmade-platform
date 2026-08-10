import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ProductDetailPage } from "../../_components/product/product-detail"
import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { resolvePdpDetail } from "../../_lib/storefront-catalog"

type ProductPageProps = {
  params: Promise<{ slug: string }>
}

function openGraphLocale(locale: StorefrontLocale): string {
  switch (locale) {
    case "nl":
      return "nl_NL"
    case "en":
      return "en_GB"
    case "de":
      return "de_DE"
    case "fr":
      return "fr_FR"
    default:
      return "nl_NL"
  }
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const resolved = await resolvePdpDetail(slug, locale)
  if (!resolved) return { title: "Product niet gevonden — EuropMade" }
  const { detail } = resolved
  return {
    title: `${detail.fullTitle} — EuropMade`,
    description: detail.intro,
    alternates: { canonical: `/product/${detail.slug}` },
    openGraph: {
      title: `${detail.fullTitle} — EuropMade`,
      description: detail.intro,
      locale: openGraphLocale(locale),
      type: "website",
    },
    robots: { index: true, follow: true },
  }
}

/**
 * Product Detail Page — Product Cloud / Buy Box wanneer beschikbaar, anders seed.
 */
export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const resolved = await resolvePdpDetail(slug, locale)
  if (!resolved) notFound()
  return <ProductDetailPage detail={resolved.detail} locale={locale} />
}
