"use client"

import type { ReactNode } from "react"

export function CmsSectionFrame({
  id,
  selected,
  interactive,
  className = "",
  children,
}: {
  id: string
  selected?: boolean
  interactive?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div
      data-cms-section={id}
      className={`${className} ${
        selected ? "relative z-[2] outline outline-2 outline-offset-[-2px] outline-sky-400" : ""
      } ${interactive ? "cursor-pointer" : ""}`}
    >
      {children}
    </div>
  )
}
