"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Badge, Button, FileUpload, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { EmptyState } from "../_components/empty-state"
import { formatEuro } from "../../_components/storefront-shell"
import {
  type DemoProduct,
  type ProductCloudStatus,
} from "../_lib/demo-data"
import { useDemoProducts } from "../_lib/demo-store"

type ListingFilter = "all" | "live" | "concept"
type StockFilter = "all" | "in_stock" | "out_of_stock" | "no_offer"
type LifecycleFilter =
  | "all"
  | "Actief"
  | "Concept gecontroleerd"
  | "Retailer Created"
  | "Gearchiveerd"

type CsvPreviewRow = {
  title: string
  ean: string
  price: number | null
  stock: number | null
  category: string
  error?: string
}

type BulkField =
  | "price"
  | "stock"
  | "category"
  | "status"
  | "publish"
  | "offline"

/**
 * Productbeheer — CSV-import, bulk wijzigen, Product Cloud Status (MVP).
 */
export default function SellerProductsPage() {
  const [products, setProducts] = useDemoProducts()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState("")
  const [listingFilter, setListingFilter] = useState<ListingFilter>("all")
  const [stockFilter, setStockFilter] = useState<StockFilter>("all")
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("all")
  const [notice, setNotice] = useState<string | null>(null)

  const [csvOpen, setCsvOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<CsvPreviewRow[]>([])
  const [csvError, setCsvError] = useState<string | null>(null)

  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkField, setBulkField] = useState<BulkField>("price")
  const [bulkValue, setBulkValue] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (listingFilter !== "all" && p.listing !== listingFilter) return false
      if (lifecycleFilter !== "all" && p.lifecycle_status !== lifecycleFilter)
        return false
      if (stockFilter === "no_offer" && p.stock != null) return false
      if (
        stockFilter === "in_stock" &&
        !(typeof p.stock === "number" && p.stock > 0)
      )
        return false
      if (
        stockFilter === "out_of_stock" &&
        !(typeof p.stock === "number" && p.stock <= 0)
      )
        return false
      if (!q) return true
      return [p.title, p.ean, p.lifecycle_status, p.listing, p.category, p.product_cloud_status]
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [products, query, listingFilter, stockFilter, lifecycleFilter])

  function toggleAll(checked: boolean) {
    if (checked) setSelected(new Set(filtered.map((p) => p.id)))
    else setSelected(new Set())
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function parseCsvFile(file: File) {
    setCsvError(null)
    const text = await file.text()
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length < 2) {
      setCsvError("CSV moet een header en minstens één datarij bevatten.")
      setCsvPreview([])
      return
    }
    const header = lines[0]!.toLowerCase().split(/[;,]/).map((h) => h.trim())
    const idx = {
      title: header.findIndex((h) => h === "title" || h === "titel"),
      ean: header.findIndex((h) => h === "ean" || h === "sku"),
      price: header.findIndex((h) => h === "price" || h === "prijs"),
      stock: header.findIndex((h) => h === "stock" || h === "voorraad"),
      category: header.findIndex((h) => h === "category" || h === "categorie"),
    }
    if (idx.title < 0 || idx.ean < 0) {
      setCsvError("Verplichte kolommen ontbreken: title/titel en ean/sku.")
      setCsvPreview([])
      return
    }
    const rows: CsvPreviewRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i]!.split(/[;,]/).map((c) => c.trim().replace(/^"|"$/g, ""))
      const title = cols[idx.title] ?? ""
      const ean = cols[idx.ean] ?? ""
      const priceRaw = idx.price >= 0 ? cols[idx.price] : ""
      const stockRaw = idx.stock >= 0 ? cols[idx.stock] : ""
      const category = idx.category >= 0 ? cols[idx.category] ?? "" : ""
      const price =
        priceRaw && Number.isFinite(Number(priceRaw.replace(",", ".")))
          ? Number(priceRaw.replace(",", "."))
          : null
      const stock =
        stockRaw && Number.isFinite(Number(stockRaw)) ? Number(stockRaw) : null
      let error: string | undefined
      if (!title) error = "Titel ontbreekt"
      else if (!ean || ean.length < 8) error = "EAN ongeldig"
      else if (products.some((p) => p.ean === ean)) error = "EAN bestaat al"
      else if (rows.some((r) => r.ean === ean)) error = "Dubbele EAN in CSV"
      rows.push({ title, ean, price, stock, category, error })
    }
    setCsvPreview(rows)
  }

  function runCsvImport() {
    const valid = csvPreview.filter((r) => !r.error)
    if (valid.length === 0) {
      setCsvError("Geen geldige rijen om te importeren.")
      return
    }
    const imported: DemoProduct[] = valid.map((r, i) => ({
      id: `prod_csv_${Date.now()}_${i}`,
      title: r.title,
      ean: r.ean,
      lifecycle_status: "Retailer Created",
      listing: "concept",
      stock: r.stock,
      price: r.price,
      category: r.category || "Nog niet ingedeeld",
      product_cloud_status: "Niet gekoppeld" as ProductCloudStatus,
    }))
    setProducts((prev) => [...imported, ...prev])
    setNotice(`${imported.length} producten geïmporteerd.`)
    setCsvOpen(false)
    setCsvFile(null)
    setCsvPreview([])
  }

  function applyBulk() {
    if (selected.size === 0) {
      setNotice("Selecteer eerst producten.")
      return
    }
    setProducts((prev) =>
      prev.map((p) => {
        if (!selected.has(p.id)) return p
        const next = { ...p }
        if (bulkField === "price") {
          const n = Number(bulkValue.replace(",", "."))
          if (Number.isFinite(n)) next.price = n
        } else if (bulkField === "stock") {
          const n = Number(bulkValue)
          if (Number.isFinite(n)) next.stock = n
        } else if (bulkField === "category") {
          if (bulkValue.trim()) next.category = bulkValue.trim()
        } else if (bulkField === "status") {
          if (bulkValue.trim()) next.lifecycle_status = bulkValue.trim()
        } else if (bulkField === "publish") {
          next.listing = "live"
          next.lifecycle_status = "Actief"
        } else if (bulkField === "offline") {
          next.listing = "concept"
        }
        return next
      })
    )
    setNotice(`${selected.size} producten bijgewerkt.`)
    setBulkOpen(false)
    setBulkValue("")
    setSelected(new Set())
  }

  const selectClass =
    "h-9 rounded-[5px] border border-wf-400 bg-white px-3 text-xs text-wf-800"
  const validCsvCount = csvPreview.filter((r) => !r.error).length

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Producten" },
      ]}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">Producten</h1>
          <p className="mt-1.5 text-xs text-wf-600">
            Zoeken, filteren, CSV-import en bulkacties.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setCsvOpen(true)}>
            CSV import
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (selected.size === 0) {
                setNotice("Selecteer eerst producten voor bulk wijzigen.")
                return
              }
              setBulkOpen(true)
            }}
          >
            Bulk wijzigen
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (selected.size === 0) {
                setNotice("Selecteer eerst producten om te publiceren.")
                return
              }
              setBulkField("publish")
              setProducts((prev) =>
                prev.map((p) =>
                  selected.has(p.id)
                    ? { ...p, listing: "live", lifecycle_status: "Actief" }
                    : p
                )
              )
              setNotice(`${selected.size} producten gepubliceerd.`)
              setSelected(new Set())
            }}
          >
            Bulk publiceren
          </Button>
          <Link
            href="/seller/products/add"
            className="inline-flex items-center justify-center rounded-wf border border-transparent bg-wf-900 px-[18px] py-[9px] text-sm font-semibold text-white hover:bg-wf-800"
          >
            Nieuw product
          </Link>
        </div>
      </div>

      {notice ? (
        <Notice variant="info" className="mb-4">
          {notice}
        </Notice>
      ) : null}

      {csvOpen ? (
        <section className="mb-5 rounded-lg border border-wf-300 bg-white px-5 py-4">
          <h2 className="text-xs font-semibold text-wf-900">CSV import</h2>
          <p className="mt-1 text-[11.5px] text-wf-600">
            Kolommen: title/titel, ean/sku, price/prijs, stock/voorraad,
            category/categorie (scheidingsteken ; of ,).
          </p>
          <div className="mt-3 max-w-md">
            <FileUpload
              label="CSV-bestand"
              requirementLabel="CSV, max. 5 MB"
              accept=".csv,text/csv"
              value={csvFile}
              onChange={(file) => {
                setCsvFile(file)
                if (file) void parseCsvFile(file)
                else setCsvPreview([])
              }}
            />
          </div>
          {csvError ? (
            <Notice variant="warning" className="mt-3">
              {csvError}
            </Notice>
          ) : null}
          {csvPreview.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    {["Titel", "EAN", "Prijs", "Voorraad", "Categorie", "Status"].map(
                      (h) => (
                        <th
                          key={h}
                          className="border-b border-wf-400 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.map((row) => (
                    <tr key={row.ean} className="border-b border-wf-200">
                      <td className="px-3 py-2">{row.title}</td>
                      <td className="px-3 py-2">{row.ean}</td>
                      <td className="px-3 py-2">
                        {row.price == null ? "—" : formatEuro(row.price)}
                      </td>
                      <td className="px-3 py-2">
                        {row.stock == null ? "—" : row.stock}
                      </td>
                      <td className="px-3 py-2">{row.category || "—"}</td>
                      <td className="px-3 py-2">
                        {row.error ? (
                          <span className="text-wf-800">{row.error}</span>
                        ) : (
                          <Badge variant="outline">OK</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-wf-500">
                {validCsvCount} van {csvPreview.length} rijen geldig
              </p>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={runCsvImport}
              disabled={validCsvCount === 0}
            >
              Import uitvoeren
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCsvOpen(false)
                setCsvFile(null)
                setCsvPreview([])
                setCsvError(null)
              }}
            >
              Annuleren
            </Button>
          </div>
        </section>
      ) : null}

      {bulkOpen ? (
        <section className="mb-5 rounded-lg border border-wf-300 bg-white px-5 py-4">
          <h2 className="text-xs font-semibold text-wf-900">
            Bulk wijzigen ({selected.size} producten)
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 tablet:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                Veld
              </label>
              <select
                className={selectClass + " w-full"}
                value={bulkField}
                onChange={(e) => setBulkField(e.target.value as BulkField)}
              >
                <option value="price">Prijs wijzigen</option>
                <option value="stock">Voorraad wijzigen</option>
                <option value="category">Categorie wijzigen</option>
                <option value="status">Status wijzigen</option>
                <option value="publish">Publiceren</option>
                <option value="offline">Offline zetten</option>
              </select>
            </div>
            {bulkField !== "publish" && bulkField !== "offline" ? (
              <Input
                label="Nieuwe waarde"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                placeholder={
                  bulkField === "status"
                    ? "bijv. Actief"
                    : bulkField === "category"
                      ? "bijv. Voeding > Snacks"
                      : "bijv. 12.95"
                }
              />
            ) : (
              <p className="self-end text-xs text-wf-600">
                {bulkField === "publish"
                  ? "Geselecteerde producten worden live gezet."
                  : "Geselecteerde producten worden offline (concept) gezet."}
              </p>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="button" onClick={applyBulk}>
              Bevestigen
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setBulkOpen(false)}
            >
              Annuleren
            </Button>
          </div>
        </section>
      ) : null}

      <div className="mb-4 flex flex-wrap items-end gap-2.5">
        <div className="min-w-[180px] flex-1">
          <Input
            label="Zoeken"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek op titel, EAN, status…"
          />
        </div>
        <div>
          <label
            htmlFor="listing-filter"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500"
          >
            Listing
          </label>
          <select
            id="listing-filter"
            className={selectClass}
            value={listingFilter}
            onChange={(e) => setListingFilter(e.target.value as ListingFilter)}
          >
            <option value="all">Alle</option>
            <option value="live">Live</option>
            <option value="concept">Concept</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="lifecycle-filter"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500"
          >
            Lifecycle
          </label>
          <select
            id="lifecycle-filter"
            className={selectClass}
            value={lifecycleFilter}
            onChange={(e) =>
              setLifecycleFilter(e.target.value as LifecycleFilter)
            }
          >
            <option value="all">Alle</option>
            <option value="Actief">Actief</option>
            <option value="Concept gecontroleerd">Concept gecontroleerd</option>
            <option value="Retailer Created">Retailer Created</option>
            <option value="Gearchiveerd">Gearchiveerd</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="stock-filter"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500"
          >
            Voorraad
          </label>
          <select
            id="stock-filter"
            className={selectClass}
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockFilter)}
          >
            <option value="all">Alle</option>
            <option value="in_stock">Op voorraad</option>
            <option value="out_of_stock">Geen voorraad</option>
            <option value="no_offer">Geen aanbod</option>
          </select>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="Geen producten"
          description="Importeer een CSV of voeg handmatig een nieuw product toe."
          primaryAction={{ label: "CSV importeren", onClick: () => setCsvOpen(true) }}
          secondaryAction={{ label: "Nieuw product", href: "/seller/products/add" }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Geen resultaten"
          description="Pas je zoekopdracht of filters aan."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border-b border-wf-400 px-3 py-2.5 text-left">
                  <input
                    type="checkbox"
                    aria-label="Selecteer alle"
                    checked={
                      filtered.length > 0 &&
                      filtered.every((p) => selected.has(p.id))
                    }
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                {[
                  "Titel",
                  "EAN / ID",
                  "Lifecycle",
                  "Listing",
                  "Product Cloud Status",
                  "Voorraad",
                  "Prijs",
                  "Categorie",
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
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-wf-200 last:border-b-0">
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`Selecteer ${p.title}`}
                      checked={selected.has(p.id)}
                      onChange={(e) => toggleOne(p.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-wf-800">{p.title}</td>
                  <td className="px-4 py-2.5 text-wf-800">{p.ean}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">{p.lifecycle_status}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge>{p.listing === "live" ? "Live" : "Concept"}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">{p.product_cloud_status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-wf-800">
                    {p.stock == null ? "—" : p.stock}
                  </td>
                  <td className="px-4 py-2.5 text-wf-800">
                    {p.price == null ? "—" : formatEuro(p.price)}
                  </td>
                  <td className="px-4 py-2.5 text-wf-800">{p.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3.5 text-[11px] text-wf-500">
            {filtered.length} van {products.length} producten
            {selected.size > 0 ? ` · ${selected.size} geselecteerd` : null}
          </div>
        </div>
      )}
    </SellerGate>
  )
}
