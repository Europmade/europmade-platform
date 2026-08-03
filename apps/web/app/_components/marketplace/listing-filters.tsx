import { Checkbox } from "@europmade/ui"

const FILTER_GROUPS = [
  {
    legend: "Prijs",
    options: [
      { id: "price-0-100", label: "€0 – €100" },
      { id: "price-100-300", label: "€100 – €300" },
    ],
  },
  {
    legend: "Land van productie",
    options: [
      { id: "country-nl", label: "Nederland" },
      { id: "country-de", label: "Duitsland" },
    ],
  },
  {
    legend: "Korting",
    options: [{ id: "discount-only", label: "Alleen producten met korting" }],
  },
] as const

/**
 * CMP-034 Filters — wireframe-structuur.
 * Interactie wacht op Search/Catalog facet-API; UI is zichtbaar maar uitgeschakeld.
 */
export function ListingFilters({ className = "" }: { className?: string }) {
  return (
    <aside
      className={`rounded-lg border border-wf-300 p-4 ${className}`}
      aria-label="Filters"
    >
      <p className="mb-3 text-[11px] text-wf-500">
        Filters volgen zodra de productcatalogus live is.
      </p>
      {FILTER_GROUPS.map((group) => (
        <fieldset
          key={group.legend}
          className="mb-3 border-b border-wf-200 pb-3 last:mb-0 last:border-b-0 last:pb-0"
          disabled
        >
          <legend className="mb-2 text-xs font-bold text-wf-900">
            {group.legend}
          </legend>
          <div className="space-y-1.5">
            {group.options.map((opt) => (
              <Checkbox
                key={opt.id}
                id={opt.id}
                label={opt.label}
                disabled
                className="opacity-70"
              />
            ))}
          </div>
        </fieldset>
      ))}
    </aside>
  )
}
