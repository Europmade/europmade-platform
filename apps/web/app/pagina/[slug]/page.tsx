import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PublicStorefrontChrome } from "../../_components/marketplace/public-storefront-chrome"
import { fetchStoreCmsPage } from "../../_lib/cms/fetch-store-cms"
import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import { pickLocalized, type LocalizedString } from "../../_lib/i18n/locales"

type PageProps = {
  params: Promise<{ slug: string }>
}

function locOf(value: unknown): LocalizedString {
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
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const remote = await fetchStoreCmsPage(slug)
  if (!remote?.page) {
    return { title: "Pagina — EuropMade" }
  }
  const title =
    pickLocalized(remote.page.seo_title ?? remote.page.title, locale) ||
    pickLocalized(remote.page.title, locale)
  const description = remote.page.seo_description
    ? pickLocalized(remote.page.seo_description, locale)
    : undefined
  return {
    title,
    description,
    alternates: {
      canonical: remote.page.seo_canonical || `/pagina/${slug}`,
    },
  }
}

export default async function CmsStorefrontPage({ params }: PageProps) {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const remote = await fetchStoreCmsPage(slug)
  if (!remote?.page) notFound()
  const page = remote.page
  const doc = page.document
  const sections =
    doc && typeof doc === "object" && Array.isArray((doc as { sections?: unknown }).sections)
      ? ((doc as { sections: Array<Record<string, unknown>> }).sections)
      : []

  if (sections.length > 0) {
    return (
      <PublicStorefrontChrome locale={locale}>
        <main>
          {sections
            .filter((s) => s.visible !== false)
            .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
            .map((s, i) => {
              const title = pickLocalized(locOf(s.title), locale)
              const body = pickLocalized(locOf(s.body), locale)
              const image = typeof s.image === "string" ? s.image : null
              return (
                <section key={typeof s.id === "string" ? s.id : `s-${i}`} className="px-4 py-8 tablet:px-8">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt=""
                      className="mb-5 max-h-72 w-full rounded-xl object-cover"
                    />
                  ) : null}
                  {title ? (
                    <h2 className="text-[22px] font-bold text-wf-900 tablet:text-[28px]">
                      {title}
                    </h2>
                  ) : null}
                  {body ? (
                    <div className="prose-em mt-4 max-w-[720px] whitespace-pre-wrap text-[13.5px] leading-relaxed text-wf-700">
                      {body}
                    </div>
                  ) : null}
                </section>
              )
            })}
        </main>
      </PublicStorefrontChrome>
    )
  }

  const title = pickLocalized(page.title, locale)
  const body = pickLocalized(page.body, locale)
  return (
    <PublicStorefrontChrome locale={locale}>
      <main className="px-4 py-10 tablet:px-8 tablet:py-12">
        {page.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.cover_url}
            alt=""
            className="mb-6 max-h-72 w-full rounded-xl object-cover"
          />
        ) : null}
        <h1 className="text-[22px] font-bold text-wf-900 tablet:text-[28px]">
          {title}
        </h1>
        <div className="prose-em mt-5 max-w-[720px] whitespace-pre-wrap text-[13.5px] leading-relaxed text-wf-700">
          {body}
        </div>
      </main>
    </PublicStorefrontChrome>
  )
}
