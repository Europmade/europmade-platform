import { isCmsActionDocument } from "@europmade/utils"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CmsPageView } from "../../_components/cms/cms-page-view"
import { defaultCanonicalForSlug } from "../../_lib/cms/cms-fixed-pages"
import { resolveCmsPage } from "../../_lib/cms/resolve-cms-page"
import { fetchStoreCmsPage } from "../../_lib/cms/fetch-store-cms"
import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const publicPath = defaultCanonicalForSlug(slug)
  const page = await resolveCmsPage({ slug, locale, publicPath })
  if (page.source !== "cms") {
    return { title: "Pagina — EuropMade" }
  }
  return {
    title: page.seo.title.includes("EuropMade")
      ? page.seo.title
      : `${page.seo.title} — EuropMade`,
    description: page.seo.description || undefined,
    alternates: { canonical: page.seo.canonical },
  }
}

export default async function CmsStorefrontPage({ params }: PageProps) {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const publicPath = defaultCanonicalForSlug(slug)
  const page = await resolveCmsPage({ slug, locale, publicPath })
  if (page.source !== "cms") notFound()
  const remote = await fetchStoreCmsPage(slug)
  if (remote?.page && isCmsActionDocument(remote.page.document)) notFound()
  return <CmsPageView page={page} locale={locale} />
}
