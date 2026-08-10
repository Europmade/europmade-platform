"use client"

import Link from "next/link"
import { SellerGate } from "../_components/seller-gate"
import { KpiCard } from "../_components/kpi-card"
import { DashboardSection } from "../_components/dashboard-section"
import { formatEuro } from "../../_components/storefront-shell"
import {
  DEMO_FINANCE,
  DEMO_PAYOUTS,
  DEMO_REVENUE_HISTORY,
} from "../_lib/demo-data"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t, tFormat } from "../../_lib/i18n/messages"
import { statusLabel } from "../../_lib/i18n/status-labels"

/**
 * Financiën — KPI's bovenaan met demo-data + omzethistorie.
 */
export default function SellerFinanceDashboardPage() {
  const locale = useStorefrontLocale()
  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavFinance", locale), href: "/seller/finance" },
        { label: t("sellerNavFinance", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerNavFinance", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("sellerFinanceIntro", locale)}
      </p>

      <DashboardSection title={t("commonOverview", locale)} wrapChildren={false}>
        <div className="mt-2 grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
          <KpiCard
            emphasis="primary"
            value={formatEuro(DEMO_FINANCE.available_balance)}
            label={t("sellerFinanceAvailableBalance", locale)}
            source="api"
          />
          <KpiCard
            value={formatEuro(DEMO_FINANCE.next_payout_amount)}
            label={t("sellerFinanceNextPayout", locale)}
            source="api"
            note={tFormat("sellerFinanceOnDate", locale, {
              date: DEMO_FINANCE.next_payout_date,
            })}
            href="/seller/finance/uitbetalingen"
            linkLabel={t("sellerFinancePayouts", locale)}
          />
          <KpiCard
            value={formatEuro(DEMO_FINANCE.open_commissions)}
            label={t("sellerFinanceOpenCommissions", locale)}
            source="api"
            href="/seller/finance/commissie"
            linkLabel={t("sellerFinanceCommission", locale)}
          />
          <KpiCard
            value={formatEuro(DEMO_FINANCE.marketing_costs)}
            label={t("sellerFinanceMarketingCosts", locale)}
            source="api"
            href="/seller/marketing/billing"
            linkLabel={t("sellerFinanceMarketingInvoices", locale)}
          />
        </div>
      </DashboardSection>

      <DashboardSection
        title={t("sellerFinanceRevenueHistory", locale)}
        wrapChildren={false}
      >
        <div className="mt-2 overflow-hidden rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {[t("sellerMonth", locale), t("sellerRevenue", locale)].map(
                  (h) => (
                    <th
                      key={h}
                      className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {[...DEMO_REVENUE_HISTORY].reverse().map((row) => (
                <tr
                  key={row.month}
                  className="border-b border-wf-200 last:border-b-0"
                >
                  <td className="px-4 py-2.5 text-wf-800">{row.month}</td>
                  <td className="px-4 py-2.5 text-wf-800">
                    {formatEuro(row.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardSection>

      <DashboardSection
        title={t("sellerFinanceOpenPayouts", locale)}
        wrapChildren={false}
      >
        <div className="mt-2 overflow-hidden rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {[
                  t("commonStatus", locale),
                  t("commonAmount", locale),
                  t("commonDate", locale),
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
              {DEMO_PAYOUTS.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-wf-200 last:border-b-0"
                >
                  <td className="px-4 py-2.5 text-wf-800">
                    {statusLabel(p.status, locale)}
                  </td>
                  <td className="px-4 py-2.5 text-wf-800">
                    {formatEuro(p.amount)}
                  </td>
                  <td className="px-4 py-2.5 text-wf-800">{p.eligible_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardSection>

      <section className="mb-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("commonShortcuts", locale)}
        </h2>
        <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
          {[
            {
              label: t("sellerFinanceCommissionOverview", locale),
              href: "/seller/finance/commissie",
            },
            {
              label: t("sellerFinanceDownloadInvoices", locale),
              href: "/seller/finance/facturen",
            },
            {
              label: t("sellerFinancePayouts", locale),
              href: "/seller/finance/uitbetalingen",
            },
            {
              label: t("sellerFinanceVatOss", locale),
              href: "/seller/finance/btw",
            },
          ].map((item, index, arr) => (
            <div
              key={item.href}
              className={`flex items-center justify-between px-4 py-3 text-xs text-wf-700 ${
                index < arr.length - 1 ? "border-b border-wf-200" : ""
              }`}
            >
              <span>{item.label}</span>
              <Link
                href={item.href}
                className="text-[11px] text-wf-800 underline"
              >
                {t("commonViewArrow", locale)}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </SellerGate>
  )
}
