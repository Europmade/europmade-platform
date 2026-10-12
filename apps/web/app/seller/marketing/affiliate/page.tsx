"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { KpiCard } from "../../_components/kpi-card"
import { formatEuro } from "../../../_components/storefront-shell"
import { DEMO_AFFILIATES } from "../../_lib/demo-data"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t, tFormat } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"
import { medusaBackendUrl } from "../../../_lib/medusa-backend-url"
import {
  EUROPMADE_AFFILIATE_CONTRIBUTION_PERCENT,
  sellerAffiliateCommission,
} from "@europmade/utils"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

type SellerProduct = {
  id: string
  title: string
  ean: string | null
  sku: string | null
}

async function apiFetch(path: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
  }
  return fetch(`${medusaBackendUrl()}${path}`, { headers, credentials: "include" })
}

export default function SellerAffiliateProgramPage() {
  const locale = useStorefrontLocale()
  const [settings, setSettings] = useState({
    default_commission_percent: 8,
    product_commissions: [] as Array<{
      product_id: string
      product_title: string
      commission_percent: number
    }>,
  })
  const [defaultInput, setDefaultInput] = useState("8")
  const [saving, setSaving] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [productPercent, setProductPercent] = useState("")
  const [saveNote, setSaveNote] = useState<string | null>(null)
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [productsLoaded, setProductsLoaded] = useState(false)

  const affiliates = DEMO_AFFILIATES
  const totalSales = affiliates.reduce((s, a) => s + a.sales_amount, 0)
  const totalPaid = affiliates.reduce((s, a) => s + a.commission_paid, 0)
  const totalOpen = affiliates.reduce((s, a) => s + a.commission_open, 0)
  const activeCount = affiliates.filter((a) => a.status === "Actief").length

  const loadProducts = useCallback(async () => {
    try {
      const res = await apiFetch("/store/product-cloud/products")
      if (res.ok) {
        const data = await res.json()
        const prods = (data.products || []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          title: (p.title as string) || (p.name as string) || "—",
          ean: (p.ean as string) || null,
          sku: (p.sku as string) || null,
        }))
        setProducts(prods)
      }
    } catch { /* noop */ }
    setProductsLoaded(true)
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch("/store/partner/affiliate-commission")
        if (!res.ok) return
        const data = await res.json()
        const stored = data.settings
        if (cancelled || !stored) return
        setSettings({
          default_commission_percent: Number(stored.default_commission_percent),
          product_commissions: Array.isArray(stored.product_commissions)
            ? stored.product_commissions
            : [],
        })
        setDefaultInput(String(stored.default_commission_percent))
      } catch {
        /* bestaande pagina blijft bruikbaar */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function saveSettings() {
    setSaving(true)
    setSaveNote(null)
    try {
      const res = await fetch(`${medusaBackendUrl()}/store/partner/affiliate-commission`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
        },
        body: JSON.stringify({
          default_commission_percent: Number(defaultInput),
          product_commissions: settings.product_commissions,
        }),
      })
      if (!res.ok) {
        setSaveNote(t("sellerAffiliateSaveFailed", locale))
        return
      }
      const data = await res.json()
      const stored = data.settings
      if (stored) {
        setSettings({
          default_commission_percent: Number(stored.default_commission_percent),
          product_commissions: stored.product_commissions ?? [],
        })
        setDefaultInput(String(stored.default_commission_percent))
      }
      setSaveNote(t("sellerAffiliateSaved", locale))
    } catch {
      setSaveNote(t("sellerAffiliateSaveFailed", locale))
    } finally {
      setSaving(false)
    }
  }

  function addProduct() {
    const percent = Number(productPercent)
    if (!selectedProductId || !Number.isFinite(percent)) return
    const prod = products.find((p) => p.id === selectedProductId)
    if (!prod) return
    if (settings.product_commissions.some((c) => c.product_id === selectedProductId)) return
    setSettings((s) => ({
      ...s,
      product_commissions: [
        ...s.product_commissions,
        { product_id: selectedProductId, product_title: prod.title, commission_percent: percent },
      ],
    }))
    setSelectedProductId("")
    setProductPercent("")
  }

  function removeProduct(productId: string) {
    setSettings((s) => ({
      ...s,
      product_commissions: s.product_commissions.filter((c) => c.product_id !== productId),
    }))
  }

  const selectClass = "h-9 w-full rounded-[5px] border border-wf-400 bg-white px-3 text-xs text-wf-800"
  const emContrib = EUROPMADE_AFFILIATE_CONTRIBUTION_PERCENT

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavMarketing", locale), href: "/seller/marketing" },
        { label: t("sellerMktAffiliateTitle", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">{t("sellerMktAffiliateTitle", locale)}</h1>
      <p className="mt-1.5 text-xs text-wf-600">{t("sellerAffiliateIntro", locale)}</p>

      {/* Stats */}
      <section className="mt-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">{t("sellerAffiliateStats", locale)}</h2>
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
          <KpiCard value={String(affiliates.length)} label={t("sellerAffiliateCount", locale)} source="api"
            note={tFormat("sellerAffiliateActiveNote", locale, { count: activeCount })} />
          <KpiCard value={formatEuro(totalSales)} label={t("sellerAffiliateSales", locale)} source="api" />
          <KpiCard value={formatEuro(totalPaid)} label={t("sellerAffiliatePaid", locale)} source="api" />
          <KpiCard value={formatEuro(totalOpen)} label={t("sellerAffiliateOpen", locale)} source="api" />
        </div>
      </section>

      {/* Affiliates table */}
      <section className="mt-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">{t("sellerAffiliateManage", locale)}</h2>
        {affiliates.length === 0 ? (
          <EmptyState title={t("sellerAffiliateEmptyTitle", locale)} description={t("sellerAffiliateEmptyDesc", locale)} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {[t("sellerAffiliateCol", locale), t("commonStatus", locale), t("sellerAffiliateSalesCount", locale), t("sellerRevenue", locale), t("sellerAffiliatePaidCol", locale), t("sellerAffiliateOpenCol", locale)].map((h) => (
                    <th key={h} className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {affiliates.map((a) => (
                  <tr key={a.id} className="border-b border-wf-200 last:border-b-0">
                    <td className="px-4 py-2.5 text-wf-800">{a.name}</td>
                    <td className="px-4 py-2.5"><Badge variant="outline">{statusLabel(a.status, locale)}</Badge></td>
                    <td className="px-4 py-2.5 text-wf-800">{a.sales_count}</td>
                    <td className="px-4 py-2.5 text-wf-800">{formatEuro(a.sales_amount)}</td>
                    <td className="px-4 py-2.5 text-wf-800">{formatEuro(a.commission_paid)}</td>
                    <td className="px-4 py-2.5 text-wf-800">{formatEuro(a.commission_open)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Commission structure explanation */}
      <section className="mt-8 rounded-lg border border-wf-300 bg-white px-5 py-4">
        <h2 className="text-[12px] uppercase tracking-[0.04em] text-wf-500 mb-3">{t("sellerAffiliatePriority", locale)}</h2>

        <div className="rounded-md border border-wf-200 bg-wf-50 p-4">
          <div className="space-y-2 text-xs text-wf-800">
            <div className="flex justify-between">
              <span>{t("affYourCommission", locale)}</span>
              <span className="font-semibold">{settings.default_commission_percent}%</span>
            </div>
            <div className="flex justify-between">
              <span>{t("affEuropmadeContribution", locale)}</span>
              <span className="font-semibold text-green-700">+{emContrib}%</span>
            </div>
            <div className="border-t border-wf-300 pt-2 flex justify-between font-bold">
              <span>{t("affTotalAffiliate", locale)}</span>
              <span className="text-wf-900">{settings.default_commission_percent + emContrib}%</span>
            </div>
          </div>
        </div>

        <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-wf-800">
          <li>{t("sellerAffiliatePriority1", locale)}</li>
          <li>{t("affPriorityDefault", locale)}</li>
        </ol>
        <p className="mt-2 text-[11.5px] text-wf-600">{t("affPriorityExplain", locale)}</p>
      </section>

      {/* Default commission */}
      <section className="mt-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">{t("sellerAffiliateDefault", locale)}</h2>
        <div className="max-w-sm rounded-lg border border-wf-300 bg-white px-5 py-4">
          <Input
            label={t("sellerAffiliateDefaultPct", locale)}
            type="number" min={0} max={100} step="0.1"
            value={defaultInput}
            data-testid="seller-default-commission"
            onChange={(e) => {
              setDefaultInput(e.target.value)
              const n = Number(e.target.value)
              setSettings((s) => ({ ...s, default_commission_percent: Number.isFinite(n) ? n : 0 }))
            }}
            placeholder={t("sellerAffiliateDefaultPlaceholder", locale)}
          />
          <p className="mt-2 text-[10px] text-wf-500">
            {t("affEuropmadeContribution", locale)}: +{emContrib}% → {t("affTotalAffiliate", locale)}: {(Number(defaultInput) || 0) + emContrib}%
          </p>
        </div>
      </section>

      {/* Product commission */}
      <section className="mt-8">
        <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">{t("sellerAffiliatePerProduct", locale)}</h2>
        <div className="mb-3 grid grid-cols-1 gap-3 rounded-lg border border-wf-300 bg-white px-5 py-4 tablet:grid-cols-[1fr_140px_auto]">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">{t("commonProduct", locale)}</label>
            {products.length === 0 && productsLoaded ? (
              <Notice variant="info" className="text-xs">{t("affNoProducts", locale)}</Notice>
            ) : (
              <select className={selectClass} value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                <option value="">{t("affSelectProduct", locale)}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}{p.sku ? ` (${p.sku})` : p.ean ? ` (${p.ean})` : ""}</option>
                ))}
              </select>
            )}
          </div>
          <Input label={t("sellerAffiliateCommissionPct", locale)} type="number" min={0} max={100} step="0.1" value={productPercent} onChange={(e) => setProductPercent(e.target.value)} data-testid="seller-product-commission" />
          <div className="flex items-end">
            <Button type="button" onClick={addProduct} disabled={!selectedProductId}>{t("commonAdd", locale)}</Button>
          </div>
        </div>

        {/* Selected product preview */}
        {selectedProductId && (
          <div className="mb-3 rounded-md border border-wf-200 bg-wf-50 px-4 py-3 text-xs text-wf-700">
            <div className="flex justify-between"><span>{t("affYourCommission", locale)}</span><span>{productPercent || "—"}%</span></div>
            <div className="flex justify-between"><span>{t("affEuropmadeContribution", locale)}</span><span className="text-green-700">+{emContrib}%</span></div>
            <div className="border-t border-wf-200 pt-1 mt-1 flex justify-between font-bold">
              <span>{t("affTotalAffiliate", locale)}</span>
              <span>{(Number(productPercent) || 0) + emContrib}%</span>
            </div>
          </div>
        )}

        {settings.product_commissions.length === 0 ? (
          <div className="rounded-lg border border-wf-300 bg-white px-5 py-4 text-xs text-wf-500">{t("affNoProductCommissions", locale)}</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {[t("commonProduct", locale), t("affYourCommission", locale), t("affEuropmadeContribution", locale), t("affTotalAffiliate", locale), ""].map((h, i) => (
                    <th key={i} className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {settings.product_commissions.map((row) => {
                  const rated = sellerAffiliateCommission({
                    settings,
                    productId: row.product_id,
                    productTitle: row.product_title,
                  })
                  const sellerPct = rated.sellerPercent
                  const total = rated.totalPercent
                  return (
                    <tr key={row.product_id} className="border-b border-wf-200 last:border-b-0">
                      <td className="px-4 py-2.5 text-wf-800">{row.product_title}</td>
                      <td className="px-4 py-2.5">{sellerPct}%</td>
                      <td className="px-4 py-2.5 text-green-700">+{emContrib}%</td>
                      <td className="px-4 py-2.5 font-bold text-wf-900">{total}%</td>
                      <td className="px-4 py-2.5">
                        <button type="button" onClick={() => removeProduct(row.product_id)} className="text-[10px] text-red-600 hover:underline">{t("commonDelete", locale)}</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {saveNote && <p className="mt-4 text-xs text-wf-600">{saveNote}</p>}

      <div className="mt-6">
        <Button type="button" onClick={() => void saveSettings()} disabled={saving} data-testid="seller-affiliate-save">
          {saving ? t("affProductPromoting", locale) : t("commonSave", locale)}
        </Button>
      </div>
    </SellerGate>
  )
}
