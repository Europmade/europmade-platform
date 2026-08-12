"use client"

import { useEffect, useMemo, useState } from "react"
import { Button, Notice } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { listOwnProducts, type CatalogProduct } from "../_lib/product-cloud-api"
import {
  getSellerBrand,
  listSellerBrands,
  upsertSellerBrandFacility,
} from "../_lib/brands-api"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t } from "../../_lib/i18n/messages"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

type FacilityOption = {
  id: string
  name: string
  brand_id: string
  assembly_eu_band?: string | null
  parts_eu_level?: string | null
  materials_eu_level?: string | null
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
    },
    body: JSON.stringify(body),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      typeof json?.message === "string" ? json.message : "Request failed"
    )
  }
  return json as T
}

/**
 * Seller Made in Europe bulk: multi-select + facility/profile + CSV rows.
 */
export default function SellerMadeInEuropePage() {
  const locale = useStorefrontLocale()
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [facilities, setFacilities] = useState<FacilityOption[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [facilityId, setFacilityId] = useState("")
  const [assembly, setAssembly] = useState("eu_100")
  const [parts, setParts] = useState("eu_majority")
  const [materials, setMaterials] = useState("eu_majority")
  const [country, setCountry] = useState("NL")
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [csvText, setCsvText] = useState(
    "product_id,production_facility_id,assembly_eu_band,parts_eu_level,materials_eu_level,primary_assembly_country\n"
  )

  useEffect(() => {
    void (async () => {
      try {
        const list = await listOwnProducts()
        setProducts(list.products)
        const brands = await listSellerBrands()
        const allFacilities: FacilityOption[] = []
        for (const brand of brands.brands) {
          const detail = await getSellerBrand(brand.id)
          const rows = (detail.facilities ?? []) as Array<Record<string, unknown>>
          for (const row of rows) {
            if (typeof row.id === "string" && typeof row.name === "string") {
              allFacilities.push({
                id: row.id,
                name: row.name,
                brand_id: brand.id,
                assembly_eu_band: (row.assembly_eu_band as string) ?? null,
                parts_eu_level: (row.parts_eu_level as string) ?? null,
                materials_eu_level: (row.materials_eu_level as string) ?? null,
              })
            }
          }
        }
        setFacilities(allFacilities)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed")
      }
    })()
  }, [])

  const selectedFacility = useMemo(
    () => facilities.find((f) => f.id === facilityId) ?? null,
    [facilities, facilityId]
  )

  useEffect(() => {
    if (!selectedFacility) return
    if (selectedFacility.assembly_eu_band)
      setAssembly(selectedFacility.assembly_eu_band)
    if (selectedFacility.parts_eu_level) setParts(selectedFacility.parts_eu_level)
    if (selectedFacility.materials_eu_level)
      setMaterials(selectedFacility.materials_eu_level)
  }, [selectedFacility])

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(products.map((p) => p.id)) : new Set())
  }

  async function applyBulk() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = await postJson<{ success_count: number; count: number }>(
        "/store/product-cloud/made-in-europe/bulk",
        {
          product_ids: [...selected],
          production_facility_id: facilityId || null,
          assembly_eu_band: assembly,
          parts_eu_level: parts,
          materials_eu_level: materials,
          primary_assembly_country: country,
        }
      )
      setNotice(`${res.success_count}/${res.count} OK`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk failed")
    } finally {
      setBusy(false)
    }
  }

  async function applyCsv() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const lines = csvText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
      if (lines.length < 2) throw new Error("CSV needs header + rows")
      const header = lines[0].split(",").map((h) => h.trim())
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim())
        const obj: Record<string, string> = {}
        header.forEach((h, i) => {
          obj[h] = cols[i] ?? ""
        })
        return {
          product_id: obj.product_id || undefined,
          ean: obj.ean || undefined,
          sku: obj.sku || undefined,
          production_facility_id: obj.production_facility_id || null,
          assembly_eu_band: obj.assembly_eu_band || undefined,
          parts_eu_level: obj.parts_eu_level || undefined,
          materials_eu_level: obj.materials_eu_level || undefined,
          primary_assembly_country: obj.primary_assembly_country || null,
        }
      })
      const res = await postJson<{ success_count: number; count: number }>(
        "/store/product-cloud/made-in-europe/csv",
        { rows }
      )
      setNotice(`CSV ${res.success_count}/${res.count} OK`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV failed")
    } finally {
      setBusy(false)
    }
  }

  async function saveFacilityProfile() {
    if (!selectedFacility) return
    setBusy(true)
    setError(null)
    try {
      await upsertSellerBrandFacility(selectedFacility.brand_id, {
        id: selectedFacility.id,
        name: selectedFacility.name,
        country_code: country,
        assembly_eu_band: assembly,
        parts_eu_level: parts,
        materials_eu_level: materials,
        primary_assembly_country: country,
      })
      setNotice("Facility profile saved")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Facility save failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <SellerGate>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-xl font-bold text-wf-900">{t("sellerMieTitle", locale)}</h1>
        <p className="mt-1 text-sm text-wf-600">{t("sellerMieIntro", locale)}</p>

        {notice ? <Notice className="mt-3">{notice}</Notice> : null}
        {error ? (
          <Notice className="mt-3" variant="warning">
            {error}
          </Notice>
        ) : null}

        <section className="mt-6 grid gap-4 rounded border border-wf-300 p-4 tablet:grid-cols-2">
          <label className="text-xs font-semibold text-wf-700">
            Facility
            <select
              className="mt-1 h-10 w-full rounded border border-wf-300 px-2"
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
            >
              <option value="">—</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-wf-700">
            {t("mieAssembly", locale)}
            <select
              className="mt-1 h-10 w-full rounded border border-wf-300 px-2"
              value={assembly}
              onChange={(e) => setAssembly(e.target.value)}
            >
              <option value="eu_100">{t("mieBandEu100", locale)}</option>
              <option value="eu_75_99">{t("mieBandEu7599", locale)}</option>
              <option value="eu_50_74">{t("mieBandEu5074", locale)}</option>
              <option value="eu_below_50">{t("mieBandBelow50", locale)}</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-wf-700">
            {t("mieParts", locale)}
            <select
              className="mt-1 h-10 w-full rounded border border-wf-300 px-2"
              value={parts}
              onChange={(e) => setParts(e.target.value)}
            >
              <option value="eu_majority">{t("mieLevelMajority", locale)}</option>
              <option value="eu_partial">{t("mieLevelPartial", locale)}</option>
              <option value="eu_none">{t("mieLevelNone", locale)}</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-wf-700">
            {t("mieMaterials", locale)}
            <select
              className="mt-1 h-10 w-full rounded border border-wf-300 px-2"
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
            >
              <option value="eu_majority">{t("mieLevelMajority", locale)}</option>
              <option value="eu_partial">{t("mieLevelPartial", locale)}</option>
              <option value="eu_none">{t("mieLevelNone", locale)}</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-wf-700">
            {t("mieAssemblyCountry", locale)}
            <input
              className="mt-1 h-10 w-full rounded border border-wf-300 px-2 uppercase"
              value={country}
              maxLength={2}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
            />
          </label>
        </section>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" disabled={busy || selected.size === 0} onClick={() => void applyBulk()}>
            Bulk apply ({selected.size})
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !selectedFacility}
            onClick={() => void saveFacilityProfile()}
          >
            Save facility profile
          </Button>
        </div>

        <section className="mt-6 overflow-x-auto rounded border border-wf-300">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-wf-100 text-xs uppercase text-wf-600">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.size > 0 && selected.size === products.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">ID</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-wf-200">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={(e) => {
                        setSelected((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(p.id)
                          else next.delete(p.id)
                          return next
                        })
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">{p.title ?? p.id}</td>
                  <td className="px-3 py-2 font-mono text-xs">{p.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-bold text-wf-900">CSV bulk</h2>
          <textarea
            className="mt-2 h-40 w-full rounded border border-wf-300 p-2 font-mono text-xs"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
          <Button
            type="button"
            className="mt-2"
            disabled={busy}
            onClick={() => void applyCsv()}
          >
            Apply CSV
          </Button>
        </section>
      </div>
    </SellerGate>
  )
}
