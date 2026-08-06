"use client"

import type { ReactNode } from "react"
import type { DashboardExtensionKind } from "../lib/dashboard-sections"

type DashboardSectionProps = {
  title: string
  children: ReactNode
  /** Sprint 4: welke management-widgets deze sectie later kan hosten. */
  extensions?: DashboardExtensionKind[]
  /** Sprint 4: slot voor top-lijsten / groei-widgets — nu leeg laten. */
  extensionSlot?: ReactNode
  className?: string
  /** false = children bepalen zelf de layout (bijv. performance-hiërarchie). */
  wrapChildren?: boolean
}

/**
 * Herbruikbare dashboardsectie (KPI-grid + optioneel uitbreidingsslot).
 */
export function DashboardSection({
  title,
  children,
  extensions,
  extensionSlot,
  className = "",
  wrapChildren = true,
}: DashboardSectionProps) {
  return (
    <section
      className={`mb-8 ${className}`}
      data-dashboard-extensions={
        extensions && extensions.length > 0
          ? extensions.join(",")
          : undefined
      }
    >
      <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
        {title}
      </h2>
      {wrapChildren ? (
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
          {children}
        </div>
      ) : (
        children
      )}
      {extensionSlot ? <div className="mt-4">{extensionSlot}</div> : null}
    </section>
  )
}
