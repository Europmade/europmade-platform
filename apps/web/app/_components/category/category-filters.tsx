"use client"

import { Checkbox } from "@europmade/ui"
import type { ResolvedCategoryFilterGroup } from "../../_lib/cms/resolve-category"
import { VERIFIED_FILTER_ID } from "../../_lib/category-listing"

type CategoryFiltersProps = {
  filtersLabel: string
  verifiedLabel: string
  clearLabel: string
  filterGroups: ResolvedCategoryFilterGroup[]
  activeFilters: Set<string>
  onToggle: (id: string) => void
  onClear: () => void
  /**
   * MVP: all products are Verified — hide the toggle.
   * Keep prop + VERIFIED_FILTER_ID so it can return without redesign.
   */
  showVerifiedFilter?: boolean
}

/**
 * CMP-034 category filters — desktop sidebar / mobile expandable panel.
 * Groups come from CMS/AI per category (never a global hardcoded set).
 */
export function CategoryFilters({
  filtersLabel,
  verifiedLabel,
  clearLabel,
  filterGroups,
  activeFilters,
  onToggle,
  onClear,
  showVerifiedFilter = false,
}: CategoryFiltersProps) {
  return (
    <aside
      className="rounded-xl border border-wf-200 bg-white p-3.5 shadow-sm"
      aria-label={filtersLabel}
      data-filter-architecture="cms-ai"
      data-ai-filters-ready="true"
      data-verified-filter={showVerifiedFilter ? "visible" : "deferred"}
    >
      <h2 className="mb-3 text-[13px] font-bold text-wf-900">{filtersLabel}</h2>

      {showVerifiedFilter ? (
        <fieldset className="mb-3 border-b border-wf-100 pb-3">
          <legend className="sr-only">Verified™</legend>
          <Checkbox
            id={`filter-${VERIFIED_FILTER_ID}`}
            label={verifiedLabel}
            checked={activeFilters.has(VERIFIED_FILTER_ID)}
            onChange={() => onToggle(VERIFIED_FILTER_ID)}
          />
        </fieldset>
      ) : null}

      {filterGroups.map((group) => (
        <fieldset
          key={group.id}
          className="mb-3 border-b border-wf-100 pb-3 last:mb-0 last:border-b-0 last:pb-0"
          data-attribute-key={group.attributeKey}
        >
          <legend className="mb-2 text-[12px] font-bold text-wf-900">
            {group.label}
          </legend>
          <div className="space-y-1.5">
            {group.options.map((opt) => (
              <Checkbox
                key={opt.id}
                id={`filter-${opt.id}`}
                label={opt.label}
                checked={activeFilters.has(opt.id)}
                onChange={() => onToggle(opt.id)}
              />
            ))}
          </div>
        </fieldset>
      ))}

      {activeFilters.size > 0 ? (
        <button
          type="button"
          className="mt-1 text-[11px] font-semibold text-wf-700 underline"
          onClick={onClear}
        >
          {clearLabel}
        </button>
      ) : null}
    </aside>
  )
}
