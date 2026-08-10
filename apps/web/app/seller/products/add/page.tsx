"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import {
  matchByEan,
  ProductCloudApiError,
  type EanMatchResponse,
  type ProductCloudPreview,
} from "../../_lib/product-cloud-api"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t, tFormat, type StorefrontMessageKey } from "../../../_lib/i18n/messages"
import type { StorefrontLocale } from "../../../_lib/i18n/locales"

type View =
  | { kind: "search" }
  | { kind: "exact"; data: EanMatchResponse; ean: string }
  | { kind: "none"; ean: string }
  | { kind: "uncertain"; data: EanMatchResponse; ean: string }

function PreviewBlock({
  preview,
  ean,
  locale,
}: {
  preview: ProductCloudPreview
  ean: string
  locale: StorefrontLocale
}) {
  return (
    <div className="mb-4 rounded-lg border border-wf-200 p-5">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
        {t("sellerProductFound", locale)}
      </h3>
      <div className="flex justify-between py-1 text-[12.5px] text-wf-800">
        <span className="text-wf-600">{t("commonTitle", locale)}</span>
        <span>{preview.title ?? "—"}</span>
      </div>
      <div className="flex justify-between py-1 text-[12.5px] text-wf-800">
        <span className="text-wf-600">{t("commonBrand", locale)}</span>
        <span>{preview.brand_id}</span>
      </div>
      <div className="flex justify-between py-1 text-[12.5px] text-wf-800">
        <span className="text-wf-600">EAN</span>
        <span>{preview.identifier_value ?? ean}</span>
      </div>
      <div className="flex justify-between py-1 text-[12.5px] text-wf-800">
        <span className="text-wf-600">{t("commonCategory", locale)}</span>
        <span>
          {preview.category_names.length
            ? preview.category_names.join(" > ")
            : "—"}
        </span>
      </div>
    </div>
  )
}

function AiBox({
  ok,
  label,
  note,
}: {
  ok: boolean
  label: string
  note: string
}) {
  return (
    <div className="rounded-md border border-dashed border-wf-500 p-4 text-[11.5px] leading-relaxed text-wf-700">
      <div className="mb-1.5">
        <span className="font-bold text-wf-800">{ok ? "✓ " : "⚠ "}</span>
        {label}
      </div>
      <div>{note}</div>
    </div>
  )
}

export default function SellerProductAddPage() {
  const locale = useStorefrontLocale()
  const router = useRouter()
  const [ean, setEan] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>({ kind: "search" })

  async function onSearch() {
    const value = ean.trim()
    if (!value) {
      setError(t("sellerProductAddEanRequired", locale))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const data = await matchByEan(value)
      if (data.outcome === "exact_match") {
        setView({ kind: "exact", data, ean: value })
      } else if (data.outcome === "uncertain") {
        setView({ kind: "uncertain", data, ean: value })
      } else {
        setView({ kind: "none", ean: value })
      }
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("sellerProductAddSearchFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  const crumb = (
    lastKey: StorefrontMessageKey
  ): Array<{ label: string; href?: string }> => [
    { label: t("sellerDashboardTitle", locale), href: "/seller" },
    { label: t("sellerNavProducts", locale), href: "/seller/products" },
    { label: t(lastKey, locale) },
  ]

  const breadcrumb =
    view.kind === "exact"
      ? crumb("sellerProductMatchFound")
      : view.kind === "none"
        ? crumb("sellerProductNoMatch")
        : view.kind === "uncertain"
          ? crumb("sellerProductUncertain")
          : crumb("sellerProductAddTitle")

  return (
    <SellerGate breadcrumb={breadcrumb}>
      {view.kind === "search" ? (
        <>
          <h1 className="text-[19px] font-bold text-wf-900">
            {t("sellerProductAddTitle", locale)}
          </h1>
          <p className="mb-5 mt-1.5 text-xs text-wf-600">
            {t("sellerProductAddIntro", locale)}
          </p>
          <div className="mb-3.5 max-w-xl">
            <label className="mb-1.5 block text-xs font-semibold text-wf-700">
              {t("sellerProductAddEanLabel", locale)}
            </label>
            <Input
              value={ean}
              onChange={(e) => setEan(e.target.value)}
              placeholder="bijv. 8712345678901"
              onKeyDown={(e) => {
                if (e.key === "Enter") void onSearch()
              }}
            />
            <p className="mt-1 text-[10.5px] text-wf-500">
              {t("sellerProductAddEanHint", locale)}
            </p>
          </div>
          {error ? (
            <Notice variant="warning" className="mb-4 max-w-xl">
              {error}
            </Notice>
          ) : null}
          <div className="mt-5 flex justify-end gap-2.5">
            <Button
              variant="secondary"
              type="button"
              onClick={() => router.push("/seller/products")}
            >
              {t("commonCancel", locale)}
            </Button>
            <Button type="button" disabled={busy} onClick={() => void onSearch()}>
              {busy ? t("commonSearching", locale) : t("commonSearch", locale)}
            </Button>
          </div>
          <Notice className="mt-5 max-w-xl">
            {t("sellerProductAddResultHint", locale)}
          </Notice>
        </>
      ) : null}

      {view.kind === "exact" && view.data.product_preview ? (
        <>
          <h1 className="text-[19px] font-bold text-wf-900">
            {t("sellerProductMatchFound", locale)}
          </h1>
          <p className="mb-5 mt-1.5 text-xs text-wf-600">
            {t("sellerProductMatchFoundIntro", locale)}
          </p>
          <div className="grid gap-5 desktop:grid-cols-[1.7fr_1fr]">
            <div>
              <PreviewBlock
                preview={view.data.product_preview}
                ean={view.ean}
                locale={locale}
              />
              <div className="rounded-lg border border-wf-200 p-5">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                  {t("sellerProductYourOffer", locale)}
                </h3>
                  <div className="mb-3.5">
                  <label className="mb-1.5 block text-xs font-semibold text-wf-700">
                    {t("commonPrice", locale)}
                  </label>
                  <Input placeholder="€ 0,00" disabled />
                </div>
                <div className="mb-3.5">
                  <label className="mb-1.5 block text-xs font-semibold text-wf-700">
                    {t("commonStock", locale)}
                  </label>
                  <Input
                    placeholder={t("sellerProductQtyPlaceholder", locale)}
                    disabled
                  />
                </div>
                <Notice>{t("sellerProductOfferNextNotice", locale)}</Notice>
              </div>
            </div>
            <AiBox
              ok
              label={tFormat("sellerProductEanMatchLabel", locale, {
                label:
                  view.data.confidence_label ??
                  t("sellerProductEanMatchDefault", locale),
              })}
              note={
                view.data.confidence_note ??
                t("sellerProductAiDeterministic", locale)
              }
            />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5 border-t border-wf-300 bg-wf-100 px-0 py-4 tablet:px-0">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setView({ kind: "search" })
                setError(null)
              }}
            >
              {t("sellerProductBackToSearch", locale)}
            </Button>
            <Button
              type="button"
              disabled={
                !view.data.identifier_id &&
                !view.data.product_preview?.identifier_id
              }
              onClick={() => {
                const id =
                  view.data.identifier_id ??
                  view.data.product_preview?.identifier_id
                if (!id) {
                  setError(t("sellerProductIdentifierMissing", locale))
                  return
                }
                router.push(
                  `/seller/products/offer?identifier_id=${encodeURIComponent(id)}`
                )
              }}
            >
              {t("sellerProductCreateOffer", locale)}
            </Button>
          </div>
        </>
      ) : null}

      {view.kind === "none" ? (
        <>
          <h1 className="text-[19px] font-bold text-wf-900">
            {t("sellerProductNoMatch", locale)}
          </h1>
          <p className="mb-5 mt-1.5 text-xs text-wf-600">
            {t("sellerProductNoMatchIntro", locale)}
          </p>
          <div className="px-7 py-[60px] text-center text-wf-600">
            <div className="mx-auto mb-3.5 h-11 w-11 rounded-full border border-dashed border-wf-400" />
            <p className="mb-1.5 text-sm font-bold text-wf-800">
              {t("commonEmptyFilter", locale)}
            </p>
            <p className="text-xs text-wf-600">
              {tFormat("sellerProductNoMatchHint", locale, { ean: view.ean })}
            </p>
          </div>
          <div className="mt-5 flex justify-end gap-2.5">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setView({ kind: "search" })
                setError(null)
              }}
            >
              {t("sellerProductSearchAgain", locale)}
            </Button>
            <Link
              href="/seller/products/new"
              className="inline-flex items-center justify-center rounded-wf border border-transparent bg-wf-900 px-[18px] py-[9px] text-sm font-semibold text-white hover:bg-wf-800"
            >
              {t("sellerProductCreateNew", locale)}
            </Link>
          </div>
        </>
      ) : null}

      {view.kind === "uncertain" ? (
        <>
          <h1 className="text-[19px] font-bold text-wf-900">
            {t("sellerProductUncertain", locale)}
          </h1>
          <p className="mb-5 mt-1.5 text-xs text-wf-600">
            {t("sellerProductUncertainIntro", locale)}
          </p>
          <div className="mb-5 grid gap-5 desktop:grid-cols-[1.7fr_1fr]">
            <div>
              {(view.data.candidate_previews ?? []).length === 0 ? (
                <Notice>{t("sellerProductCandidatesNoPreview", locale)}</Notice>
              ) : (
                view.data.candidate_previews!.map((preview) => (
                  <PreviewBlock
                    key={preview.product_id}
                    preview={preview}
                    ean={view.ean}
                    locale={locale}
                  />
                ))
              )}
            </div>
            <AiBox
              ok={false}
              label={
                view.data.confidence_label ??
                t("sellerProductAiUncertainLabel", locale)
              }
              note={
                view.data.confidence_note ??
                t("sellerProductAiUncertainNote", locale)
              }
            />
          </div>
          <div className="mt-5 flex justify-end gap-2.5">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setView({ kind: "search" })
                setError(null)
              }}
            >
              {t("sellerProductSearchAgain", locale)}
            </Button>
            <Link
              href="/seller/products/new"
              className="inline-flex items-center justify-center rounded-wf border border-transparent bg-wf-900 px-[18px] py-[9px] text-sm font-semibold text-white hover:bg-wf-800"
            >
              {t("sellerProductCreateNew", locale)}
            </Link>
          </div>
        </>
      ) : null}
    </SellerGate>
  )
}
