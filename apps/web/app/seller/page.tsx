"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { SellerGate } from "./_components/seller-gate"
import { KpiCard } from "./_components/kpi-card"
import { PeriodFilter } from "./_components/period-filter"
import { DashboardSection } from "./_components/dashboard-section"
import {
  isInPeriod,
  periodOptions,
  resolvePeriodRange,
  type PeriodKey,
} from "./_lib/period"
import { formatEuro } from "../_components/storefront-shell"
import {
  DEMO_MARKETING_INVOICES,
  DEMO_ORDERS,
  DEMO_PRODUCTS,
  DEMO_REVIEWS,
} from "./_lib/demo-data"
import { DEMO_RETURN_DETAILS } from "./_lib/demo-data-details"
import {
  listOwnProducts,
  ProductCloudApiError,
} from "./_lib/product-cloud-api"
import {
  listSellerMessageThreads,
  OrderServiceApiError,
} from "../_lib/order-service-api"
import { useStorefrontLocale } from "../_lib/i18n/use-storefront-locale"
import { t, tFormat } from "../_lib/i18n/messages"

/**
 * Seller Dashboard — periodefilter herberekent KPI's op demo-data,
 * behalve berichten-aandacht (live API: waiting_for_seller).
 */
export default function SellerDashboardPage() {
  const locale = useStorefrontLocale()
  const [period, setPeriod] = useState<PeriodKey>("this_month")
  const range = useMemo(() => resolvePeriodRange(period), [period])
  const options = periodOptions(locale)
  const periodLabel = options.find((o) => o.key === period)?.label ?? period
  const [attentionMessages, setAttentionMessages] = useState(0)
  const [pendingApprovals, setPendingApprovals] = useState(0)

  useEffect(() => {
    let cancelled = false
    listSellerMessageThreads("all")
      .then((res) => {
        if (cancelled) return
        setAttentionMessages(res.attention_count)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof OrderServiceApiError && err.status === 401) return
        setAttentionMessages(0)
      })
    listOwnProducts({ filter: "pending_approval" })
      .then((res) => {
        if (cancelled) return
        setPendingApprovals(res.count)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ProductCloudApiError && err.status === 401) return
        setPendingApprovals(0)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const periodOrders = useMemo(
    () => DEMO_ORDERS.filter((o) => isInPeriod(o.created_at, range)),
    [range]
  )
  const periodRevenue = useMemo(
    () =>
      Math.round(
        periodOrders.reduce((sum, o) => sum + o.total, 0) * 100
      ) / 100,
    [periodOrders]
  )
  const periodReturns = useMemo(
    () => DEMO_RETURN_DETAILS.filter((r) => isInPeriod(r.created_at, range)),
    [range]
  )
  const unreadMessages = attentionMessages
  const openReturns = periodReturns.filter((r) =>
    ["Aangevraagd", "Bevestigd", "Ontvangen"].includes(r.status)
  ).length
  const openInvoices = DEMO_MARKETING_INVOICES.filter(
    (i) => i.status !== "Betaald"
  ).length
  const productsOnline = DEMO_PRODUCTS.filter((p) => p.listing === "live").length
  const productsConcept = DEMO_PRODUCTS.filter(
    (p) => p.listing === "concept"
  ).length
  const productsInReview = pendingApprovals
  const unansweredReviews = DEMO_REVIEWS.filter((r) => !r.answered).length

  const revenueByMonth = useMemo(() => {
    const map = new Map<string, number>()
    for (const o of periodOrders) {
      const d = new Date(o.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      map.set(key, Math.round(((map.get(key) ?? 0) + o.total) * 100) / 100)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [periodOrders])

  const actions = [
    {
      label: tFormat("sellerNewMessages", locale, { count: unreadMessages }),
      href: "/seller/messages",
      show: unreadMessages > 0,
    },
    {
      label: tFormat("sellerProductsAwaiting", locale, {
        count: productsInReview,
      }),
      href: "/seller/products?filter=pending_approval",
      show: productsInReview > 0,
    },
    {
      label: tFormat("sellerOpenReturns", locale, { count: openReturns }),
      href: "/seller/returns",
      show: openReturns > 0,
    },
    {
      label: tFormat("sellerOpenInvoices", locale, { count: openInvoices }),
      href: "/seller/marketing/billing",
      show: openInvoices > 0,
    },
  ].filter((a) => a.show)

  const dateLocale =
    locale === "en"
      ? "en-GB"
      : locale === "de"
        ? "de-DE"
        : locale === "fr"
          ? "fr-FR"
          : "nl-NL"

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavDashboard", locale) },
      ]}
    >
      <div className="mb-5 flex flex-col gap-3 tablet:flex-row tablet:items-end tablet:justify-between">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">
            {t("sellerNavDashboard", locale)}
          </h1>
          <p className="mt-1.5 text-xs text-wf-600">
            {t("sellerDashboardIntro", locale)}
          </p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <p className="mb-5 text-[10.5px] text-wf-500">
        {t("sellerPeriod", locale)}: {periodLabel}
        {range.from
          ? ` · ${t("sellerPeriodFrom", locale)} ${range.from.toLocaleDateString(dateLocale)}`
          : null}{" "}
        · Noordzee Ambacht BV
      </p>

      <section className="mb-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerActionRequired", locale)}
        </h2>
        <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
          {actions.length === 0 ? (
            <p className="px-[18px] py-4 text-xs text-wf-600">
              {t("sellerNoActions", locale)}
            </p>
          ) : (
            actions.map((item) => (
              <div
                key={item.href + item.label}
                className="flex items-center justify-between gap-3 border-b border-wf-200 px-[18px] py-3 text-xs text-wf-700 last:border-b-0"
              >
                <span>
                  <span className="mr-2 inline-block rounded-full border border-wf-700 px-2 py-0.5 text-[10px] font-semibold uppercase">
                    {t("sellerAction", locale)}
                  </span>
                  {item.label}
                </span>
                <Link
                  href={item.href}
                  className="shrink-0 text-[11px] text-wf-800 underline"
                >
                  {t("sellerOpen", locale)}
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      <DashboardSection
        title={t("sellerPerformance", locale)}
        wrapChildren={false}
      >
        <div className="mb-4 grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
          <KpiCard
            emphasis="primary"
            periodKey={period}
            value={formatEuro(periodRevenue)}
            label={t("sellerRevenue", locale)}
            source="api"
            href="/seller/finance"
            linkLabel={t("sellerNavFinance", locale)}
          />
          <KpiCard
            periodKey={period}
            value={String(periodOrders.length)}
            label={t("sellerNavOrders", locale)}
            source="api"
            href="/seller/orders"
            linkLabel={t("sellerNavOrders", locale)}
          />
          <KpiCard
            value={String(productsOnline)}
            label={t("sellerProductsOnline", locale)}
            source="api"
            note={tFormat("sellerInConcept", locale, {
              count: productsConcept,
            })}
            href="/seller/products"
            linkLabel={t("sellerNavProducts", locale)}
          />
          <KpiCard
            periodKey={period}
            value={String(periodReturns.length)}
            label={t("sellerNavReturns", locale)}
            source="api"
            href="/seller/returns"
            linkLabel={t("sellerNavReturns", locale)}
          />
          <KpiCard
            value={String(unreadMessages)}
            label={t("sellerNavMessages", locale)}
            source="api"
            note={tFormat("sellerMessagesAttentionCount", locale, {
              count: unreadMessages,
            })}
            href="/seller/messages"
            linkLabel={t("sellerNavMessages", locale)}
          />
          <KpiCard
            value={String(openInvoices)}
            label={t("sellerOpenInvoicesLabel", locale)}
            source="api"
            href="/seller/marketing/billing"
            linkLabel={t("sellerInvoices", locale)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-3">
          <KpiCard
            value={String(productsInReview)}
            label={t("sellerProductsInReview", locale)}
            source="api"
            href="/seller/products"
            linkLabel={t("sellerNavProducts", locale)}
          />
          <KpiCard
            value={String(unansweredReviews)}
            label={t("sellerReviewsAwaiting", locale)}
            source="api"
            href="/seller/reviews"
            linkLabel={t("sellerNavReviews", locale)}
          />
          <KpiCard
            value={String(openReturns)}
            label={t("sellerOpenReturnsLabel", locale)}
            source="api"
            href="/seller/returns"
            linkLabel={t("sellerNavReturns", locale)}
          />
        </div>
      </DashboardSection>

      <DashboardSection
        title={t("sellerRevenueByMonth", locale)}
        wrapChildren={false}
      >
        <div className="mt-2 overflow-hidden rounded-lg border border-wf-300 bg-white">
          {revenueByMonth.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-wf-600">
              {t("sellerNoRevenue", locale)}
            </p>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {[
                    t("sellerMonth", locale),
                    t("sellerRevenue", locale),
                    t("sellerShare", locale),
                  ].map((h) => (
                    <th
                      key={h}
                      className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {revenueByMonth.map(([month, revenue]) => {
                  const pct =
                    periodRevenue > 0
                      ? Math.round((revenue / periodRevenue) * 100)
                      : 0
                  return (
                    <tr
                      key={month}
                      className="border-b border-wf-200 last:border-b-0"
                    >
                      <td className="px-4 py-2.5 text-wf-800">{month}</td>
                      <td className="px-4 py-2.5 text-wf-800">
                        {formatEuro(revenue)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-wf-200">
                            <div
                              className="h-full bg-wf-800"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-wf-600">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </DashboardSection>
    </SellerGate>
  )
}
