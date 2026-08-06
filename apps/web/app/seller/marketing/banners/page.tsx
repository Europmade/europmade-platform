"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Badge, Button, FileUpload, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { KpiCard } from "../../_components/kpi-card"
import { DashboardSection } from "../../_components/dashboard-section"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import {
  BANNER_POSITION_LABELS,
  BANNER_WEEKLY_PRICES,
  DEMO_BANNER_CAMPAIGNS,
  bannerTotalPrice,
  bannerWeeksBetween,
  type DemoBannerCampaign,
} from "../../_lib/demo-data"

type BannerPosition = keyof typeof BANNER_WEEKLY_PRICES

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return "—"
  return d.toLocaleDateString("nl-NL")
}

/**
 * Banner Campagnes — vaste prijs per positie × aantal weken.
 */
export default function SellerBannerCampaignsPage() {
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

  function handleStart(event: FormEvent) {
    event.preventDefault()
    if (!startsAt || !endsAt || totalPrice == null) {
      setFormNote("Kies een bannerpositie, startdatum en einddatum.")
      return
    }
    setFormNote(
      `Campagne voorbereid: ${BANNER_POSITION_LABELS[location]} · ${weeks} week(en) · ${formatEuro(totalPrice)}. Publiceren volgt bij API-koppeling.`
    )
  }

  const selectClass =
    "h-9 w-full rounded-[5px] border border-wf-400 bg-white px-3 text-xs text-wf-800"

  const positions = Object.keys(BANNER_POSITION_LABELS) as BannerPosition[]

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Marketing", href: "/seller/marketing" },
        { label: "Banner Campagnes" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Banner Campagnes</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Koop een bannerpositie voor een vaste weekprijs. Totaalprijs = weken ×
        prijs per week.
      </p>

      <DashboardSection title="Prijsoverzicht" wrapChildren={false}>
        <div className="mt-2 grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
          {(
            Object.entries(BANNER_WEEKLY_PRICES) as Array<
              [BannerPosition, number]
            >
          ).map(([key, price]) => (
            <KpiCard
              key={key}
              value={formatEuro(price)}
              label={`${BANNER_POSITION_LABELS[key]} / week`}
              source="api"
            />
          ))}
        </div>
      </DashboardSection>

      <section className="mb-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Nieuwe campagne
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
                Bannerpositie
              </label>
              <select
                id="banner-location"
                className={selectClass}
                value={location}
                onChange={(e) =>
                  setLocation(e.target.value as BannerPosition)
                }
              >
                {positions.map((loc) => (
                  <option key={loc} value={loc}>
                    {BANNER_POSITION_LABELS[loc]} (
                    {formatEuro(BANNER_WEEKLY_PRICES[loc])}/week)
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-[5px] border border-wf-200 bg-wf-50 px-4 py-3 text-[11.5px] text-wf-700">
              <div className="font-semibold text-wf-800">Weekprijs</div>
              <div className="mt-1 text-[18px] font-bold text-wf-900">
                {formatEuro(weeklyPrice)}
              </div>
            </div>
            <div>
              <Input
                label="Startdatum"
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                label="Einddatum"
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <FileUpload
              label="Banner uploaden"
              requirementLabel="JPG of PNG, max. 10 MB"
              accept="image/jpeg,image/png"
              value={bannerFile}
              onChange={setBannerFile}
            />
          </div>

          <div className="mt-4 rounded-[5px] border border-wf-200 bg-wf-50 px-4 py-3 text-[11.5px] text-wf-700">
            <div className="font-semibold text-wf-800">
              Automatische prijsberekening
            </div>
            <div className="mt-1">
              Aantal weken: {weeks > 0 ? weeks : "—"}
            </div>
            <div className="mt-0.5">
              Prijs per week: {formatEuro(weeklyPrice)}
            </div>
            <div className="mt-0.5 font-semibold text-wf-900">
              Totaalprijs:{" "}
              {totalPrice == null ? "—" : formatEuro(totalPrice)}
            </div>
          </div>

          {formNote ? (
            <Notice variant="info" className="mt-4">
              {formNote}
            </Notice>
          ) : null}
          <div className="mt-5">
            <Button type="submit">Campagne starten</Button>
          </div>
        </form>
      </section>

      {campaigns.length === 0 ? (
        <EmptyState
          title="Geen banners"
          description="Maak hierboven een campagne aan om een bannerpositie te kopen."
        />
      ) : (
      <section className="mb-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Actieve campagnes
        </h2>
        <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {[
                  "Status",
                  "Locatie",
                  "Startdatum",
                  "Einddatum",
                  "Totaalprijs",
                  "Factuurstatus",
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
                    <Badge variant="outline">{c.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-wf-800">
                    {BANNER_POSITION_LABELS[c.location]}
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
                    {c.invoice_status}
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
