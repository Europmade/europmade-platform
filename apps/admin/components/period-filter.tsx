"use client"

import {
  PERIOD_OPTIONS,
  type PeriodKey,
  type PeriodOption,
} from "../lib/period"

type PeriodFilterProps = {
  value: PeriodKey
  onChange: (key: PeriodKey) => void
  className?: string
  /** Beperk de dropdown tot een subset (bijv. Control Center). */
  options?: PeriodOption[]
}

/** Generieke periodefilter — koppelt aan KPI-periodes in Control Center. */
export function PeriodFilter({
  value,
  onChange,
  className = "",
  options = PERIOD_OPTIONS,
}: PeriodFilterProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="group"
      aria-label="Periode"
    >
      <label
        htmlFor="admin-period-filter"
        className="text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500"
      >
        Periode
      </label>
      <select
        id="admin-period-filter"
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
