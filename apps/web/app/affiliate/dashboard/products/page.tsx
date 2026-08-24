"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { Button, Input, Notice } from "@europmade/ui"
import { AffiliateGate } from "../../_components/affiliate-gate"
import { AffiliateProductImage } from "../../_components/affiliate-product-image"
import {
  AffiliateApiError,
  estimateAffiliateCommission,
  getAffiliateCommissionSettings,
  type CommissionSettings,
} from "../../../_lib/affiliate-api"
import {
  CatalogApiError,
  listCatalogProducts,
  type CatalogListProduct,
} from "../../../_lib/catalog-api"
import { MARKETPLACE_CATEGORIES } from "../../../_lib/marketplace-categories"
import { localizeCategoryNames } from "../../../_lib/localize-category-names"
import { formatEuro } from "../../../_components/storefront-shell"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import {
  categoryNavLabel,
  t,
  tFormat,
} from "../../../_lib/i18n/messages"

function formatPrice(value: number | null): string {
  if (value == null) return "—"
  return formatEuro(Number(value))
}

export default function AffiliateProductsPage() {
  const locale = useStorefrontLocale()
  const [q, setQ] = useState("")
  const [category, setCategory] = useState("")
  const [products, setProducts] = useState<CatalogListProduct[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<CommissionSettings | null>(null)

  const inflight = useRef<AbortController | null>(null)

  const catalogLoadMessage = useCallback(
    (err: unknown): string => {
      if (err instanceof CatalogApiError) {
        if (err.status === 408 || /timeout/i.test(err.message)) {
          return t("affCatalogLoadFailed", locale)
        }
        return err.message
      }
      if (err instanceof AffiliateApiError) return err.message
      return t("affProductsLoadFailed", locale)
    },
    [locale]
  )

  const load = useCallback(
    async (query: string, cat: string) => {
      inflight.current?.abort()
      const ac = new AbortController()
      inflight.current = ac
      setLoading(true)
      setError(null)
      try {
        const [list, commission] = await Promise.all([
          listCatalogProducts({
            q: query.trim() || undefined,
            category: cat || undefined,
            limit: 48,
            offset: 0,
            region_code: "NL",
            signal: ac.signal,
          }),
          getAffiliateCommissionSettings(),
        ])
        if (ac.signal.aborted) return
        setSettings(commission)
        const sellable = (list.products || []).filter(
          (p) => p.offer_count > 0 && p.from_price != null
        )
        setProducts(sellable)
        setCount(sellable.length)
      } catch (err: unknown) {
        if (ac.signal.aborted) return
        if (err instanceof Error && err.name === "AbortError") return
        setProducts([])
        setCount(0)
        setError(catalogLoadMessage(err))
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    },
    [catalogLoadMessage]
  )

  useEffect(() => {
    void load("", "")
    return () => inflight.current?.abort()
  }, [load])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    void load(q, category)
  }

  return (
    <AffiliateGate
      breadcrumb={[
        { label: t("affiliateNavDashboard", locale), href: "/affiliate/dashboard" },
        { label: t("affiliateNavProducts", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("affiliateNavProducts", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {tFormat("affProductsIntro", locale, {
          rate: settings?.percentage_display ?? "…",
        })}
      </p>

      <form
        onSubmit={onSearch}
        className="mt-4 flex flex-col gap-3 tablet:flex-row tablet:items-end"
      >
        <div className="min-w-0 flex-1 [&>.mb-4]:mb-0">
          <Input
            label={t("searchLabel", locale)}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("affProductsSearchPlaceholder", locale)}
          />
        </div>
        <div className="w-full tablet:w-48">
          <label className="mb-[5px] block text-xs font-semibold text-wf-800">
            {t("searchFilterCategory", locale)}
          </label>
          <select
            className="h-10 w-full rounded-wf border border-wf-400 bg-white px-3 text-[13px] text-wf-900"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{t("affAll", locale)}</option>
            {MARKETPLACE_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {categoryNavLabel(c.slug, c.label, locale)}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={loading}
          className="h-10 w-full shrink-0 px-4 tablet:w-auto"
        >
          {loading ? t("loading", locale) : t("searchLabel", locale)}
        </Button>
      </form>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {!error ? (
        <p className="mt-4 text-[11px] text-wf-500">
          {loading
            ? t("loading", locale)
            : tFormat("affProductsSellableCount", locale, { count })}
        </p>
      ) : null}

      {!error && (loading || products.length > 0) ? (
        <div className="mt-3 overflow-hidden rounded-md border border-wf-300 bg-white">
          <table
            className="w-full border-collapse text-left text-xs"
            data-testid="affiliate-product-list"
          >
            <thead className="bg-wf-100 text-wf-700">
              <tr>
                <th className="w-[72px] px-2 py-2 font-semibold"> </th>
                <th className="px-2 py-2 font-semibold">
                  {t("affProductCol", locale)}
                </th>
                <th className="hidden px-2 py-2 font-semibold tablet:table-cell">
                  {t("affProductBrand", locale)}
                </th>
                <th className="hidden px-2 py-2 font-semibold desktop:table-cell">
                  {t("searchFilterCategory", locale)}
                </th>
                <th className="whitespace-nowrap px-2 py-2 font-semibold">
                  {t("affPrice", locale)}
                </th>
                <th className="whitespace-nowrap px-2 py-2 font-semibold">
                  {t("affProductCommissionLabel", locale)}
                </th>
                <th className="hidden whitespace-nowrap px-2 py-2 font-semibold tablet:table-cell">
                  {t("affEarnPerSale", locale)}
                </th>
                <th className="px-2 py-2 font-semibold">
                  {t("affActions", locale)}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-wf-600">
                    {t("affProductsLoading", locale)}
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const href = `/affiliate/dashboard/products/${encodeURIComponent(p.id)}`
                  const earnings =
                    p.from_price != null && settings
                      ? estimateAffiliateCommission(
                          p.from_price,
                          settings.percentage
                        )
                      : null
                  return (
                    <tr key={p.id} className="border-t border-wf-200 align-middle">
                      <td className="px-2 py-1.5">
                        <AffiliateProductImage
                          src={p.image_url}
                          alt={p.title}
                          variant="thumb"
                        />
                      </td>
                      <td className="max-w-[220px] px-2 py-1.5">
                        <Link
                          href={href}
                          className="line-clamp-2 font-semibold text-wf-900 hover:underline"
                        >
                          {p.title}
                        </Link>
                      </td>
                      <td className="hidden max-w-[140px] truncate px-2 py-1.5 text-wf-700 tablet:table-cell">
                        {p.brand_name || "—"}
                      </td>
                      <td className="hidden max-w-[160px] truncate px-2 py-1.5 text-wf-600 desktop:table-cell">
                        {p.category_names?.length
                          ? localizeCategoryNames(
                              p.category_names.slice(0, 2),
                              locale
                            )
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 font-medium text-wf-900">
                        {formatPrice(p.from_price)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-wf-800">
                        {settings?.percentage_display ?? "…"}
                      </td>
                      <td className="hidden whitespace-nowrap px-2 py-1.5 text-wf-800 tablet:table-cell">
                        {earnings != null ? formatEuro(earnings) : "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex flex-col gap-1 tablet:flex-row tablet:items-center">
                          <Link
                            href={href}
                            className="inline-flex h-7 items-center justify-center rounded-md border border-wf-400 px-2 text-[11px] font-semibold text-wf-800 hover:bg-wf-50"
                          >
                            {t("affDetails", locale)}
                          </Link>
                          <Link
                            href={`${href}?promote=1`}
                            className="inline-flex h-7 items-center justify-center rounded-md bg-wf-900 px-2 text-[11px] font-semibold text-white hover:bg-wf-800"
                          >
                            {t("affProductPromote", locale)}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && products.length === 0 && !error ? (
        <p className="mt-6 text-sm text-wf-600">
          {t("affProductsEmpty", locale)}
        </p>
      ) : null}
    </AffiliateGate>
  )
}
