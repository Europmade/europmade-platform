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

/**
 * Sponsored Products — volledige MVP-demo.
 */
export default function SellerSponsoredProductsPage() {
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
      setNote("Vul alle verplichte velden in.")
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
    setNote("Campagne aangemaakt en gestart.")
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
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Marketing", href: "/seller/marketing" },
        { label: "Sponsored Products" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Sponsored Products</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Campagnes aanmaken, budgetteren, pauzeren en beëindigen.
      </p>

      {note ? (
        <Notice variant="info" className="mt-4">
          {note}
        </Notice>
      ) : null}

      <DashboardSection title="Statistieken" wrapChildren={false}>
        <div className="mt-2 grid grid-cols-1 gap-4 tablet:grid-cols-3">
          <KpiCard
            value={String(stats.active)}
            label="Actieve campagnes"
            source="api"
          />
          <KpiCard
            value={formatEuro(stats.spend)}
            label="Besteed totaal"
            source="api"
          />
          <KpiCard value={String(stats.clicks)} label="Klikken" source="api" />
        </div>
      </DashboardSection>

      <section className="mb-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Campagne aanmaken
        </h2>
        <form
          onSubmit={createCampaign}
          className="rounded-lg border border-wf-300 bg-white px-5 py-5"
        >
          <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
            <Input
              label="Campagnenaam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                Product
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
              label="CPC (€)"
              type="number"
              step="0.01"
              min={0}
              value={cpc}
              onChange={(e) => setCpc(e.target.value)}
              required
            />
            <Input
              label="Dagelijks budget (€)"
              type="number"
              min={0}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
            />
            <Input
              label="Startdatum"
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
            <Input
              label="Einddatum"
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </div>
          <div className="mt-5">
            <Button type="submit">Campagne starten</Button>
          </div>
        </form>
      </section>

      {campaigns.length === 0 ? (
        <EmptyState
          title="Geen sponsored campagnes"
          description="Maak hierboven een campagne aan om producten in gesponsorde slots te tonen."
        />
      ) : (
        <section className="mb-8 overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full min-w-[720px] border-collapse text-xs">
            <thead>
              <tr>
                {[
                  "Campagne",
                  "Producten",
                  "CPC",
                  "Budget",
                  "Looptijd",
                  "Stats",
                  "Status",
                  "Acties",
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
                  <td className="px-4 py-2.5">{formatEuro(c.daily_budget)}/dag</td>
                  <td className="px-4 py-2.5">
                    {c.starts_at} → {c.ends_at}
                  </td>
                  <td className="px-4 py-2.5">
                    {c.clicks} klikken · {formatEuro(c.spend)} · {c.conversions}{" "}
                    conv.
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">{c.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-1">
                      {c.status !== "Actief" && c.status !== "Beëindigd" ? (
                        <button
                          type="button"
                          className="text-left underline"
                          onClick={() =>
                            setStatus(c.id, "Actief", "Campagne gestart.")
                          }
                        >
                          Starten
                        </button>
                      ) : null}
                      {c.status === "Actief" ? (
                        <button
                          type="button"
                          className="text-left underline"
                          onClick={() =>
                            setStatus(c.id, "Gepauzeerd", "Campagne gepauzeerd.")
                          }
                        >
                          Pauzeren
                        </button>
                      ) : null}
                      {c.status !== "Beëindigd" ? (
                        <button
                          type="button"
                          className="text-left underline"
                          onClick={() =>
                            setStatus(c.id, "Beëindigd", "Campagne beëindigd.")
                          }
                        >
                          Beëindigen
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
