"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ProductSectionNav } from "../../../../components/product-cloud/product-section-nav"
import { displayMediaUrl } from "../../../../lib/media-url"
import {
  listAdminOffers,
  type OfferListRow,
} from "../../../../lib/brand-import-admin-api"
import { ProductApprovalAdminApiError } from "../../../../lib/product-approval-admin-api"

function money(value: unknown) {
  if (value == null || value === "") return "—"
  if (typeof value === "object") {
    const raw = value as { numeric?: unknown; value?: unknown }
    if (raw.numeric != null) return String(raw.numeric)
    if (raw.value != null) return String(raw.value)
  }
  return String(value)
}

export default function AdminOffersPage() {
  const params = useSearchParams()
  const productId = params.get("product_id") || ""
  const [rows, setRows] = useState<OfferListRow[] | "loading">("loading")
  const [count, setCount] = useState(0)
  const [q, setQ] = useState("")
  const [search, setSearch] = useState("")
  const [region, setRegion] = useState("")
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setRows("loading")
    setError(null)
    try {
      const res = await listAdminOffers({
        q: search || undefined,
        region_code: region || undefined,
        product_id: productId || undefined,
      })
      setRows(res.offers)
      setCount(res.count)
    } catch (err) {
      setRows([])
      setCount(0)
      setError(err instanceof ProductApprovalAdminApiError ? err.message : "Offers laden mislukt.")
    }
  }, [search, region, productId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <h1 className="text-lg font-bold text-wf-900">Offerlijst</h1>
      <p className="mt-1 text-xs text-wf-600">
        Verkoopaanbiedingen per seller en markt. Prijs, voorraad en seller-SKU horen hier, niet in de productcatalogus.
      </p>
      <div className="mt-4">
        <ProductSectionNav active="offers" counts={{ offers: count }} />
      </div>
      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(q)
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Product, EAN, seller of SKU"
          className="h-9 rounded border border-wf-400 px-2 text-xs"
        />
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="h-9 rounded border border-wf-400 px-2 text-xs"
        >
          <option value="">Alle markten</option>
          <option value="NL">NL</option>
          <option value="BE">BE</option>
          <option value="DE">DE</option>
          <option value="FR">FR</option>
          <option value="AT">AT</option>
        </select>
        <button type="submit" className="rounded bg-wf-800 px-3 text-xs font-semibold text-white">
          Zoeken
        </button>
      </form>
      {productId ? (
        <p className="mb-3 text-xs text-wf-700">
          Gefilterd op één centraal product.{" "}
          <Link href="/product-cloud/offers" className="underline">
            Alle offers
          </Link>
        </p>
      ) : null}
      {error ? <p className="mb-3 text-xs text-amber-800">{error}</p> : null}
      {rows === "loading" ? (
        <p className="text-sm text-wf-600">Laden…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-wf-600">Geen offers voor deze filter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {["Product", "EAN/GTIN", "Seller", "Markt", "Prijs", "Actieprijs", "Voorraad", "Seller-SKU", "Levertijd", "Verzending"].map(
                  (h) => (
                    <th key={h} className="border-b border-wf-400 px-3 py-2 text-left text-[10px] font-semibold uppercase text-wf-500">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-wf-100">
                  <td className="border-b border-wf-200 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {displayMediaUrl(row.primary_image_url) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={displayMediaUrl(row.primary_image_url) as string}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="h-11 w-11 shrink-0 rounded bg-wf-100" />
                      )}
                      <Link href={`/product-cloud/offers/${row.id}`} className="underline">
                        {row.title || row.id}
                      </Link>
                    </div>
                  </td>
                  <td className="border-b border-wf-200 px-3 py-2 font-mono text-[10px]">{row.identifier_value || "—"}</td>
                  <td className="border-b border-wf-200 px-3 py-2">{row.seller_name}</td>
                  <td className="border-b border-wf-200 px-3 py-2">{row.region_code}</td>
                  <td className="border-b border-wf-200 px-3 py-2">{money(row.base_price)}</td>
                  <td className="border-b border-wf-200 px-3 py-2">{money(row.promo_price)}</td>
                  <td className="border-b border-wf-200 px-3 py-2">{row.quantity_available ?? "—"}</td>
                  <td className="border-b border-wf-200 px-3 py-2 font-mono text-[10px]">{row.seller_sku || "—"}</td>
                  <td className="border-b border-wf-200 px-3 py-2">{row.delivery_days_max ?? "—"}</td>
                  <td className="border-b border-wf-200 px-3 py-2 font-mono text-[10px]">{row.shipping_profile_id || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
