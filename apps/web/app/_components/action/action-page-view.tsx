"use client"

import Link from "next/link"
import type { ListingProduct } from "../../_lib/listing-products"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { t } from "../../_lib/i18n/messages"
import type { ResolvedCategoryCountry, ResolvedCategoryFilterGroup } from "../../_lib/cms/resolve-category"
import { PublicStorefrontChrome } from "../marketplace/public-storefront-chrome"
import { CategoryListingClient } from "../category/category-listing-client"

export function ActionPageView(props: {
  locale: StorefrontLocale
  slug: string
  title: string
  intro: string
  bannerUrl: string | null
  products: ListingProduct[]
  filterGroups: ResolvedCategoryFilterGroup[]
  countries: ResolvedCategoryCountry[]
  alternatives?: ListingProduct[]
}) {
  const { locale, title, intro, bannerUrl, products, filterGroups, countries, alternatives = [] } = props

  return (
    <PublicStorefrontChrome locale={locale}>
      <section className="border-b border-wf-100 px-4 pb-3 pt-3 tablet:px-8">
        <nav className="mb-1.5 text-[11.5px] text-wf-600" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:underline">
                {t("breadcrumbHome", locale)}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-semibold text-wf-800" aria-current="page">
              {t("breadcrumbActions", locale)}
            </li>
            <li aria-hidden>/</li>
            <li className="font-semibold text-wf-800" aria-current="page">
              {title}
            </li>
          </ol>
        </nav>
        {bannerUrl ? (
          <div className="mb-3 overflow-hidden rounded-xl bg-wf-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerUrl}
              alt=""
              className="max-h-[280px] w-full object-cover"
            />
          </div>
        ) : null}
        <h1 className="text-[21px] font-bold leading-tight tracking-tight text-wf-900 tablet:text-[25px]">
          {title}
        </h1>
        {intro ? (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-snug text-wf-600">{intro}</p>
        ) : null}
      </section>
      <CategoryListingClient
        locale={locale}
        products={products}
        filterGroups={filterGroups}
        countries={countries}
        categoryLabel={title}
        alternatives={alternatives}
      />
    </PublicStorefrontChrome>
  )
}
