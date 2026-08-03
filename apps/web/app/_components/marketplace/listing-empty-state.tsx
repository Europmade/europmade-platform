import Link from "next/link"
import { Button } from "@europmade/ui"

export type EmptyStateVariant = "search" | "category" | "catalog-pending"

type ListingEmptyStateProps = {
  variant: EmptyStateVariant
  query?: string
  categoryLabel?: string
}

/**
 * CMP-036 Empty State — copy-varianten uit marketplace-listing/spec.md §2.2 / §4.
 */
export function ListingEmptyState({
  variant,
  query,
  categoryLabel,
}: ListingEmptyStateProps) {
  let title: string
  let body: string

  if (variant === "catalog-pending") {
    title = "Binnenkort beschikbaar"
    body =
      "De productcatalogus wordt nog opgeleverd. Filters, sortering en productkaarten volgen zodra listing live is — je kunt al wel alle categorieën bekijken."
  } else if (variant === "search") {
    title = query
      ? `Geen resultaten voor “${query}”`
      : "Geen zoekresultaten"
    body =
      "Probeer een andere zoekterm, of bekijk een categorie. De volledige zoekindex volgt met de productlisting."
  } else {
    title = categoryLabel
      ? `Nog geen producten in ${categoryLabel}`
      : "Nog geen producten in deze categorie"
    body =
      "Deze categorie is klaar voor producten. Zodra partners aanbod publiceren, verschijnt het hier."
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
            Bekijk categorieën
          </Button>
        </Link>
        <Link href="/">
          <Button type="button" variant="primary">
            Naar homepage
          </Button>
        </Link>
      </div>
    </div>
  )
}
