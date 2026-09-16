import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  isCmsActionDocument,
  parseCmsActionBannerUrl,
  parseCmsActionProductIds,
  publicActionPath,
} from "@europmade/utils"
import { ActionPageView } from "../../_components/action/action-page-view"
import { fetchStoreCmsPage } from "../../_lib/cms/fetch-store-cms"
import { pickLocalized } from "../../_lib/i18n/locales"
import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import { resolveListingProducts } from "../../_lib/storefront-catalog"
import { fetchStorefrontCategories } from "../../_lib/product-cloud-store"
import {
  deriveActionCategoryFilters,
  pickActionIntro,
  withExpandedProductCategories,
} from "../../_lib/action-listing"

type ActionPageProps = {
  params: Promise<{ slug: string }>
}

function locFromUnknown(value: unknown) {
  if (!value || typeof value !== "object") {
    return { nl: "", en: "", de: "", fr: "" }
  }
  const v = value as Record<string, unknown>
  return {
    nl: typeof v.nl === "string" ? v.nl : "",
    en: typeof v.en === "string" ? v.en : "",
    de: typeof v.de === "string" ? v.de : "",
    fr: typeof v.fr === "string" ? v.fr : "",
  }
}

export async function generateMetadata({
  params,
}: ActionPageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const remote = await fetchStoreCmsPage(slug)
  if (!remote?.page || !isCmsActionDocument(remote.page.document)) {
    return { title: "Actie — EuropMade" }
  }
  const title =
    pickLocalized(remote.page.seo_title ?? remote.page.title, locale).trim() ||
    slug
  const description =
    pickLocalized(remote.page.seo_description ?? remote.page.body, locale).trim()
  return {
    title: title.includes("EuropMade") ? title : `${title} | EuropMade`,
    description: description || undefined,
    alternates: { canonical: publicActionPath(slug) },
  }
}

export default async function ActionPage({ params }: ActionPageProps) {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const remote = await fetchStoreCmsPage(slug)
  if (!remote?.page || !isCmsActionDocument(remote.page.document)) notFound()

  const page = remote.page
  const productIds = parseCmsActionProductIds(page.document)
  const { products: raw } = await resolveListingProducts({
    ids: productIds,
    limit: Math.max(productIds.length, 1),
    locale,
  })
  const taxonomy = (await fetchStorefrontCategories(locale)) ?? []
  const products = withExpandedProductCategories(raw, taxonomy)
  const filterGroups = deriveActionCategoryFilters(products, taxonomy, locale)
  const countryMap = new Map<string, string>()
  for (const p of products) {
    if (p.countryCode && !countryMap.has(p.countryCode)) {
      countryMap.set(p.countryCode, p.countryLabel)
    }
  }
  const countries = [...countryMap.entries()].map(([countryCode, label]) => ({
    id: `country-${countryCode}`,
    countryCode,
    label,
  }))

  const doc = (page.document ?? {}) as Record<string, unknown>
  const title = pickLocalized(page.title, locale).trim() || slug
  const intro = pickActionIntro(locFromUnknown(doc.intro), page.body, locale)

  return (
    <ActionPageView
      locale={locale}
      slug={slug}
      title={title}
      intro={intro}
      bannerUrl={page.cover_url || parseCmsActionBannerUrl(page.document)}
      products={products}
      filterGroups={filterGroups}
      countries={countries}
    />
  )
}
