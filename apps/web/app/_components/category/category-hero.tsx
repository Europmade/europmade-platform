import Link from "next/link"
import { AdSlot } from "../homepage/ad-slot"
import type { StorefrontAdCreative } from "../../_lib/storefront-ads"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { t } from "../../_lib/i18n/messages"
import type { CategoryBannerPriority } from "../../_lib/cms/category-cms"
import type { ProductMockKind } from "../../_lib/product-mockup"

type CategoryHeroProps = {
  locale: StorefrontLocale
  title: string
  intro: string
  stats: {
    productCount: number
    producerCount: number
    retailerCount: number
    productionCountryCount: number
  }
  banner: StorefrontAdCreative | null
  bannerPriority: CategoryBannerPriority | null
  breadcrumbLabel: string
  productKind?: ProductMockKind
}

/**
 * Category hero — CMS title/intro/stats left, CMS ad banner right.
 * Compact height + vertically centered copy to reduce empty left space.
 */
export function CategoryHero({
  locale,
  title,
  intro,
  stats,
  banner,
  bannerPriority,
  breadcrumbLabel,
  productKind = "coffee",
}: CategoryHeroProps) {
  return (
    <section className="border-b border-wf-100 px-4 pb-3 pt-3 tablet:px-8 tablet:pb-3.5 tablet:pt-3.5">
      <nav
        className="mb-1.5 text-[11.5px] text-wf-600"
        aria-label="Breadcrumb"
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:underline">
              {t("breadcrumbHome", locale)}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/categorie" className="hover:underline">
              {t("breadcrumbCategories", locale)}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-semibold text-wf-800" aria-current="page">
            {breadcrumbLabel}
          </li>
        </ol>
      </nav>

      <div className="grid items-center gap-3 desktop:grid-cols-[1.05fr_0.95fr] desktop:gap-4">
        <div className="flex min-w-0 flex-col justify-center desktop:min-h-[150px]">
          <h1 className="text-[21px] font-bold leading-tight tracking-tight text-wf-900 tablet:text-[25px]">
            {title}
          </h1>
          <p className="mt-1.5 max-w-xl text-[12.5px] leading-snug text-wf-600 line-clamp-3 tablet:text-[13px]">
            {intro}
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-wf-700">
            <li>
              <span className="font-bold text-wf-900">{stats.productCount}</span>{" "}
              {t("productsSuffix", locale)}
            </li>
            <li>
              <span className="font-bold text-wf-900">{stats.producerCount}</span>{" "}
              {t("producers", locale)}
            </li>
            <li>
              <span className="font-bold text-wf-900">{stats.retailerCount}</span>{" "}
              {t("retailers", locale)}
            </li>
            <li>
              <span className="font-bold text-wf-900">
                {stats.productionCountryCount}
              </span>{" "}
              {t("productionCountries", locale)}
            </li>
          </ul>
        </div>

        <div data-banner-priority={bannerPriority ?? "none"}>
          <AdSlot
            position={1}
            location="category"
            creative={banner}
            locale={locale}
            adLabel={t("advertisement", locale)}
            productKind={productKind}
            flush
            compact
          />
        </div>
      </div>
    </section>
  )
}
