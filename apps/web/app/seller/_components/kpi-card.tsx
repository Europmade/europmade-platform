"use client"

import Link from "next/link"

export type KpiCardProps = {
  /** Weergegeven waarde; bij source=unavailable wordt dit overschreven. */
  value?: string
  label: string
  href?: string
  linkLabel?: string
  source?: "api" | "unavailable"
  /** Extra toelichting onder de waarde. */
  note?: string
  periodKey?: string
  className?: string
  emphasis?: "primary" | "default"
}

/**
 * KPI-vak — admin-stijl.
 * Ontbrekende backend: waarde = "Nog niet beschikbaar" (geen kale —, 0 of €).
 */
export function KpiCard({
  value,
  label,
  href,
  linkLabel,
  source = "api",
  note,
  periodKey,
  className = "",
  emphasis = "default",
}: KpiCardProps) {
  const unavailable = source === "unavailable"
  const displayValue = unavailable
    ? "Nog niet beschikbaar"
    : (value ?? "Nog niet beschikbaar")

  const valueClass = unavailable
    ? "text-[15px] font-semibold leading-snug text-wf-700"
    : emphasis === "primary"
      ? "text-[32px] font-bold leading-none text-wf-900"
      : "text-[26px] font-bold leading-none text-wf-900"

  return (
    <div
      className={`rounded-lg border border-wf-300 bg-white px-5 py-[18px] ${className}`}
      data-period={periodKey}
      data-kpi-source={source}
    >
      <div className={valueClass}>{displayValue}</div>
      <div className="mt-1.5 text-[11.5px] text-wf-600">{label}</div>
      {unavailable ? (
        <div className="mt-1 text-[10.5px] text-wf-500">
          {note && note !== "Nog niet beschikbaar"
            ? note
            : "Backend nog niet gekoppeld"}
        </div>
      ) : note ? (
        <div className="mt-1 text-[10.5px] text-wf-500">{note}</div>
      ) : null}
      {linkLabel && href ? (
        <Link
          href={href}
          className="mt-2 inline-block text-[11px] text-wf-700 underline"
        >
          ↳ {linkLabel}
        </Link>
      ) : null}
    </div>
  )
}
