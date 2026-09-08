import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ProductDetailPage } from "../../_components/product/product-detail"
import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { resolvePdpDetail } from "../../_lib/storefront-catalog"
import {
  fetchStoreCmsBanners,
  fetchStoreCmsProduct,
  fetchStoreCmsProductTemplate,
} from "../../_lib/cms/fetch-store-cms"
import { resolveProductPage } from "../../_lib/cms/resolve-product-page"

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

async function loadResolvedProductPage(slug: string, locale: StorefrontLocale) {
  const [resolved, cms, templateCms, banners] = await Promise.all([
    resolvePdpDetail(slug, locale),
    fetchStoreCmsProduct(slug),
    fetchStoreCmsProductTemplate(),
    // Resolve by bannerId from any published library entry (not location-scoped).
    fetchStoreCmsBanners(),
  ])
  if (!resolved) return null

  const productDocument =
    cms?.product?.published && cms.product.document
      ? cms.product.document
      : null
  const templateDocument =
    templateCms?.product?.published && templateCms.product.document
      ? templateCms.product.document
      : null

  return resolveProductPage({
    detail: resolved.detail,
    locale,
    templateDocument,
    productDocument,
    banners,
  })
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const page = await loadResolvedProductPage(slug, locale)
  if (!page) return { title: "Product niet gevonden — EuropMade" }

  const { detail, presentation } = page
  const fallbackTitle = `${detail.fullTitle} — EuropMade`
  const title = presentation.seoTitle || fallbackTitle
  const description = presentation.seoDescription || detail.intro
  const canonical = presentation.seoCanonical || `/product/${detail.slug}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      locale: openGraphLocale(locale),
      type: "website",
    },
    robots: { index: true, follow: true },
  }
}

/**
 * Product Detail Page — Product Cloud / Buy Box via catalog API + CMS template.
 */
export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const page = await loadResolvedProductPage(slug, locale)
  if (!page) notFound()

  return (
    <ProductDetailPage
      detail={page.detail}
      presentation={page.presentation}
      banner={page.banner}
      locale={locale}
    />
  )
}
