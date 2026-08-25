"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FINANCE_PERIODS, type FinancePeriodKey } from "../lib/finance-admin-api"

const LINKS = [
  { href: "/finance", label: "Dashboard", exact: true },
  { href: "/finance/transactions", label: "Transacties" },
  { href: "/finance/sellers", label: "Sellers" },
  { href: "/finance/affiliates", label: "Affiliates" },
  { href: "/finance/payouts", label: "Uitbetalingen" },
  { href: "/finance/settlements", label: "Settlements" },
] as const

export function FinanceNav({
  period,
  onPeriodChange,
}: {
  period?: FinancePeriodKey
  onPeriodChange?: (key: FinancePeriodKey) => void
}) {
  const pathname = usePathname()

  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <nav className="flex flex-wrap gap-1" aria-label="Finance">
        {LINKS.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`)
          return (
            <Link
              key={link.href}
              href={
                period
                  ? `${link.href}?period=${encodeURIComponent(period)}`
                  : link.href
              }
              className={`rounded-[5px] px-3 py-1.5 text-xs font-medium ${
                active
                  ? "bg-wf-900 text-white"
                  : "border border-wf-300 bg-white text-wf-700"
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
      {onPeriodChange && period ? (
        <div className="flex items-center gap-2">
          <label
            htmlFor="finance-period"
            className="text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500"
          >
            Periode
          </label>
          <select
            id="finance-period"
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as FinancePeriodKey)}
            className="h-9 min-w-[140px] rounded-[5px] border border-wf-400 bg-white px-3 text-xs text-wf-800"
          >
            {FINANCE_PERIODS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  )
}
