import Link from "next/link"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { getSpecialistGuide } from "../../_lib/category/buying-guide-specialist"
import type {
  ResolvedCategoryDiscoveryCard,
  ResolvedCategoryDiscoveryRail,
} from "../../_lib/cms/resolve-category"
import {
  CATEGORY_PRODUCT_KIND,
  manufacturerLogoSrc,
  productMockupSrc,
  type ProductMockKind,
} from "../../_lib/product-mockup"

type CategoryDiscoveryProps = {
  title: string
  productsSuffix: string
  categorySlug: string
  categoryLabel: string
  locale: StorefrontLocale
  rails: ResolvedCategoryDiscoveryRail[]
  cards?: ResolvedCategoryDiscoveryCard[]
}

const RAIL_TINT: Record<string, string> = {
  popular_brands: "from-[#f7f8fa] via-white to-[#eef2f7]",
  new_producers: "from-[#f4f7f2] via-white to-[#eaf3e8]",
  bought_together: "from-[#f3f6fb] via-white to-[#e8eef8]",
  most_viewed: "from-[#fbf8f4] via-white to-[#f3eee6]",
  compare_category: "from-[#f5f3ff] via-white to-[#eeebf8]",
  new_collections: "from-[#fdf2f8] via-white to-[#f7eaf2]",
  alternatives: "from-[#f0fdfa] via-white to-[#e6f5f1]",
  maybe_interesting: "from-[#fff7ed] via-white to-[#f8eee3]",
  accessories: "from-[#f8fafc] via-white to-[#eef1f5]",
  season: "from-[#f0fdf4] via-white to-[#e5f6ea]",
  materials: "from-[#faf5f0] via-white to-[#f3ebe3]",
  applications: "from-[#eff6ff] via-white to-[#e5eef9]",
}

/**
 * Discovery rails — presentation remap (compare → related, richer brand/producer cards).
 */
export function CategoryDiscovery({
  title,
  productsSuffix,
  categorySlug,
  categoryLabel,
  locale,
  rails,
  cards = [],
}: CategoryDiscoveryProps) {
  const guide = getSpecialistGuide(categorySlug, categoryLabel, locale)
  const hasRails = rails.some((r) => r.cards.length > 0)
  if (!hasRails && cards.length === 0) return null

  return (
    <section
      className="border-t border-wf-100 px-4 py-5 tablet:px-8 tablet:py-6"
      data-ai-content-block="discovery"
      data-ai-content-block-legacy="internal-links"
    >
      <h2 className="mb-4 text-[20px] font-bold tracking-tight text-wf-900 tablet:text-[24px]">
        {title}
      </h2>

      {hasRails ? (
        <div className="space-y-4 tablet:space-y-5">
          {rails
            .filter((r) => r.cards.length > 0)
            .map((rail) => {
              const isRelated =
                rail.kind === "compare_category" ||
                rail.kind === "alternatives" ||
                rail.kind === "maybe_interesting"
              const displayTitle =
                rail.kind === "compare_category"
                  ? guide.relatedHeading
                  : rail.title
              const displayLayout =
                rail.kind === "popular_brands" || rail.kind === "new_producers"
                  ? "premium_brand"
                  : rail.kind === "compare_category"
                    ? "category_banners"
                    : rail.layout
              const tint =
                RAIL_TINT[rail.kind] ?? "from-[#f7f8fa] via-white to-[#eef1f5]"

              return (
                <div
                  key={rail.id}
                  data-discovery-rail={
                    rail.kind === "compare_category"
                      ? "related_categories"
                      : rail.kind
                  }
                  data-layout={displayLayout}
                  className={`rounded-2xl border border-wf-100 bg-gradient-to-br ${tint} p-3 tablet:p-3.5`}
                >
                  <div className="mb-2 flex items-end justify-between gap-3">
                    <h3 className="text-[14px] font-bold text-wf-900 tablet:text-[15px]">
                      {displayTitle}
                    </h3>
                    {isRelated && rail.kind === "compare_category" ? (
                      <span className="rounded-full border border-wf-200 bg-white/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-wf-500">
                        related
                      </span>
                    ) : null}
                  </div>
                  <RailGrid
                    rail={rail}
                    productsSuffix={productsSuffix}
                    layoutOverride={displayLayout}
                    fallbackKind={
                      CATEGORY_PRODUCT_KIND[categorySlug] ?? "coffee"
                    }
                  />
                </div>
              )
            })}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 tablet:grid-cols-3 desktop:grid-cols-4">
          {cards.map((card) => (
            <li key={card.id} className="h-full">
              <DiscoveryCard
                card={card}
                productsSuffix={productsSuffix}
                layout="image_cards"
                fallbackKind={
                  CATEGORY_PRODUCT_KIND[categorySlug] ?? "coffee"
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function RailGrid({
  rail,
  productsSuffix,
  layoutOverride,
  fallbackKind,
}: {
  rail: ResolvedCategoryDiscoveryRail
  productsSuffix: string
  layoutOverride: string
  fallbackKind: ProductMockKind
}) {
  const layout = layoutOverride

  if (layout === "premium_brand") {
    return (
      <ul className="grid grid-cols-1 gap-2 tablet:grid-cols-2 desktop:grid-cols-4">
        {rail.cards.map((card) => (
          <li key={card.id} className="h-full">
            <PremiumBrandCard
              card={card}
              productsSuffix={productsSuffix}
              fallbackKind={fallbackKind}
            />
          </li>
        ))}
      </ul>
    )
  }

  if (layout === "logo_row") {
    return (
      <ul className="grid grid-cols-2 gap-2 tablet:grid-cols-4">
        {rail.cards.map((card) => (
          <li key={card.id} className="h-full">
            <DiscoveryCard
              card={card}
              productsSuffix={productsSuffix}
              layout="logo_row"
              fallbackKind={fallbackKind}
            />
          </li>
        ))}
      </ul>
    )
  }

  if (layout === "category_banners") {
    return (
      <ul className="grid gap-2 tablet:grid-cols-2">
        {rail.cards.map((card) => (
          <li key={card.id} className="h-full">
            <DiscoveryCard
              card={card}
              productsSuffix={productsSuffix}
              layout="category_banners"
              fallbackKind={fallbackKind}
            />
          </li>
        ))}
      </ul>
    )
  }

  if (layout === "product_cards") {
    return (
      <ul className="grid grid-cols-2 gap-2 tablet:grid-cols-4">
        {rail.cards.map((card) => (
          <li key={card.id} className="h-full">
            <DiscoveryCard
              card={card}
              productsSuffix={productsSuffix}
              layout="product_cards"
              fallbackKind={fallbackKind}
            />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-2 tablet:grid-cols-3 desktop:grid-cols-4">
      {rail.cards.map((card) => (
        <li key={card.id} className="h-full">
          <DiscoveryCard
            card={card}
            productsSuffix={productsSuffix}
            layout="image_cards"
            fallbackKind={fallbackKind}
          />
        </li>
      ))}
    </ul>
  )
}

function PremiumBrandCard({
  card,
  productsSuffix,
  fallbackKind,
}: {
  card: ResolvedCategoryDiscoveryCard
  productsSuffix: string
  fallbackKind: ProductMockKind
}) {
  const kind = (card.imageKind as ProductMockKind) ?? fallbackKind
  const logo = manufacturerLogoSrc(
    card.logoKey === "atelier" || card.logoKey === "verdetech"
      ? card.logoKey
      : card.type === "producer"
        ? "verdetech"
        : "atelier"
  )

  return (
    <Link
      href={card.href}
      className="group flex h-full overflow-hidden rounded-xl border border-wf-200/90 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-wf-300 hover:shadow-md"
    >
      <div className="relative w-[42%] shrink-0 bg-[#f5f6f8]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={productMockupSrc(`brand-hero-${card.id}`, kind)}
          alt=""
          className="h-full min-h-[88px] w-full object-contain p-2 transition duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center px-2.5 py-2">
        <div className="mb-1.5 flex h-7 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo}
            alt=""
            className="max-h-6 w-auto object-contain"
            loading="lazy"
            decoding="async"
          />
        </div>
        <p className="truncate text-[12.5px] font-bold text-wf-900">
          {card.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-wf-500">
          {card.subtitle ||
            card.countryLabel ||
            (card.type === "producer"
              ? "Europese producent"
              : "Populair merk")}
        </p>
        {card.productCount != null ? (
          <p className="mt-1 text-[10px] font-semibold text-wf-600">
            {card.productCount} {productsSuffix}
          </p>
        ) : null}
      </div>
    </Link>
  )
}

function DiscoveryCard({
  card,
  productsSuffix,
  layout,
  fallbackKind,
}: {
  card: ResolvedCategoryDiscoveryCard
  productsSuffix: string
  layout: string
  fallbackKind: ProductMockKind
}) {
  const base =
    "group flex h-full flex-col rounded-xl border border-wf-200/90 bg-white/95 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-wf-300 hover:shadow-md"

  if (
    layout === "logo_row" ||
    card.type === "brand" ||
    card.type === "producer"
  ) {
    return (
      <PremiumBrandCard
        card={card}
        productsSuffix={productsSuffix}
        fallbackKind={fallbackKind}
      />
    )
  }

  if (layout === "category_banners" || card.type === "banner") {
    const kind = (card.imageKind as ProductMockKind) ?? fallbackKind
    return (
      <Link href={card.href} className={`${base} overflow-hidden p-0`}>
        <div className="relative flex min-h-[88px] items-center gap-3 bg-gradient-to-r from-[#f5f6f8] to-[#e8ebf0] px-3 py-2.5">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/60 p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productMockupSrc(`banner-${card.id}`, kind)}
              alt=""
              className="h-full w-full object-contain transition duration-300 group-hover:scale-110"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="min-w-0">
            {card.badge ? (
              <span className="mb-1 inline-flex rounded-full border border-wf-200 bg-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-wf-600">
                {card.badge}
              </span>
            ) : null}
            <p className="truncate text-[13px] font-bold text-wf-900">
              {card.title}
            </p>
            <p className="mt-0.5 text-[11px] text-wf-500">
              {card.productCount != null
                ? `${card.productCount} ${productsSuffix}`
                : card.subtitle}
            </p>
          </div>
        </div>
      </Link>
    )
  }

  const kind = (card.imageKind as ProductMockKind) ?? fallbackKind
  const aspect = layout === "product_cards" ? "aspect-square" : "aspect-[4/3]"

  return (
    <Link href={card.href} className={`${base} p-1.5`}>
      <div
        className={`relative ${aspect} w-full overflow-hidden rounded-lg bg-[#f5f6f8]`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={productMockupSrc(`disc-${card.id}`, kind)}
          alt=""
          className="h-full w-full object-contain p-1.5 transition duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        {card.badge ? (
          <span className="absolute left-1.5 top-1.5 rounded-full border border-wf-300/90 bg-white/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-wf-700 shadow-sm">
            {card.badge}
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 truncate px-0.5 text-[12px] font-bold leading-tight text-wf-900">
        {card.title}
      </p>
      <p className="mt-0.5 px-0.5 text-[10px] text-wf-500">
        {card.productCount != null
          ? `${card.productCount} ${productsSuffix}`
          : card.subtitle}
      </p>
    </Link>
  )
}
