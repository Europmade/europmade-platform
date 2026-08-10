"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Badge, Button, FileUpload, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { KpiCard } from "../../_components/kpi-card"
import { DashboardSection } from "../../_components/dashboard-section"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import {
  BANNER_WEEKLY_PRICES,
  DEMO_BANNER_CAMPAIGNS,
  bannerTotalPrice,
  bannerWeeksBetween,
  type DemoBannerCampaign,
} from "../../_lib/demo-data"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../../_lib/i18n/locales"
import { t, tFormat, type StorefrontMessageKey } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"

type BannerPosition = keyof typeof BANNER_WEEKLY_PRICES

const POSITION_KEYS: Record<BannerPosition, StorefrontMessageKey> = {
  homepage: "sellerBannerPosHomepage",
  category: "sellerBannerPosCategory",
  search: "sellerBannerPosSearch",
  product: "sellerBannerPosProduct",
}

export default function SellerBannerCampaignsPage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
  const [campaigns] = useState<DemoBannerCampaign[]>(DEMO_BANNER_CAMPAIGNS)
  const [location, setLocation] = useState<BannerPosition>("homepage")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [formNote, setFormNote] = useState<string | null>(null)

  const weeks = useMemo(
    () => bannerWeeksBetween(startsAt, endsAt),
    [startsAt, endsAt]
  )
  const totalPrice = useMemo(
    () => bannerTotalPrice(location, startsAt, endsAt),
    [location, startsAt, endsAt]
  )
  const weeklyPrice = BANNER_WEEKLY_PRICES[location]
  const positions = Object.keys(POSITION_KEYS) as BannerPosition[]

  function positionLabel(pos: BannerPosition) {
    return t(POSITION_KEYS[pos], locale)
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "—"
    const d = new Date(iso)
    if (!Number.isFinite(d.getTime())) return "—"
    return d.toLocaleDateString(intl)
  }

  function handleStart(event: FormEvent) {
    event.preventDefault()
    if (!startsAt || !endsAt || totalPrice == null) {
      setFormNote(t("sellerBannerNeedDates", locale))
      return
    }
    setFormNote(
      tFormat("sellerBannerPrepared", locale, {
        location: positionLabel(location),
        weeks,
        price: formatEuro(totalPrice),
      })
    )
  }

  const selectClass =
    "h-9 w-full rounded-[5px] border border-wf-400 bg-white px-3 text-xs text-wf-800"

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavMarketing", locale), href: "/seller/marketing" },
        { label: t("sellerMktBannerTitle", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerMktBannerTitle", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("sellerBannerIntro", locale)}
      </p>

      <DashboardSection
        title={t("sellerBannerPriceOverview", locale)}
        wrapChildren={false}
      >
        <div className="mt-2 grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
          {(
            Object.entries(BANNER_WEEKLY_PRICES) as Array<
              [BannerPosition, number]
            >
          ).map(([key, price]) => (
            <KpiCard
              key={key}
              value={formatEuro(price)}
              label={`${positionLabel(key)} ${t("commonPerWeek", locale)}`}
              source="api"
            />
          ))}
        </div>
      </DashboardSection>

      <section className="mb-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          {t("sellerBannerNewCampaign", locale)}
        </h2>
        <form
          onSubmit={handleStart}
          className="rounded-lg border border-wf-300 bg-white px-5 py-5"
        >
          <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
            <div>
              <label
                htmlFor="banner-location"
                className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500"
              >
                {t("sellerBannerPosition", locale)}
              </label>
              <select
                id="banner-location"
                className={selectClass}
                value={location}
                onChange={(e) => setLocation(e.target.value as BannerPosition)}
              >
                {positions.map((loc) => (
                  <option key={loc} value={loc}>
                    {tFormat("sellerBannerPerWeekOption", locale, {
                      label: positionLabel(loc),
                      price: formatEuro(BANNER_WEEKLY_PRICES[loc]),
                    })}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-[5px] border border-wf-200 bg-wf-50 px-4 py-3 text-[11.5px] text-wf-700">
              <div className="font-semibold text-wf-800">
                {t("sellerBannerWeeklyPrice", locale)}
              </div>
              <div className="mt-1 text-[18px] font-bold text-wf-900">
                {formatEuro(weeklyPrice)}
              </div>
            </div>
            <div>
              <Input
                label={t("commonStartDate", locale)}
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                label={t("commonEndDate", locale)}
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <FileUpload
              label={t("sellerBannerUpload", locale)}
              requirementLabel={t("sellerBannerUploadReq", locale)}
              accept="image/jpeg,image/png"
              value={bannerFile}
              onChange={setBannerFile}
            />
          </div>

          <div className="mt-4 rounded-[5px] border border-wf-200 bg-wf-50 px-4 py-3 text-[11.5px] text-wf-700">
            <div className="font-semibold text-wf-800">
              {t("sellerBannerAutoPrice", locale)}
            </div>
            <div className="mt-1">
              {tFormat("sellerBannerWeeks", locale, {
                weeks: weeks > 0 ? weeks : "—",
              })}
            </div>
            <div className="mt-0.5">
              {tFormat("sellerBannerPricePerWeek", locale, {
                price: formatEuro(weeklyPrice),
              })}
            </div>
            <div className="mt-0.5 font-semibold text-wf-900">
              {tFormat("sellerBannerTotalPrice", locale, {
                price: totalPrice == null ? "—" : formatEuro(totalPrice),
              })}
            </div>
          </div>

          {formNote ? (
            <Notice variant="info" className="mt-4">
              {formNote}
            </Notice>
          ) : null}
          <div className="mt-5">
            <Button type="submit">{t("sellerBannerStart", locale)}</Button>
          </div>
        </form>
      </section>

      {campaigns.length === 0 ? (
        <EmptyState
          title={t("sellerBannerEmptyTitle", locale)}
          description={t("sellerBannerEmptyDesc", locale)}
        />
      ) : (
        <section className="mb-8">
          <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            {t("sellerBannerActive", locale)}
          </h2>
          <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {[
                    t("commonStatus", locale),
                    t("commonLocation", locale),
                    t("commonStartDate", locale),
                    t("commonEndDate", locale),
                    t("commonTotal", locale),
                    t("sellerBannerInvoiceStatus", locale),
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
                  <tr
                    key={c.id}
                    className="border-b border-wf-200 last:border-b-0"
                  >
                    <td className="px-4 py-2.5">
                      <Badge variant="outline">
                        {statusLabel(c.status, locale)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-wf-800">
                      {positionLabel(c.location)}
                    </td>
                    <td className="px-4 py-2.5 text-wf-800">
                      {formatDate(c.starts_at)}
                    </td>
                    <td className="px-4 py-2.5 text-wf-800">
                      {formatDate(c.ends_at)}
                    </td>
                    <td className="px-4 py-2.5 text-wf-800">
                      {formatEuro(c.cost)}
                    </td>
                    <td className="px-4 py-2.5 text-wf-800">
                      {statusLabel(c.invoice_status, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </SellerGate>
  )
}
