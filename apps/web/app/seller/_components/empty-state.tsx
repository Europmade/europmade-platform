"use client"

import Link from "next/link"
import { Button } from "@europmade/ui"

type EmptyStateProps = {
  title: string
  description: string
  primaryAction?: { label: string; href?: string; onClick?: () => void }
  secondaryAction?: { label: string; href?: string; onClick?: () => void }
}

/** Professionele empty state voor Seller Portal MVP. */
export function EmptyState({
  title,
  description,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-wf-300 bg-white px-7 py-[52px] text-center">
      <p className="mb-1.5 text-sm font-bold text-wf-800">{title}</p>
      <p className="mx-auto max-w-md text-xs text-wf-600">{description}</p>
      {(primaryAction || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {primaryAction ? (
            primaryAction.href ? (
              <Link
                href={primaryAction.href}
                className="inline-flex items-center justify-center rounded-wf border border-transparent bg-wf-900 px-[18px] py-[9px] text-sm font-semibold text-white hover:bg-wf-800"
              >
                {primaryAction.label}
              </Link>
            ) : (
              <Button type="button" onClick={primaryAction.onClick}>
                {primaryAction.label}
              </Button>
            )
          ) : null}
          {secondaryAction ? (
            secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className="inline-flex items-center justify-center rounded-wf border border-wf-500 bg-white px-[18px] py-[9px] text-sm font-semibold text-wf-800 hover:bg-wf-100"
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            )
          ) : null}
        </div>
      )}
    </div>
  )
}
