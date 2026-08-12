import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ListingResults } from "../../_components/marketplace/listing-results"
import { PublicStorefrontChrome } from "../../_components/marketplace/public-storefront-chrome"
import { findBrandProfile } from "../../_lib/brand-profiles"
import { slugifyForBrand } from "../../_lib/brand-slug"
import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import { countryDisplayLabel, t, tFormat } from "../../_lib/i18n/messages"
import { resolveBrandPage, resolveListingProducts } from "../../_lib/storefront-catalog"

type MerkPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: MerkPageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const page = await resolveBrandPage(slug, locale)
  if (!page) {
    const fallback = findBrandProfile(slug)
    if (!fallback) return { title: t("brandPageNotFound", locale) }
    return {
      title: `${fallback.name} — EuropMade`,
      description: fallback.description,
      alternates: { canonical: `/merk/${fallback.slug}` },
    }
  }
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

/**
 * Merkpagina (#19) — merkverhaal, productiefaciliteiten, producten (Product Cloud).
 */
export default async function MerkPage({ params }: MerkPageProps) {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  let page = await resolveBrandPage(slug, locale)

  if (!page) {
    const fallback = findBrandProfile(slug)
    const { products: allProducts } = await resolveListingProducts({ locale })
    const products = allProducts.filter(
      (p) => slugifyForBrand(p.brand) === slug
    )
    if (!fallback && products.length === 0) notFound()
    page = {
      brand: {
        id: slug,
        name: fallback?.name ?? products[0]?.brand ?? slug,
        slug,
        intro: fallback?.description ?? null,
        story: fallback?.description ?? null,
        website_url: null,
        logo_url: null,
        country_code: null,
        product_count: products.length,
        verified_product_count: products.filter((p) => p.verified).length,
        market_country: "NL",
        market_intro: null,
        market_story: null,
        market_contact: null,
        facilities: [],
      },
      products,
    }
  }

  const { brand, products } = page
  const intro = brand.market_intro ?? brand.intro
  const story = brand.market_story ?? brand.story
  const countryLabel = brand.country_code
    ? countryDisplayLabel(brand.country_code, locale)
    : null

  return (
    <PublicStorefrontChrome locale={locale}>
      <div className="page-head px-4 pt-[18px] tablet:px-8">
        <nav
          className="mb-2 text-[11.5px] text-wf-600"
          aria-label="Breadcrumb"
        >
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:underline">
                {t("breadcrumbHome", locale)}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>{t("breadcrumbBrand", locale)}</li>
            <li aria-hidden>/</li>
            <li className="font-semibold text-wf-800" aria-current="page">
              {brand.name}
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-3 tablet:flex-row tablet:items-start tablet:gap-5">
          {brand.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logo_url}
              alt=""
              className="h-20 w-20 shrink-0 rounded-2xl border border-wf-200 object-cover tablet:h-24 tablet:w-24"
            />
          ) : (
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-wf-200 bg-wf-100 text-[22px] font-bold text-wf-800 tablet:h-24 tablet:w-24"
              aria-hidden
            >
              {brand.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-[22px] font-bold text-wf-900 tablet:text-[28px]">
              {brand.name}
            </h1>
            {intro ? (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-wf-700">
                {intro}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {countryLabel ? (
                <span className="inline-flex items-center rounded-full border border-wf-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-wf-800">
                  {countryLabel}
                </span>
              ) : null}
              {brand.verified_product_count > 0 ? (
                <Link href="/verified">
                  <span className="inline-flex items-center rounded-full border border-wf-900 bg-wf-900 px-2.5 py-1 text-[11px] font-bold text-white">
                    {tFormat("brandVerifiedProducts", locale, {
                      count: brand.verified_product_count,
                    })}
                  </span>
                </Link>
              ) : null}
              {brand.website_url ? (
                <a
                  href={brand.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] font-semibold text-wf-800 underline-offset-2 hover:underline"
                >
                  {t("brandWebsiteLabel", locale)} ›
                </a>
              ) : null}
            </div>
            <p className="mt-2 text-[12px] text-wf-600 tablet:text-[13px]">
              {tFormat("brandPageMeta", locale, { count: products.length })}
            </p>
          </div>
        </div>

        {story ? (
          <section className="mt-8 max-w-3xl">
            <h2 className="text-[15px] font-bold text-wf-900 tablet:text-[17px]">
              {tFormat("brandAboutHeading", locale, { name: brand.name })}
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-wf-700">
              {story}
            </p>
          </section>
        ) : null}

        {brand.facilities.length > 0 ? (
          <section className="mt-8" id="productie">
            <h2 className="text-[15px] font-bold text-wf-900 tablet:text-[17px]">
              {t("brandProductionHeading", locale)}
            </h2>
            <div className="mt-3 grid gap-3 tablet:grid-cols-2">
              {brand.facilities.map((facility) => (
                <article
                  key={facility.id}
                  className="rounded-xl border border-wf-200 bg-white px-3.5 py-3 shadow-sm"
                >
                  <h3 className="text-sm font-bold text-wf-900">
                    {facility.name}
                  </h3>
                  <p className="mt-1 text-[12px] text-wf-600">
                    {countryDisplayLabel(facility.country_code, locale)}
                    {facility.region ? ` · ${facility.region}` : ""}
                  </p>
                  {facility.description ? (
                    <p className="mt-2 text-[12px] leading-relaxed text-wf-700">
                      {facility.description}
                    </p>
                  ) : null}
                  {facility.is_made_in_europe &&
                  facility.made_in_europe_score != null ? (
                    <p className="mt-2 text-[12px] font-semibold text-emerald-900">
                      {t("madeInEurope", locale)} — {facility.made_in_europe_score}%
                    </p>
                  ) : null}
                  <Link
                    href="/made-in-europe"
                    className="mt-2 inline-block text-[11px] font-semibold text-wf-800 underline"
                  >
                    {t("mieHowDetermined", locale)}
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <h2 className="mt-8 text-[15px] font-bold text-wf-900 tablet:text-[17px]">
          {tFormat("brandProductsHeading", locale, { name: brand.name })}
        </h2>
      </div>

      <ListingResults
        products={products}
        emptyVariant="category"
        categoryLabel={brand.name}
        locale={locale}
      />
    </PublicStorefrontChrome>
  )
}
