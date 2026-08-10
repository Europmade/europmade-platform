import Link from "next/link"
import { Badge, Button } from "@europmade/ui"
import {
  discountBadgeLabel,
  discountPercent,
  formatEuroFromCents,
  starsForRating,
  type ListingProduct,
} from "../../_lib/listing-products"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { t, tFormat } from "../../_lib/i18n/messages"

type ProductCardProps = {
  product: ListingProduct
  /** Mobiel listing = horizontale kaart; desktop/tablet = gridkaart. */
  layout?: "grid" | "list"
  locale?: StorefrontLocale
}

/**
 * CMP-017 Product Card — vaste rasterhoogte voor pixelstrakke grids.
 */
export function ProductCard({
  product,
  layout = "grid",
  locale = DEFAULT_STOREFRONT_LOCALE,
}: ProductCardProps) {
  const pct = discountPercent(product)
  const discountLabel = discountBadgeLabel(product)
  const href = `/product/${product.slug}`
  const isList = layout === "list"
  const sellersLabel =
    product.offerCount === 1
      ? t("sellersOne", locale)
      : tFormat("sellersMany", locale, { count: product.offerCount })

  if (isList) {
    return (
      <article className="flex h-[168px] gap-2.5 rounded-[10px] border border-wf-300 p-2">
        <Link
          href={href}
          className="block w-[38%] shrink-0 self-stretch"
          aria-label={tFormat("viewProduct", locale, { title: product.title })}
        >
          <div
            className="h-full w-full overflow-hidden rounded-md bg-wf-100"
            style={{ aspectRatio: "1 / 1", maxHeight: "100%" }}
            role="img"
            aria-label={product.title}
          />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-1 flex h-[22px] items-start gap-1 overflow-hidden">
            {product.verified ? (
              <Badge variant="solid" className="px-1.5 py-0.5 text-[9.5px]">
                Verified™
              </Badge>
            ) : null}
            {discountLabel ? (
              <Badge
                variant="solid"
                className="border-wf-900 bg-wf-900 px-1.5 py-0.5 text-[9.5px]"
              >
                {discountLabel}
              </Badge>
            ) : null}
          </div>
          <Link href={href} className="hover:underline">
            <h3 className="line-clamp-2 min-h-[2.6em] text-[13px] font-bold leading-snug text-wf-800">
              {product.title}
            </h3>
          </Link>
          <p className="mt-0.5 truncate text-[10.5px] text-wf-600">
            {product.brand}
          </p>
          <div className="mt-auto">
            <div className="flex min-h-[22px] flex-wrap items-baseline gap-1.5">
              {product.originalPriceCents && pct != null ? (
                <span className="text-[11px] text-wf-500 line-through">
                  {formatEuroFromCents(product.originalPriceCents)}
                </span>
              ) : null}
              <span className="text-base font-bold text-wf-900">
                {formatEuroFromCents(product.priceCents)}
              </span>
              {pct != null ? (
                <span className="text-[10px] font-bold text-wf-800">−{pct}%</span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-[10.5px] font-semibold text-wf-700">
              {sellersLabel}
            </p>
            <p className="mt-0.5 flex h-[16px] items-center gap-1 text-[10.5px] text-wf-600">
              <span className="tracking-tighter text-wf-800" aria-hidden>
                {starsForRating(product.rating)}
              </span>
              <span className="truncate">
                {product.rating.toFixed(1).replace(".", ",")} ·{" "}
                {product.countryLabel}
              </span>
            </p>
            <Link href={href} className="mt-2 block">
              <Button type="button" variant="primary" className="h-9 w-full text-xs">
                {t("viewProductCta", locale)}
              </Button>
            </Link>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="flex h-full min-h-[400px] flex-col rounded-lg border border-wf-300 p-3">
      <Link
        href={href}
        className="mb-2 block w-full shrink-0"
        aria-label={tFormat("viewProduct", locale, { title: product.title })}
      >
        <div
          className="aspect-square w-full overflow-hidden rounded-md bg-wf-100"
          role="img"
          aria-label={product.title}
        />
      </Link>

      <div className="mb-1 flex h-[22px] shrink-0 items-start gap-1 overflow-hidden">
        {product.verified ? (
          <Badge variant="solid" className="px-1.5 py-0.5 text-[9.5px]">
            Verified™
          </Badge>
        ) : (
          <span className="invisible text-[9.5px]">Verified™</span>
        )}
        {discountLabel ? (
          <Badge
            variant="solid"
            className="border-wf-900 bg-wf-900 px-1.5 py-0.5 text-[9.5px]"
          >
            {discountLabel}
          </Badge>
        ) : null}
      </div>

      <Link href={href} className="hover:underline">
        <h3 className="line-clamp-2 min-h-[2.4em] text-[12.5px] font-semibold leading-snug text-wf-800">
          {product.title}
        </h3>
      </Link>

      <p className="mt-0.5 h-[14px] truncate text-[10.5px] text-wf-600">
        {product.brand}
      </p>

      <div className="mt-auto pt-1">
        <div className="flex min-h-[22px] flex-wrap items-baseline gap-1.5">
          {product.originalPriceCents && pct != null ? (
            <span className="text-[11px] text-wf-500 line-through">
              {formatEuroFromCents(product.originalPriceCents)}
            </span>
          ) : (
            <span className="invisible text-[11px]">€ 0,00</span>
          )}
          <span className="text-[15px] font-bold text-wf-900">
            {formatEuroFromCents(product.priceCents)}
          </span>
          {pct != null ? (
            <span className="text-[10px] font-bold text-wf-800">−{pct}%</span>
          ) : null}
        </div>

        <p className="mt-0.5 h-[16px] truncate text-[10.5px] font-semibold text-wf-700">
          {sellersLabel}
        </p>

        <p className="mt-0.5 flex h-[16px] items-center gap-1 text-[10.5px] text-wf-600">
          <span className="tracking-tighter text-wf-800" aria-hidden>
            {starsForRating(product.rating)}
          </span>
          <span className="truncate">
            {product.rating.toFixed(1).replace(".", ",")} ·{" "}
            {product.countryLabel}
          </span>
        </p>

        <Link href={href} className="mt-2.5 block">
          <Button type="button" variant="primary" className="h-9 w-full text-xs">
            {t("viewProductCta", locale)}
          </Button>
        </Link>
      </div>
    </article>
  )
}
