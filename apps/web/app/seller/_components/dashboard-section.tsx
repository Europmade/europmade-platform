"use client"

import type { ReactNode } from "react"

type DashboardSectionProps = {
  title: string
  children: ReactNode
  className?: string
  wrapChildren?: boolean
}

/** Dashboardsectie met uppercase titel — zelfde patroon als Admin. */
export function DashboardSection({
  title,
  children,
  className = "",
  wrapChildren = true,
}: DashboardSectionProps) {
  return (
    <section className={`mb-8 ${className}`}>
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
    </section>
  )
}
