"use client"

import { useState } from "react"
import { Badge, Button, Input } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { KpiCard } from "../../_components/kpi-card"
import { formatEuro } from "../../../_components/storefront-shell"
import {
  DEMO_AFFILIATES,
  DEMO_AFFILIATE_SETTINGS,
} from "../../_lib/demo-data"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t, tFormat } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"

/**
 * Affiliate Programma — volledige MVP-UI met demo-data.
 */
export default function SellerAffiliateProgramPage() {
  const locale = useStorefrontLocale()
  const [settings, setSettings] = useState(DEMO_AFFILIATE_SETTINGS)
  const [defaultInput, setDefaultInput] = useState(
    String(DEMO_AFFILIATE_SETTINGS.default_commission_percent)
  )
  const [categoryName, setCategoryName] = useState("")
  const [categoryPercent, setCategoryPercent] = useState("")
  const [productTitle, setProductTitle] = useState("")
  const [productPercent, setProductPercent] = useState("")
  const [saveNote, setSaveNote] = useState<string | null>(null)

  const affiliates = DEMO_AFFILIATES
  const totalSales = affiliates.reduce((s, a) => s + a.sales_amount, 0)
  const totalPaid = affiliates.reduce((s, a) => s + a.commission_paid, 0)
  const totalOpen = affiliates.reduce((s, a) => s + a.commission_open, 0)
  const activeCount = affiliates.filter((a) => a.status === "Actief").length

  function addCategory() {
    const percent = Number(categoryPercent)
    if (!categoryName.trim() || !Number.isFinite(percent)) return
    setSettings((s) => ({
      ...s,
      category_commissions: [
        ...s.category_commissions,
        {
          category_id: `local-cat-${Date.now()}`,
          category_name: categoryName.trim(),
          commission_percent: percent,
        },
      ],
    }))
    setCategoryName("")
    setCategoryPercent("")
  }

  function addProduct() {
    const percent = Number(productPercent)
    if (!productTitle.trim() || !Number.isFinite(percent)) return
    setSettings((s) => ({
      ...s,
      product_commissions: [
        ...s.product_commissions,
        {
          product_id: `local-prod-${Date.now()}`,
          product_title: productTitle.trim(),
          commission_percent: percent,
        },
      ],
    }))
    setProductTitle("")
    setProductPercent("")
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavMarketing", locale), href: "/seller/marketing" },
        { label: t("sellerMktAffiliateTitle", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerMktAffiliateTitle", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("sellerAffiliateIntro", locale)}
      </p>

      <section className="mt-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerAffiliateStats", locale)}
        </h2>
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
          <KpiCard
            value={String(affiliates.length)}
            label={t("sellerAffiliateCount", locale)}
            source="api"
            note={tFormat("sellerAffiliateActiveNote", locale, {
              count: activeCount,
            })}
          />
          <KpiCard
            value={formatEuro(totalSales)}
            label={t("sellerAffiliateSales", locale)}
            source="api"
          />
          <KpiCard
            value={formatEuro(totalPaid)}
            label={t("sellerAffiliatePaid", locale)}
            source="api"
          />
          <KpiCard
            value={formatEuro(totalOpen)}
            label={t("sellerAffiliateOpen", locale)}
            source="api"
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerAffiliateManage", locale)}
        </h2>
        {affiliates.length === 0 ? (
          <EmptyState
            title={t("sellerAffiliateEmptyTitle", locale)}
            description={t("sellerAffiliateEmptyDesc", locale)}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {[
                    t("sellerAffiliateCol", locale),
                    t("commonStatus", locale),
                    t("sellerAffiliateSalesCount", locale),
                    t("sellerRevenue", locale),
                    t("sellerAffiliatePaidCol", locale),
                    t("sellerAffiliateOpenCol", locale),
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
                {affiliates.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-wf-200 last:border-b-0"
                  >
                    <td className="px-4 py-2.5 text-wf-800">{a.name}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline">
                        {statusLabel(a.status, locale)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-wf-800">{a.sales_count}</td>
                    <td className="px-4 py-2.5 text-wf-800">
                      {formatEuro(a.sales_amount)}
                    </td>
                    <td className="px-4 py-2.5 text-wf-800">
                      {formatEuro(a.commission_paid)}
                    </td>
                    <td className="px-4 py-2.5 text-wf-800">
                      {formatEuro(a.commission_open)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 rounded-lg border border-wf-300 bg-white px-5 py-4">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-[12px] uppercase tracking-[0.04em] text-wf-500">
            {t("sellerAffiliatePriority", locale)}
          </h2>
          <span
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-wf-500 text-[10px] font-semibold text-wf-700"
            title={t("sellerAffiliatePriorityTip", locale)}
          >
            ?
          </span>
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-xs text-wf-800">
          <li>{t("sellerAffiliatePriority1", locale)}</li>
          <li>{t("sellerAffiliatePriority2", locale)}</li>
          <li>{t("sellerAffiliatePriority3", locale)}</li>
        </ol>
        <p className="mt-2 text-[11.5px] text-wf-600">
          {t("sellerAffiliatePriorityNote", locale)}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerAffiliateDefault", locale)}
        </h2>
        <div className="max-w-sm rounded-lg border border-wf-300 bg-white px-5 py-4">
          <Input
            label={t("sellerAffiliateDefaultPct", locale)}
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={defaultInput}
            onChange={(e) => {
              setDefaultInput(e.target.value)
              const n = Number(e.target.value)
              setSettings((s) => ({
                ...s,
                default_commission_percent: Number.isFinite(n) ? n : 0,
              }))
            }}
            placeholder={t("sellerAffiliateDefaultPlaceholder", locale)}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerAffiliatePerCategory", locale)}
        </h2>
        <div className="mb-3 grid grid-cols-1 gap-3 rounded-lg border border-wf-300 bg-white px-5 py-4 tablet:grid-cols-[1fr_140px_auto]">
          <Input
            label={t("commonCategory", locale)}
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder={t("sellerAffiliateCategoryName", locale)}
          />
          <Input
            label={t("sellerAffiliateCommissionPct", locale)}
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={categoryPercent}
            onChange={(e) => setCategoryPercent(e.target.value)}
          />
          <div className="flex items-end">
            <Button type="button" onClick={addCategory}>
              {t("commonAdd", locale)}
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {[
                  t("commonCategory", locale),
                  t("sellerAffiliateCommissionPct", locale),
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
              {settings.category_commissions.map((row) => (
                <tr
                  key={row.category_id}
                  className="border-b border-wf-200 last:border-b-0"
                >
                  <td className="px-4 py-2.5">{row.category_name}</td>
                  <td className="px-4 py-2.5">{row.commission_percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerAffiliatePerProduct", locale)}
        </h2>
        <div className="mb-3 grid grid-cols-1 gap-3 rounded-lg border border-wf-300 bg-white px-5 py-4 tablet:grid-cols-[1fr_140px_auto]">
          <Input
            label={t("commonProduct", locale)}
            value={productTitle}
            onChange={(e) => setProductTitle(e.target.value)}
            placeholder={t("sellerAffiliateProductTitle", locale)}
          />
          <Input
            label={t("sellerAffiliateCommissionPct", locale)}
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={productPercent}
            onChange={(e) => setProductPercent(e.target.value)}
          />
          <div className="flex items-end">
            <Button type="button" onClick={addProduct}>
              {t("commonAdd", locale)}
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {[
                  t("commonProduct", locale),
                  t("sellerAffiliateCommissionPct", locale),
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
              {settings.product_commissions.map((row) => (
                <tr
                  key={row.product_id}
                  className="border-b border-wf-200 last:border-b-0"
                >
                  <td className="px-4 py-2.5">{row.product_title}</td>
                  <td className="px-4 py-2.5">{row.commission_percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {saveNote ? (
        <p className="mt-4 text-xs text-wf-600">{saveNote}</p>
      ) : null}

      <div className="mt-6">
        <Button
          type="button"
          onClick={() => setSaveNote(t("sellerAffiliateSaved", locale))}
        >
          {t("commonSave", locale)}
        </Button>
      </div>
    </SellerGate>
  )
}
