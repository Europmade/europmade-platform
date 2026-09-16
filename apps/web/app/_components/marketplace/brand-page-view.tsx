import Link from "next/link"
import { ProductCard } from "./product-card"
import { PublicStorefrontChrome } from "./public-storefront-chrome"
import type { ListingProduct } from "../../_lib/listing-products"
import type { CatalogBrandPage } from "../../_lib/catalog-api"
import { MARKETPLACE_CATEGORIES } from "../../_lib/marketplace-categories"
import { countryDisplayLabel, t, tFormat } from "../../_lib/i18n/messages"
import type { StorefrontLocale } from "../../_lib/i18n/locales"

export function BrandPageView({
  brand,
  products,
  locale,
}: {
  brand: CatalogBrandPage["brand"]
  products: ListingProduct[]
  locale: StorefrontLocale
}) {
  const intro = brand.market_intro ?? brand.intro
  const story = brand.market_story ?? brand.story
  const storyTitle =
    brand.story_title?.trim() ||
    tFormat("brandAboutHeading", locale, { name: brand.name })
  const doc = brand.page_document
  const selectedIds = doc?.product_ids ?? []
  const orderedProducts =
    selectedIds.length > 0
      ? selectedIds
          .map((id) => products.find((p) => p.slug === id))
          .filter((p): p is ListingProduct => Boolean(p))
      : products

  const autoCats = new Map<string, { slug: string; label: string; image: string | null }>()
  for (const product of products) {
    for (const slug of product.categorySlugs || []) {
      const key = slug.trim()
      if (!key || autoCats.has(key)) continue
      const meta = MARKETPLACE_CATEGORIES.find((c) => c.slug === key)
      autoCats.set(key, {
        slug: key,
        label: meta?.label ?? key,
        image: product.imageUrl ?? null,
      })
    }
  }
  const chosenSlugs = doc?.category_slugs?.length
    ? doc.category_slugs
    : [...autoCats.keys()].slice(0, 8)
  const categories = chosenSlugs
    .map((slug) => {
      const auto = autoCats.get(slug)
      if (auto) return auto
      const meta = MARKETPLACE_CATEGORIES.find((c) => c.slug === slug)
      return { slug, label: meta?.label ?? slug, image: null as string | null }
    })
    .filter((row) => row.slug)

  const extras = doc?.extra_sections ?? []
  const countryLabel = brand.country_code
    ? countryDisplayLabel(brand.country_code, locale)
    : null

  return (
    <PublicStorefrontChrome locale={locale}>
      <section className="relative isolate min-h-[280px] overflow-hidden tablet:min-h-[380px] desktop:min-h-[440px]">
        {brand.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.hero_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-wf-800 via-wf-700 to-emerald-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
        <div className="relative mx-auto flex min-h-[280px] max-w-[1160px] flex-col justify-end px-4 py-8 tablet:min-h-[380px] tablet:px-8 desktop:min-h-[440px]">
          <div className="flex flex-col gap-4 tablet:flex-row tablet:items-end">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg tablet:h-28 tablet:w-28">
              {brand.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brand.logo_url}
                  alt=""
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <span className="text-xl font-bold text-wf-800">
                  {brand.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 pb-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                {t("breadcrumbBrand", locale)}
              </p>
              <h1 className="mt-1 text-[32px] font-bold leading-none tracking-tight text-white tablet:text-[44px]">
                {brand.name}
              </h1>
              {intro ? (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/90 tablet:text-base">
                  {intro}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {countryLabel ? (
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white">
                    {countryLabel}
                  </span>
                ) : null}
                {brand.verified_product_count > 0 ? (
                  <Link
                    href="/verified"
                    className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-wf-900"
                  >
                    {tFormat("brandVerifiedProducts", locale, {
                      count: brand.verified_product_count,
                    })}
                  </Link>
                ) : null}
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white">
                  {tFormat("brandPageMeta", locale, {
                    count: orderedProducts.length,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1160px] px-4 tablet:px-8">
        {story ? (
          <section className="mt-10 grid items-center gap-6 tablet:grid-cols-2">
            <div>
              <h2 className="text-[22px] font-bold text-wf-900">{storyTitle}</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-wf-700 tablet:text-[15px]">
                {story}
              </p>
            </div>
            {brand.story_image_url ? (
              <div className="overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brand.story_image_url}
                  alt=""
                  className="h-full max-h-[360px] w-full object-cover"
                />
              </div>
            ) : null}
          </section>
        ) : null}

        {categories.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-[20px] font-bold text-wf-900">
              {t("brandCategoriesHeading", locale)}
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 tablet:grid-cols-3 desktop:grid-cols-4">
              {categories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/zoeken?categorie=${encodeURIComponent(cat.slug)}&merk=${encodeURIComponent(brand.name)}`}
                    className="group relative block overflow-hidden rounded-xl border border-wf-200 bg-wf-50"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-wf-200">
                      {cat.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cat.image}
                          alt=""
                          className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                        />
                      ) : null}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2.5">
                      <p className="text-sm font-bold text-white">{cat.label}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-12 pb-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-[20px] font-bold text-wf-900">
              {tFormat("brandProductsHeading", locale, { name: brand.name })}
            </h2>
            <Link
              href={`/zoeken?merk=${encodeURIComponent(brand.name)}`}
              className="text-xs font-semibold text-wf-800 underline-offset-2 hover:underline"
            >
              {t("brandAllProducts", locale)}
            </Link>
          </div>
          {orderedProducts.length === 0 ? (
            <p className="text-sm text-wf-600">{t("brandNoProducts", locale)}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 tablet:grid-cols-3 desktop:grid-cols-4 desktop:gap-4">
              {orderedProducts.map((product) => (
                <li key={product.slug}>
                  <ProductCard product={product} layout="grid" locale={locale} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {extras
          .filter((section) =>
            Boolean(section.title || section.text || section.image_url)
          )
          .map((section) => (
          <section key={section.id} className="mt-10">
            {section.type === "text" ? (
              <div className="max-w-3xl">
                {section.title ? (
                  <h2 className="text-[20px] font-bold text-wf-900">
                    {section.title}
                  </h2>
                ) : null}
                {section.text ? (
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-wf-700">
                    {section.text}
                  </p>
                ) : null}
              </div>
            ) : null}
            {section.type === "image" && section.image_url ? (
              <div className="overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={section.image_url}
                  alt=""
                  className="max-h-[420px] w-full object-cover"
                />
              </div>
            ) : null}
            {section.type === "image_text" ? (
              <div className="grid items-center gap-6 tablet:grid-cols-2">
                {section.image_url ? (
                  <div className="overflow-hidden rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={section.image_url}
                      alt=""
                      className="max-h-[360px] w-full object-cover"
                    />
                  </div>
                ) : null}
                <div>
                  {section.title ? (
                    <h2 className="text-[20px] font-bold text-wf-900">
                      {section.title}
                    </h2>
                  ) : null}
                  {section.text ? (
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-wf-700">
                      {section.text}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        ))}

        {brand.facilities.length > 0 ? (
          <section className="mt-12 pb-12" id="productie">
            <h2 className="text-[20px] font-bold text-wf-900">
              {t("brandProductionHeading", locale)}
            </h2>
            <div className="mt-4 grid gap-3 tablet:grid-cols-2">
              {brand.facilities.map((facility) => (
                <article
                  key={facility.id}
                  className="rounded-xl border border-wf-200 bg-white px-3.5 py-3 shadow-sm"
                >
                  <h3 className="text-sm font-bold text-wf-900">{facility.name}</h3>
                  <p className="mt-1 text-[12px] text-wf-600">
                    {countryDisplayLabel(facility.country_code, locale)}
                    {facility.region ? ` · ${facility.region}` : ""}
                  </p>
                  {facility.description ? (
                    <p className="mt-2 text-[12px] leading-relaxed text-wf-700">
                      {facility.description}
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
        ) : (
          <div className="h-10" />
        )}
      </div>
    </PublicStorefrontChrome>
  )
}

