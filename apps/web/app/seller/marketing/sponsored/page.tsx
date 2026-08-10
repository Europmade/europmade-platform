"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { KpiCard } from "../../_components/kpi-card"
import { DashboardSection } from "../../_components/dashboard-section"
import { formatEuro } from "../../../_components/storefront-shell"
import { DEMO_PRODUCTS } from "../../_lib/demo-data"
import { useDemoSponsored } from "../../_lib/demo-store"
import type { DemoSponsoredCampaign } from "../../_lib/demo-data-details"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t, tFormat } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"

/**
 * Sponsored Products — volledige MVP-demo.
 */
export default function SellerSponsoredProductsPage() {
  const locale = useStorefrontLocale()
  const [campaigns, setCampaigns] = useDemoSponsored()
  const [name, setName] = useState("")
  const [productId, setProductId] = useState(DEMO_PRODUCTS[0]?.id ?? "")
  const [cpc, setCpc] = useState("0.35")
  const [budget, setBudget] = useState("25")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [note, setNote] = useState<string | null>(null)

  const stats = useMemo(() => {
    const active = campaigns.filter((c) => c.status === "Actief").length
    const spend = campaigns.reduce((s, c) => s + c.spend, 0)
    const clicks = campaigns.reduce((s, c) => s + c.clicks, 0)
    return { active, spend, clicks }
  }, [campaigns])

  function createCampaign(e: FormEvent) {
    e.preventDefault()
    const product = DEMO_PRODUCTS.find((p) => p.id === productId)
    if (!name.trim() || !product || !startsAt || !endsAt) {
      setNote(t("sellerSponsoredNeedFields", locale))
      return
    }
    const campaign: DemoSponsoredCampaign = {
      id: `sp_${Date.now()}`,
      name: name.trim(),
      product_ids: [product.id],
      product_titles: [product.title],
      cpc: Number(cpc) || 0,
      daily_budget: Number(budget) || 0,
      starts_at: startsAt,
      ends_at: endsAt,
      status: "Actief",
      clicks: 0,
      spend: 0,
      conversions: 0,
    }
    setCampaigns((prev) => [campaign, ...prev])
    setName("")
    setNote(t("sellerSponsoredCreated", locale))
  }

  function setStatus(
    id: string,
    status: DemoSponsoredCampaign["status"],
    message: string
  ) {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    )
    setNote(message)
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavMarketing", locale), href: "/seller/marketing" },
        { label: t("sellerMktSponsoredTitle", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerMktSponsoredTitle", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("sellerSponsoredIntro", locale)}
      </p>

      {note ? (
        <Notice variant="info" className="mt-4">
          {note}
        </Notice>
      ) : null}

      <DashboardSection
        title={t("sellerSponsoredStats", locale)}
        wrapChildren={false}
      >
        <div className="mt-2 grid grid-cols-1 gap-4 tablet:grid-cols-3">
          <KpiCard
            value={String(stats.active)}
            label={t("sellerSponsoredActive", locale)}
            source="api"
          />
          <KpiCard
            value={formatEuro(stats.spend)}
            label={t("sellerSponsoredSpend", locale)}
            source="api"
          />
          <KpiCard
            value={String(stats.clicks)}
            label={t("sellerSponsoredClicks", locale)}
            source="api"
          />
        </div>
      </DashboardSection>

      <section className="mb-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerSponsoredCreate", locale)}
        </h2>
        <form
          onSubmit={createCampaign}
          className="rounded-lg border border-wf-300 bg-white px-5 py-5"
        >
          <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
            <Input
              label={t("sellerSponsoredName", locale)}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                {t("commonProduct", locale)}
              </label>
              <select
                className="h-9 w-full rounded-[5px] border border-wf-400 bg-white px-3 text-xs"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                {DEMO_PRODUCTS.filter((p) => p.listing === "live").map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label={t("sellerSponsoredCpc", locale)}
              type="number"
              step="0.01"
              min={0}
              value={cpc}
              onChange={(e) => setCpc(e.target.value)}
              required
            />
            <Input
              label={t("sellerSponsoredBudget", locale)}
              type="number"
              min={0}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
            />
            <Input
              label={t("commonStartDate", locale)}
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
            <Input
              label={t("commonEndDate", locale)}
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </div>
          <div className="mt-5">
            <Button type="submit">{t("sellerBannerStart", locale)}</Button>
          </div>
        </form>
      </section>

      {campaigns.length === 0 ? (
        <EmptyState
          title={t("sellerSponsoredEmptyTitle", locale)}
          description={t("sellerSponsoredEmptyDesc", locale)}
        />
      ) : (
        <section className="mb-8 overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full min-w-[720px] border-collapse text-xs">
            <thead>
              <tr>
                {[
                  t("sellerSponsoredCampaign", locale),
                  t("sellerNavProducts", locale),
                  t("sellerSponsoredCpc", locale),
                  t("sellerSponsoredBudget", locale),
                  t("sellerSponsoredDuration", locale),
                  t("sellerSponsoredStatsCol", locale),
                  t("commonStatus", locale),
                  t("commonActions", locale),
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
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-wf-200 last:border-b-0">
                  <td className="px-4 py-2.5 font-medium">{c.name}</td>
                  <td className="px-4 py-2.5">{c.product_titles.join(", ")}</td>
                  <td className="px-4 py-2.5">{formatEuro(c.cpc)}</td>
                  <td className="px-4 py-2.5">
                    {formatEuro(c.daily_budget)}
                    {t("commonPerDay", locale)}
                  </td>
                  <td className="px-4 py-2.5">
                    {c.starts_at} → {c.ends_at}
                  </td>
                  <td className="px-4 py-2.5">
                    {tFormat("sellerSponsoredStatsLine", locale, {
                      clicks: c.clicks,
                      spend: formatEuro(c.spend),
                      conversions: c.conversions,
                    })}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">
                      {statusLabel(c.status, locale)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-1">
                      {c.status !== "Actief" && c.status !== "Beëindigd" ? (
                        <button
                          type="button"
                          className="text-left underline"
                          onClick={() =>
                            setStatus(
                              c.id,
                              "Actief",
                              t("sellerSponsoredStarted", locale)
                            )
                          }
                        >
                          {t("commonStart", locale)}
                        </button>
                      ) : null}
                      {c.status === "Actief" ? (
                        <button
                          type="button"
                          className="text-left underline"
                          onClick={() =>
                            setStatus(
                              c.id,
                              "Gepauzeerd",
                              t("sellerSponsoredPaused", locale)
                            )
                          }
                        >
                          {t("commonPause", locale)}
                        </button>
                      ) : null}
                      {c.status !== "Beëindigd" ? (
                        <button
                          type="button"
                          className="text-left underline"
                          onClick={() =>
                            setStatus(
                              c.id,
                              "Beëindigd",
                              t("sellerSponsoredEnded", locale)
                            )
                          }
                        >
                          {t("commonEnd", locale)}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </SellerGate>
  )
}
