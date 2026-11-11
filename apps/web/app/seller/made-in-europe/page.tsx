"use client"

import { useEffect, useMemo, useState } from "react"
import { Button, Notice } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { listOwnProducts, type CatalogProduct } from "../_lib/product-cloud-api"
import {
  getSellerBrand,
  listSellerBrands,
  listSellerFacilities,
  upsertSellerBrandFacility,
} from "../_lib/brands-api"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t } from "../../_lib/i18n/messages"
import { medusaBackendUrl } from "../../_lib/medusa-backend-url"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

type FacilityOption = {
  id: string
  name: string
  brand_id: string
  brand_name?: string
  country_code?: string
  city?: string | null
  assembly_eu_band?: string | null
  parts_eu_level?: string | null
  materials_eu_level?: string | null
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${medusaBackendUrl()}${path}`, {
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
  const [showNewFacility, setShowNewFacility] = useState(false)
  const [newFacilityName, setNewFacilityName] = useState("")
  const [newFacilityStreet, setNewFacilityStreet] = useState("")
  const [newFacilityHouse, setNewFacilityHouse] = useState("")
  const [newFacilityPostal, setNewFacilityPostal] = useState("")
  const [newFacilityCity, setNewFacilityCity] = useState("")
  const [newFacilityCountry, setNewFacilityCountry] = useState("NL")
  const [newFacilityBrandId, setNewFacilityBrandId] = useState("")
  const [assembly, setAssembly] = useState("")
  const [parts, setParts] = useState("")
  const [materials, setMaterials] = useState("")
  const [country, setCountry] = useState("")
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
        const facRes = await listSellerFacilities().catch(() => ({
          brands: brands.brands,
          facilities: [] as FacilityOption[],
        }))
        const brandOptions = facRes.brands?.length ? facRes.brands : brands.brands
        if (brandOptions[0]?.id) setNewFacilityBrandId(brandOptions[0].id)
        else if (list.products[0]?.brand_id)
          setNewFacilityBrandId(list.products[0].brand_id)
        const fromApi = (facRes.facilities || []) as FacilityOption[]
        if (fromApi.length) {
          setFacilities(fromApi)
        } else {
          const allFacilities: FacilityOption[] = []
          for (const brand of brandOptions) {
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
        }
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
    if (!assembly || !parts || !materials) {
      setError(t("mieNotCalculatedBody", locale))
      return
    }
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
          primary_assembly_country: country.trim() || null,
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

  async function createFacility() {
    if (!newFacilityBrandId || !newFacilityCountry.trim()) {
      setError(t("mieBrandCountryRequired", locale))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await upsertSellerBrandFacility(newFacilityBrandId, {
        name: newFacilityName.trim() || null,
        country_code: newFacilityCountry,
        street: newFacilityStreet.trim() || null,
        house_number: newFacilityHouse.trim() || null,
        postal_code: newFacilityPostal.trim() || null,
        city: newFacilityCity.trim() || null,
        assembly_eu_band: assembly,
        parts_eu_level: parts,
        materials_eu_level: materials,
        primary_assembly_country: country,
      })
      const created = res as { facility?: { id?: string; name?: string } }
      const row = created.facility
      if (row?.id && row.name) {
        setFacilities((prev) => [
          ...prev,
          {
            id: row.id,
            name: row.name,
            brand_id: newFacilityBrandId,
            assembly_eu_band: assembly,
            parts_eu_level: parts,
            materials_eu_level: materials,
          },
        ])
        setFacilityId(row.id)
      }
      setShowNewFacility(false)
      setNewFacilityName("")
      setNewFacilityStreet("")
      setNewFacilityHouse("")
      setNewFacilityPostal("")
      setNewFacilityCity("")
      setNotice(t("mieFacilitySavedSelected", locale))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("mieFacilityCreateFailed", locale)
      )
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
      setNotice(t("mieFacilityProfileSaved", locale))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("mieFacilitySaveFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <SellerGate>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-xl font-bold text-wf-900">{t("sellerMieTitle", locale)}</h1>
        <p className="mt-1 text-sm text-wf-600">{t("sellerMieIntro", locale)}</p>
        <Notice className="mt-3" variant="info">
          De Made in Europe-score wordt automatisch berekend uit de gekozen
          assemblage-/onderdelen-/materialen-banden. Je vult geen vrij percentage
          in. Voor verified-status is goedgekeurd productbewijs vereist — na bulk
          upload je bewijs per product op de productdetailpagina.
        </Notice>

        {notice ? <Notice className="mt-3">{notice}</Notice> : null}
        {error ? (
          <Notice className="mt-3" variant="warning">
            {error}
          </Notice>
        ) : null}

        <section className="mt-6 grid gap-4 rounded border border-wf-300 p-4 tablet:grid-cols-2">
          <label className="text-xs font-semibold text-wf-700">
            Productielocatie
            <select
              className="mt-1 h-10 w-full rounded border border-wf-300 px-2"
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
            >
              <option value="">— selecteer productielocatie —</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({(f.country_code || "").toUpperCase() || "??"}) ·{" "}
                  {f.brand_name || f.brand_id}
                </option>
              ))}
            </select>
            {facilities.length === 0 ? (
              <p className="mt-1 text-[10px] text-amber-800">
                Nog geen productielocatie. Kies hieronder
                &quot;+ Productielocatie toevoegen&quot;.
              </p>
            ) : null}
            <p className="mt-1 text-[10px] text-wf-600">
              Daadwerkelijke productielocatie: de locatie waar het product
              daadwerkelijk wordt geproduceerd of geassembleerd.
            </p>
          </label>
          <div className="tablet:col-span-2">
            <button
              type="button"
              className="text-xs font-semibold text-wf-800 underline"
              onClick={() => setShowNewFacility((v) => !v)}
            >
              + Productielocatie toevoegen
            </button>
            {showNewFacility ? (
              <div className="mt-2 grid gap-2 rounded border border-wf-300 p-3 tablet:grid-cols-2">
                <label className="text-xs font-semibold text-wf-700">
                  Naam productielocatie (optioneel)
                  <input
                    className="mt-1 h-9 w-full rounded border border-wf-300 px-2"
                    value={newFacilityName}
                    onChange={(e) => setNewFacilityName(e.target.value)}
                  />
                </label>
                <label className="text-xs font-semibold text-wf-700">
                  Straat
                  <input
                    className="mt-1 h-9 w-full rounded border border-wf-300 px-2"
                    value={newFacilityStreet}
                    onChange={(e) => setNewFacilityStreet(e.target.value)}
                  />
                </label>
                <label className="text-xs font-semibold text-wf-700">
                  Huisnummer
                  <input
                    className="mt-1 h-9 w-full rounded border border-wf-300 px-2"
                    value={newFacilityHouse}
                    onChange={(e) => setNewFacilityHouse(e.target.value)}
                  />
                </label>
                <label className="text-xs font-semibold text-wf-700">
                  Postcode
                  <input
                    className="mt-1 h-9 w-full rounded border border-wf-300 px-2"
                    value={newFacilityPostal}
                    onChange={(e) => setNewFacilityPostal(e.target.value)}
                  />
                </label>
                <label className="text-xs font-semibold text-wf-700">
                  Plaats
                  <input
                    className="mt-1 h-9 w-full rounded border border-wf-300 px-2"
                    value={newFacilityCity}
                    onChange={(e) => setNewFacilityCity(e.target.value)}
                  />
                </label>
                <label className="text-xs font-semibold text-wf-700">
                  Land (verplicht)
                  <input
                    className="mt-1 h-9 w-full rounded border border-wf-300 px-2 uppercase"
                    maxLength={2}
                    value={newFacilityCountry}
                    onChange={(e) =>
                      setNewFacilityCountry(e.target.value.toUpperCase())
                    }
                  />
                </label>
                <p className="tablet:col-span-2 text-[11px] text-wf-600">
                  Alleen het land is verplicht. De overige gegevens zijn
                  optioneel en kunnen worden ingevuld wanneer deze beschikbaar
                  zijn.
                </p>
                <div className="flex items-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => void createFacility()}
                  >
                    Productielocatie opslaan
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
          <label className="text-xs font-semibold text-wf-700">
            {t("mieAssembly", locale)}
            <select
              className="mt-1 h-10 w-full rounded border border-wf-300 px-2"
              value={assembly}
              onChange={(e) => setAssembly(e.target.value)}
            >
              <option value="">{t("pdpMieChoose", locale)}</option>
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
              <option value="">{t("pdpMieChoose", locale)}</option>
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
              <option value="">{t("pdpMieChoose", locale)}</option>
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
          <Button
            type="button"
            disabled={busy || selected.size === 0 || !assembly || !parts || !materials}
            onClick={() => void applyBulk()}
          >
            Toepassen op geselecteerde producten ({selected.size})
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !selectedFacility}
            onClick={() => void saveFacilityProfile()}
          >
            Profiel productielocatie opslaan
          </Button>
          <p className="text-[10px] text-wf-500">
            Toepassen vult alleen gegevens in — geen automatische compliance-goedkeuring.
          </p>
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
                <th className="px-3 py-2">Detail</th>
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
                  <td className="px-3 py-2">
                    <a
                      href={`/seller/products/${p.id}?tab=information`}
                      className="text-xs font-semibold underline"
                    >
                      Bewijs
                    </a>
                  </td>
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
