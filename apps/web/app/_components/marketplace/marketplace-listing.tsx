import Link from "next/link"
import { AdSlot } from "../homepage/ad-slot"
import { ListingEmptyState, type EmptyStateVariant } from "./listing-empty-state"
import { ListingFilters } from "./listing-filters"
import { ListingPagination } from "./listing-pagination"
import { PublicStorefrontChrome } from "./public-storefront-chrome"

export type MarketplaceListingProps = {
  mode: "search" | "category"
  title: string
  meta: string
  /** Alleen categorie: breadcrumb-label. */
  breadcrumbLabel?: string
  emptyVariant: EmptyStateVariant
  searchQuery?: string
  showCategoryAdSlot?: boolean
}

/**
 * Marketplace Listing Template — sprint-1a/04-marketplace-listing-*.html
 * + marketplace-listing/spec.md. Productgrid wacht op Catalog/Search-API.
 */
export function MarketplaceListing({
  mode,
  title,
  meta,
  breadcrumbLabel,
  emptyVariant,
  searchQuery,
  showCategoryAdSlot = false,
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
          <AdSlot position={1} compact />
        </div>
      ) : null}

      {/* Mobiel: filters/sorteer-knoppen (wireframe toolbar-row) */}
      <div className="flex gap-2 px-4 py-3 tablet:hidden">
        <button
          type="button"
          disabled
          className="flex-1 rounded-md border border-wf-700 py-2 text-center text-[11.5px] font-semibold text-wf-400"
          title="Binnenkort beschikbaar"
        >
          Filters
        </button>
        <button
          type="button"
          disabled
          className="flex-1 rounded-md border border-wf-400 py-2 text-center text-[11.5px] text-wf-400"
          title="Binnenkort beschikbaar"
        >
          Sorteren ▾
        </button>
      </div>

      <div className="grid gap-5 px-4 pb-10 pt-2 tablet:grid-cols-[220px_1fr] tablet:gap-7 tablet:px-8 tablet:pb-10 tablet:pt-5">
        <div className="hidden tablet:block">
          <ListingFilters />
        </div>

        <div className="min-w-0">
          <div className="mb-4 hidden items-center justify-between tablet:flex">
            <p className="text-xs text-wf-600">0 producten</p>
            <select
              className="h-[34px] rounded-wf border border-wf-400 bg-white px-2.5 text-xs text-wf-400"
              disabled
              aria-label="Sorteren"
              defaultValue="popularity"
            >
              <option value="popularity">Sorteren: Populariteit</option>
            </select>
          </div>

          <ListingEmptyState
            variant={emptyVariant}
            query={searchQuery}
            categoryLabel={breadcrumbLabel}
          />

          <ListingPagination disabled />
        </div>
      </div>
    </PublicStorefrontChrome>
  )
}
