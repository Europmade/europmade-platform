"use client"

type CategoryCountry = {
  id: string
  countryCode: string
  label: string
}

type CategoryCountryBlockProps = {
  title: string
  allLabel: string
  countries: CategoryCountry[]
  /** Single selected country code, or empty = all. Multi-select ready later. */
  selectedCode: string | null
  onChange: (countryCode: string | null) => void
}

/**
 * Productieland — premium select (CMS list).
 * Architecture ready for search + multi-select later (data attributes).
 */
export function CategoryCountryBlock({
  title,
  allLabel,
  countries,
  selectedCode,
  onChange,
}: CategoryCountryBlockProps) {
  if (countries.length === 0) return null

  return (
    <div
      className="mt-3 rounded-xl border border-wf-200 bg-white p-3.5 shadow-sm"
      data-country-select-mode="single"
      data-country-search-ready="false"
      data-country-multi-ready="false"
    >
      <label
        htmlFor="category-production-country"
        className="mb-2 block text-[12px] font-bold text-wf-900"
      >
        {title}
      </label>
      <div className="relative">
        <select
          id="category-production-country"
          value={selectedCode ?? ""}
          onChange={(e) => {
            const v = e.target.value
            onChange(v.length > 0 ? v : null)
          }}
          className="h-[38px] w-full appearance-none rounded-xl border border-wf-300 bg-white py-2 pl-3 pr-9 text-[12.5px] font-semibold text-wf-900 shadow-sm transition hover:border-wf-400 focus:border-wf-700 focus:outline-none focus:ring-2 focus:ring-wf-900/10"
        >
          <option value="">{allLabel}</option>
          {countries.map((c) => (
            <option key={c.id} value={c.countryCode}>
              {c.label}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-wf-500"
          aria-hidden
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 4.25L6 7.75L9.5 4.25"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  )
}
