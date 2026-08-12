import Link from "next/link"
import { Button } from "@europmade/ui"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { t, tFormat } from "../../_lib/i18n/messages"

export type EmptyStateVariant = "search" | "category" | "catalog-pending"

type ListingEmptyStateProps = {
  variant: EmptyStateVariant
  query?: string
  categoryLabel?: string
  locale?: StorefrontLocale
}

/**
 * CMP-036 Empty State — copy-varianten uit marketplace-listing/spec.md §2.2 / §4.
 */
export function ListingEmptyState({
  variant,
  query,
  categoryLabel,
  locale = DEFAULT_STOREFRONT_LOCALE,
}: ListingEmptyStateProps) {
  let title: string
  let body: string

  if (variant === "catalog-pending") {
    title = t("listingPendingTitle", locale)
    body = t("listingPendingBody", locale)
  } else if (variant === "search") {
    title = query
      ? tFormat("searchEmptyForQuery", locale, { query })
      : t("commonEmptyFilter", locale)
    body = t("commonEmptyFilterHint", locale)
  } else {
    title = categoryLabel
      ? tFormat("categoryEmptyForLabel", locale, { category: categoryLabel })
      : t("emptyCategoryTitle", locale)
    body = t("emptyCategoryBody", locale)
  }

  return (
    <div
      role="status"
      className="rounded-lg border border-dashed border-wf-400 bg-wf-100 px-6 py-10 text-center"
    >
      <h2 className="text-base font-bold text-wf-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-wf-600">
        {body}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        <Link href="/categorie">
          <Button type="button" variant="secondary">
            {t("ctaBrowseCategories", locale)}
          </Button>
        </Link>
        <Link href="/">
          <Button type="button" variant="primary">
            {t("ctaHome", locale)}
          </Button>
        </Link>
      </div>
    </div>
  )
}
