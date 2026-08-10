"use client"

import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t } from "../../_lib/i18n/messages"
import { periodOptions, type PeriodKey } from "../_lib/period"

type PeriodFilterProps = {
  value: PeriodKey
  onChange: (key: PeriodKey) => void
  className?: string
}

/** Periodefilter — zelfde styling als Admin Dashboard. */
export function PeriodFilter({
  value,
  onChange,
  className = "",
}: PeriodFilterProps) {
  const locale = useStorefrontLocale()
  const options = periodOptions(locale)

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="group"
      aria-label={t("sellerPeriod", locale)}
    >
      <label
        htmlFor="seller-period-filter"
        className="text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500"
      >
        {t("sellerPeriod", locale)}
      </label>
      <select
        id="seller-period-filter"
        value={value}
        onChange={(e) => onChange(e.target.value as PeriodKey)}
        className="h-9 min-w-[160px] rounded-[5px] border border-wf-400 bg-white px-3 text-xs text-wf-800"
      >
        {options.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
