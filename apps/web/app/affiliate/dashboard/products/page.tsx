"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { Button, Input, Notice } from "@europmade/ui"
import { AffiliateGate } from "../../_components/affiliate-gate"
import { AffiliateProductImage } from "../../_components/affiliate-product-image"
import { AffiliateApiError } from "../../../_lib/affiliate-api"
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

type SortKey =
  | "name_asc"
  | "name_desc"
  | "brand_asc"
  | "brand_desc"
  | "category_asc"
  | "category_desc"
  | "price_asc"
  | "price_desc"
  | "commission_asc"
  | "commission_desc"
  | "earnings_asc"
  | "earnings_desc"
  | "newest"
  | "oldest"

const SERVER_SORT: Partial<Record<SortKey, string>> = {
  name_asc: "name_asc",
  name_desc: "name_desc",
  brand_asc: "brand_asc",
  brand_desc: "brand_desc",
  category_asc: "category_asc",
  category_desc: "category_desc",
  price_asc: "price_asc",
  price_desc: "price_desc",
  newest: "newest",
  oldest: "oldest",
  // Uniform platform rate → earnings order == price order
  commission_asc: "price_asc",
  commission_desc: "price_desc",
  earnings_asc: "price_asc",
  earnings_desc: "price_desc",
}

function SortMark({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <span className="ml-1 text-wf-400">↕</span>
  return <span className="ml-1 font-bold text-wf-900">{dir === "asc" ? "↑" : "↓"}</span>
}

export default function AffiliateProductsPage() {
  const locale = useStorefrontLocale()
  const [q, setQ] = useState("")
  const [category, setCategory] = useState("")
  const [sort, setSort] = useState<SortKey>("earnings_desc")
  const [products, setProducts] = useState<CatalogListProduct[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    async (query: string, cat: string, sortKey: SortKey) => {
      inflight.current?.abort()
      const ac = new AbortController()
      inflight.current = ac
      setLoading(true)
      setError(null)
      try {
        const list = await listCatalogProducts({
            q: query.trim() || undefined,
            category: cat || undefined,
            limit: 48,
            offset: 0,
            region_code: "NL",
            sort: SERVER_SORT[sortKey] ?? "popularity",
            signal: ac.signal,
          })
        if (ac.signal.aborted) return
        let sellable = (list.products || []).filter(
          (p) => p.offer_count > 0 && p.from_price != null
        )
        // Client refine for commission/earnings when rate available
        if (
          sortKey === "commission_asc" ||
          sortKey === "commission_desc" ||
          sortKey === "earnings_asc" ||
          sortKey === "earnings_desc"
        ) {
          const dir = sortKey.endsWith("_asc") ? 1 : -1
          const byRate = sortKey.startsWith("commission_")
          sellable = [...sellable].sort((a, b) => {
            const ea = byRate
              ? (a.affiliate_commission_percent ?? -1)
              : (a.affiliate_earnings ?? -1)
            const eb = byRate
              ? (b.affiliate_commission_percent ?? -1)
              : (b.affiliate_earnings ?? -1)
            return (ea - eb) * dir
          })
        }
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
    void load(q, category, sort)
    return () => inflight.current?.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial + sort/filter via handlers
  }, [load, sort])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    void load(q, category, sort)
  }

  function toggleSort(asc: SortKey, desc: SortKey) {
    setSort((prev) => (prev === desc ? asc : desc))
  }

  const sortDir = useMemo(() => {
    return sort.endsWith("_asc") || sort === "oldest" ? "asc" : "desc"
  }, [sort])

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
        {t("affProductsIntro", locale)}
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
            onChange={(e) => {
              setCategory(e.target.value)
              void load(q, e.target.value, sort)
            }}
          >
            <option value="">{t("affAll", locale)}</option>
            {MARKETPLACE_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {categoryNavLabel(c.slug, c.label, locale)}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full tablet:w-56">
          <label className="mb-[5px] block text-xs font-semibold text-wf-800">
            Sorteren
          </label>
          <select
            className="h-10 w-full rounded-wf border border-wf-400 bg-white px-3 text-[13px] text-wf-900"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            data-testid="affiliate-product-sort"
          >
            <option value="earnings_desc">Verdienste ↓</option>
            <option value="earnings_asc">Verdienste ↑</option>
            <option value="commission_desc">Affiliate commissie ↓</option>
            <option value="commission_asc">Affiliate commissie ↑</option>
            <option value="price_desc">Prijs ↓</option>
            <option value="price_asc">Prijs ↑</option>
            <option value="name_asc">Productnaam A–Z</option>
            <option value="name_desc">Productnaam Z–A</option>
            <option value="brand_asc">Merk A–Z</option>
            <option value="brand_desc">Merk Z–A</option>
            <option value="category_asc">Categorie A–Z</option>
            <option value="category_desc">Categorie Z–A</option>
            <option value="newest">Nieuwste</option>
            <option value="oldest">Oudste</option>
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
                  <button
                    type="button"
                    className="inline-flex items-center hover:underline"
                    onClick={() => toggleSort("name_asc", "name_desc")}
                  >
                    {t("affProductCol", locale)}
                    <SortMark
                      active={sort === "name_asc" || sort === "name_desc"}
                      dir={sort === "name_asc" ? "asc" : "desc"}
                    />
                  </button>
                </th>
                <th className="hidden px-2 py-2 font-semibold tablet:table-cell">
                  <button
                    type="button"
                    className="inline-flex items-center hover:underline"
                    onClick={() => toggleSort("brand_asc", "brand_desc")}
                  >
                    {t("affProductBrand", locale)}
                    <SortMark
                      active={sort === "brand_asc" || sort === "brand_desc"}
                      dir={sort === "brand_asc" ? "asc" : "desc"}
                    />
                  </button>
                </th>
                <th className="hidden px-2 py-2 font-semibold desktop:table-cell">
                  <button
                    type="button"
                    className="inline-flex items-center hover:underline"
                    onClick={() => toggleSort("category_asc", "category_desc")}
                  >
                    {t("searchFilterCategory", locale)}
                    <SortMark
                      active={
                        sort === "category_asc" || sort === "category_desc"
                      }
                      dir={sort === "category_asc" ? "asc" : "desc"}
                    />
                  </button>
                </th>
                <th className="whitespace-nowrap px-2 py-2 font-semibold">
                  <button
                    type="button"
                    className="inline-flex items-center hover:underline"
                    onClick={() => toggleSort("price_asc", "price_desc")}
                  >
                    {t("affPrice", locale)}
                    <SortMark
                      active={sort === "price_asc" || sort === "price_desc"}
                      dir={sort === "price_asc" ? "asc" : "desc"}
                    />
                  </button>
                </th>
                <th className="whitespace-nowrap px-2 py-2 font-semibold">
                  <button
                    type="button"
                    className="inline-flex items-center font-bold hover:underline"
                    onClick={() =>
                      toggleSort("commission_asc", "commission_desc")
                    }
                    data-testid="sort-commission"
                  >
                    {t("affProductCommissionLabel", locale)}
                    <SortMark
                      active={
                        sort === "commission_asc" || sort === "commission_desc"
                      }
                      dir={sortDir}
                    />
                  </button>
                </th>
                <th className="hidden whitespace-nowrap px-2 py-2 font-semibold tablet:table-cell">
                  <button
                    type="button"
                    className="inline-flex items-center font-bold hover:underline"
                    onClick={() => toggleSort("earnings_asc", "earnings_desc")}
                    data-testid="sort-earnings"
                  >
                    {t("affEarnPerSale", locale)}
                    <SortMark
                      active={
                        sort === "earnings_asc" || sort === "earnings_desc"
                      }
                      dir={sortDir}
                    />
                  </button>
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
                  const price = p.affiliate_offer_price ?? p.from_price
                  const earnings = p.affiliate_earnings ?? null
                  const commissionLabel =
                    p.affiliate_commission_label ||
                    (p.affiliate_commission_percent != null
                      ? `${p.affiliate_commission_percent}%`
                      : "—")
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
                        {formatPrice(price)}
                      </td>
                      <td
                        className="whitespace-nowrap px-2 py-1.5 text-wf-800"
                        data-testid="affiliate-commission-rate"
                      >
                        {commissionLabel}
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
