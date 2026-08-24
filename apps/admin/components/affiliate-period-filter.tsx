"use client"

import {
  AFFILIATE_PERFORMANCE_PERIODS,
  type AffiliatePerformancePeriodDays,
} from "../lib/affiliate-admin-api"

type AffiliatePeriodFilterProps = {
  value: AffiliatePerformancePeriodDays
  onChange: (days: AffiliatePerformancePeriodDays) => void
  id?: string
  className?: string
}

/** F9.1 — 7 / 30 / 90 dagen (rolling), default 30. */
export function AffiliatePeriodFilter({
  value,
  onChange,
  id = "affiliate-performance-period",
  className = "",
}: AffiliatePeriodFilterProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="group"
      aria-label="Periode"
    >
      <label
        htmlFor={id}
        className="text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500"
      >
        Periode
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) =>
          onChange(Number(e.target.value) as AffiliatePerformancePeriodDays)
        }
        className="h-9 min-w-[140px] rounded-[5px] border border-wf-400 bg-white px-3 text-xs text-wf-800"
      >
        {AFFILIATE_PERFORMANCE_PERIODS.map((opt) => (
          <option key={opt.days} value={opt.days}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
