import Link from "next/link"
import { AdSlot } from "../homepage/ad-slot"
import { ListingResults } from "./listing-results"
import { PublicStorefrontChrome } from "./public-storefront-chrome"
import type { ListingProduct } from "../../_lib/listing-products"
import type { EmptyStateVariant } from "./listing-empty-state"

export type MarketplaceListingProps = {
  mode: "search" | "category"
  title: string
  meta: string
  breadcrumbLabel?: string
  emptyVariant: EmptyStateVariant
  searchQuery?: string
  showCategoryAdSlot?: boolean
  products: ListingProduct[]
}

/**
 * Marketplace Listing Template — sprint-1a/04-marketplace-listing-*.html
 * + marketplace-listing/spec.md. Productgrid via catalog API of seed-fallback.
 */
export function MarketplaceListing({
  mode,
  title,
  meta,
  breadcrumbLabel,
  emptyVariant,
  searchQuery,
  showCategoryAdSlot = false,
  products,
}: MarketplaceListingProps) {
  return (
    <PublicStorefrontChrome searchQuery={searchQuery}>
      <div className="page-head px-4 pt-[18px] tablet:px-8">
        {mode === "category" && breadcrumbLabel ? (
          <nav
            className="mb-2 text-[11.5px] text-wf-600"
            aria-label="Breadcrumb"
          >
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href="/categorie" className="hover:underline">
                  Categorieën
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="font-semibold text-wf-800" aria-current="page">
                {breadcrumbLabel}
              </li>
            </ol>
          </nav>
        ) : null}
        <h1 className="m-0 text-[16px] font-bold text-wf-900 tablet:text-[22px]">
          {title}
        </h1>
        <p className="mt-1 text-[10.5px] text-wf-600 tablet:text-[12.5px]">
          {meta}
        </p>
      </div>

      {showCategoryAdSlot ? (
        <div className="py-4">
          <AdSlot position={1} compact location="category" />
        </div>
      ) : null}

      <ListingResults
        products={products}
        emptyVariant={emptyVariant}
        searchQuery={searchQuery}
        categoryLabel={breadcrumbLabel}
      />
    </PublicStorefrontChrome>
  )
}
