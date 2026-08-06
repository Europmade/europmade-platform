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

/**
 * Affiliate Programma — volledige MVP-UI met demo-data.
 */
export default function SellerAffiliateProgramPage() {
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
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Marketing", href: "/seller/marketing" },
        { label: "Affiliate Programma" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Affiliate Programma</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Stel commissies in per product, categorie of algemeen. Beheer affiliates
        en bekijk statistieken.
      </p>

      <section className="mt-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Affiliate statistieken
        </h2>
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
          <KpiCard
            value={String(affiliates.length)}
            label="Aantal affiliates"
            source="api"
            note={`${activeCount} actief`}
          />
          <KpiCard
            value={formatEuro(totalSales)}
            label="Verkopen via affiliates"
            source="api"
          />
          <KpiCard
            value={formatEuro(totalPaid)}
            label="Uitgekeerde commissies"
            source="api"
          />
          <KpiCard
            value={formatEuro(totalOpen)}
            label="Openstaande commissies"
            source="api"
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Affiliatebeheer
        </h2>
        {affiliates.length === 0 ? (
          <EmptyState
            title="Geen affiliates"
            description="Affiliates die jouw producten promoten verschijnen hier."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {[
                    "Affiliate",
                    "Status",
                    "Verkopen",
                    "Omzet",
                    "Uitgekeerd",
                    "Open",
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
                      <Badge variant="outline">{a.status}</Badge>
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
            Commissieprioriteit
          </h2>
          <span
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-wf-500 text-[10px] font-semibold text-wf-700"
            title="Bij een verkoop wordt eerst gekeken of er een productcommissie is. Zo niet, dan categoriecommissie. Anders geldt de algemene commissie."
          >
            ?
          </span>
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-xs text-wf-800">
          <li>Productcommissie</li>
          <li>Categoriecommissie</li>
          <li>Algemene commissie</li>
        </ol>
        <p className="mt-2 text-[11.5px] text-wf-600">
          De hoogste prioriteit die van toepassing is, bepaalt de effectieve
          commissie voor een verkoop.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Algemene commissie
        </h2>
        <div className="max-w-sm rounded-lg border border-wf-300 bg-white px-5 py-4">
          <Input
            label="Standaard commissie (%)"
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
            placeholder="bijv. 8"
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Commissie per categorie
        </h2>
        <div className="mb-3 grid grid-cols-1 gap-3 rounded-lg border border-wf-300 bg-white px-5 py-4 tablet:grid-cols-[1fr_140px_auto]">
          <Input
            label="Categorie"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="Categorienaam"
          />
          <Input
            label="Commissie %"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={categoryPercent}
            onChange={(e) => setCategoryPercent(e.target.value)}
          />
          <div className="flex items-end">
            <Button type="button" onClick={addCategory}>
              Toevoegen
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {["Categorie", "Commissie %"].map((h) => (
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
          Commissie per product
        </h2>
        <div className="mb-3 grid grid-cols-1 gap-3 rounded-lg border border-wf-300 bg-white px-5 py-4 tablet:grid-cols-[1fr_140px_auto]">
          <Input
            label="Product"
            value={productTitle}
            onChange={(e) => setProductTitle(e.target.value)}
            placeholder="Producttitel"
          />
          <Input
            label="Commissie %"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={productPercent}
            onChange={(e) => setProductPercent(e.target.value)}
          />
          <div className="flex items-end">
            <Button type="button" onClick={addProduct}>
              Toevoegen
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {["Product", "Commissie %"].map((h) => (
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
          onClick={() =>
            setSaveNote("Instellingen lokaal bijgewerkt (demo).")
          }
        >
          Opslaan
        </Button>
      </div>
    </SellerGate>
  )
}
