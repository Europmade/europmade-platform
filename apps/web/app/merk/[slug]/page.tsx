import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BrandPageView } from "../../_components/marketplace/brand-page-view"
import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import { t, tFormat } from "../../_lib/i18n/messages"
import { resolveBrandPage } from "../../_lib/storefront-catalog"

type MerkPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: MerkPageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const page = await resolveBrandPage(slug, locale)
  if (!page) return { title: t("brandPageNotFound", locale) }
  const intro =
    page.brand.market_intro ??
    page.brand.intro ??
    tFormat("brandPageMeta", locale, { count: page.products.length })
  return {
    title: `${page.brand.name} — EuropMade`,
    description: intro,
    alternates: { canonical: `/merk/${page.brand.slug}` },
  }
}

export default async function MerkPage({ params }: MerkPageProps) {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const page = await resolveBrandPage(slug, locale)
  if (!page) notFound()
  return (
    <BrandPageView brand={page.brand} products={page.products} locale={locale} />
  )
}
