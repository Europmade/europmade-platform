"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { t } from "../../_lib/i18n/messages"

export type EuropeanOwnershipView = {
  ownership_band: string
  ownership_band_label: string
  status: string
  verified_by_europmade: boolean
}

type Props = {
  data: EuropeanOwnershipView
  locale: StorefrontLocale
  brandName: string
  brandHref?: string
}

/**
 * Merknaam met (i) over Europees eigendom — los van Made in Europe-productie.
 */
export function EuropeanOwnershipBadge({
  data,
  locale,
  brandName,
  brandHref,
}: Props) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const statusLabel = data.verified_by_europmade
    ? t("euOwnershipVerified", locale)
    : t("euOwnershipDeclared", locale)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
      triggerRef.current?.focus()
    }
  }, [open])

  const brand = brandHref ? (
    <Link href={brandHref} className="font-semibold underline-offset-2 hover:underline">
      {brandName}
    </Link>
  ) : (
    <span className="font-semibold">{brandName}</span>
  )

  return (
    <div
      className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-wf-800"
      data-european-ownership-badge=""
    >
      <span className="text-wf-600">{t("brandLabel", locale)}</span>
      {brand}
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[14px] leading-none text-wf-600 transition-colors hover:bg-wf-100 hover:text-wf-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wf-900"
        aria-label={t("euOwnershipInfoAria", locale)}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">ⓘ</span>
      </button>
      <span className="font-semibold text-wf-900">
        {t("euOwnership", locale)} {data.ownership_band_label}
      </span>
      <span className="text-wf-600">
        {data.verified_by_europmade ? `✓ ${statusLabel}` : statusLabel}
      </span>

      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 tablet:items-center tablet:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            aria-label={t("vpClose", locale)}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-[1] flex max-h-[min(92vh,520px)] w-full max-w-lg flex-col rounded-t-2xl border border-wf-300 bg-white shadow-xl tablet:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-wf-200 px-4 py-3">
              <h2
                id={titleId}
                className="m-0 text-base font-bold leading-snug text-wf-900"
              >
                {t("euOwnership", locale)} {data.ownership_band_label}
              </h2>
              <button
                ref={closeRef}
                type="button"
                className="inline-flex h-8 shrink-0 items-center rounded-md px-2 text-sm font-semibold text-wf-700 hover:bg-wf-100"
                onClick={() => setOpen(false)}
              >
                {t("vpClose", locale)}
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4 text-sm text-wf-800">
              <p className="m-0 text-[13px] leading-relaxed text-wf-700">
                {t("euOwnershipTooltip", locale)}
              </p>
              <p className="mt-3 m-0 text-[13px] leading-relaxed text-wf-700">
                {t("euOwnershipDialogBody", locale)}
              </p>
              <p className="mt-3 m-0 text-[13px] font-semibold text-wf-900">
                {statusLabel}
              </p>
              {brandHref ? (
                <Link
                  href={brandHref}
                  className="mt-3 inline-block text-[12px] font-semibold text-wf-900 underline underline-offset-2"
                  onClick={() => setOpen(false)}
                >
                  {t("brandLabel", locale)} {brandName} ›
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
