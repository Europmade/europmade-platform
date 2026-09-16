"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import {
  ProductCloudApiError,
  searchExistingProducts,
  type ExistingProductSearchHit,
} from "../../_lib/product-cloud-api"
import { resolveSellerMediaUrl } from "../../_lib/media-url"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t, tFormat, type StorefrontMessageKey } from "../../../_lib/i18n/messages"
import type { StorefrontLocale } from "../../../_lib/i18n/locales"

type View =
  | { kind: "search" }
  | { kind: "results"; q: string; hits: ExistingProductSearchHit[]; count: number }
  | { kind: "none"; q: string }

function offerHref(hit: ExistingProductSearchHit): string | null {
  if (!hit.identifier_id) return null
  return `/seller/products/offer?identifier_id=${encodeURIComponent(hit.identifier_id)}`
}

function ResultCard({
  hit,
  locale,
  onSelect,
}: {
  hit: ExistingProductSearchHit
  locale: StorefrontLocale
  onSelect: (hit: ExistingProductSearchHit) => void
}) {
  const image = resolveSellerMediaUrl(hit.primary_image_url)
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-wf-200 p-4 tablet:flex-row">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded border border-wf-200 bg-wf-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 text-[12.5px] text-wf-800">
        <p className="font-semibold text-wf-900">
          {t("commonTitle", locale)}: {hit.title || "—"}
        </p>
        <p>
          {t("commonBrand", locale)}: {hit.brand_name || hit.brand_id || "—"}
        </p>
        <p>EAN: {hit.ean || "—"}</p>
        <p>MPN: {hit.mpn || "—"}</p>
        <p>
          {t("commonCategory", locale)}:{" "}
          {hit.category_names.length ? hit.category_names.join(" > ") : "—"}
        </p>
        <p className="font-mono text-[11px] text-wf-500">{hit.product_id}</p>
        <p>
          {hit.own_offer
            ? t("sellerProductOwnOfferYes", locale)
            : t("sellerProductOwnOfferNo", locale)}
        </p>
        <p className="mt-1 text-[11px] text-wf-600">
          {hit.certainty === "exact"
            ? t("sellerProductMatchExactEan", locale)
            : t("sellerProductMatchCandidate", locale)}
        </p>
      </div>
      <div className="flex items-end">
        <Button
          type="button"
          disabled={!hit.identifier_id}
          onClick={() => onSelect(hit)}
        >
          {t("sellerProductSelectExisting", locale)}
        </Button>
      </div>
    </li>
  )
}

export default function SellerProductAddPage() {
  const locale = useStorefrontLocale()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>({ kind: "search" })

  async function onSearch() {
    const value = query.trim()
    if (!value) {
      setError(t("sellerProductAddEanRequired", locale))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const data = await searchExistingProducts(value, 0, 20)
      if (!data.products.length) {
        setView({ kind: "none", q: value })
      } else {
        setView({
          kind: "results",
          q: value,
          hits: data.products,
          count: data.count,
        })
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

  function selectHit(hit: ExistingProductSearchHit) {
    const href = offerHref(hit)
    if (!href) {
      setError(t("sellerProductIdentifierMissing", locale))
      return
    }
    router.push(href)
  }

  const crumb = (
    lastKey: StorefrontMessageKey
  ): Array<{ label: string; href?: string }> => [
    { label: t("sellerDashboardTitle", locale), href: "/seller" },
    { label: t("sellerNavProducts", locale), href: "/seller/products" },
    { label: t(lastKey, locale) },
  ]

  const breadcrumb =
    view.kind === "results"
      ? crumb("sellerProductMatchFound")
      : view.kind === "none"
        ? crumb("sellerProductNoMatch")
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="bijv. beyerdynamic, 4010118718175 of ART-123"
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

      {view.kind === "results" ? (
        <>
          <h1 className="text-[19px] font-bold text-wf-900">
            {t("sellerProductMatchFound", locale)}
          </h1>
          <p className="mb-5 mt-1.5 text-xs text-wf-600">
            {tFormat("sellerProductResultsCount", locale, {
              count: view.count,
            })}
            {` · ${view.q}`}
          </p>
          {error ? (
            <Notice variant="warning" className="mb-4 max-w-xl">
              {error}
            </Notice>
          ) : null}
          <ul className="space-y-3">
            {view.hits.map((hit) => (
              <ResultCard
                key={hit.product_id}
                hit={hit}
                locale={locale}
                onSelect={selectHit}
              />
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5 border-t border-wf-300 py-4">
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
            <Link
              href="/seller/products/new"
              className="text-xs font-semibold underline"
            >
              {t("sellerProductNoMatch", locale)} — {t("sellerProductCreateNew", locale)}
            </Link>
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
              {t("sellerProductNoMatch", locale)}
            </p>
            <p className="text-xs text-wf-600">
              {tFormat("sellerProductNoMatchHint", locale, { ean: view.q })}
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
    </SellerGate>
  )
}
