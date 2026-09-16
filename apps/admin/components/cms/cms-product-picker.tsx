"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { listAdminProducts, type ApprovalProductRow } from "../../lib/product-approval-admin-api"
import { displayMediaUrl } from "../../lib/media-url"

type CatalogHit = {
  id: string
  title: string
  brand: string
  image: string | null
  matchReasons: string[]
}

function buildMatchReasons(row: ApprovalProductRow, query: string): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const reasons: string[] = []
  const title = row.title?.trim() || ""
  const brand = row.brand_name?.trim() || ""
  const ean = row.identifier_value?.trim() || ""
  const sku =
    row.sku_hint?.trim() ||
    row.variants?.find((v) => v.sku)?.sku?.trim() ||
    ""
  const categories = Array.isArray(row.category_names)
    ? row.category_names.filter(Boolean)
    : []

  if (title && title.toLowerCase().includes(q)) reasons.push(`Productnaam: ${title}`)
  if (brand && brand.toLowerCase().includes(q)) reasons.push(`Merk: ${brand}`)
  for (const cat of categories) {
    if (cat.toLowerCase().includes(q)) {
      reasons.push(`Categorie: ${cat}`)
      break
    }
  }
  if (sku && sku.toLowerCase().includes(q)) reasons.push(`SKU: ${sku}`)
  if (ean && ean.toLowerCase().includes(q)) reasons.push(`EAN: ${ean}`)
  if (row.id.toLowerCase().includes(q) && reasons.length === 0) {
    reasons.push(`Product-ID: ${row.id}`)
  }
  if (reasons.length === 0) reasons.push("Gevonden in Product Cloud")
  return reasons
}

function mapHit(row: ApprovalProductRow, query: string): CatalogHit {
  const imageRaw =
    row.primary_image_url ||
    (row.media?.[0]?.storage_reference
      ? String(row.media[0].storage_reference)
      : null)
  return {
    id: row.id,
    title: row.title?.trim() || row.id,
    brand: row.brand_name?.trim() || "",
    image: displayMediaUrl(imageRaw),
    matchReasons: buildMatchReasons(row, query),
  }
}

/**
 * Search / add / remove / reorder Product Cloud products (same source as homepage rails).
 */
export function CmsProductPicker(props: {
  productIds: string[]
  onChange: (ids: string[]) => void
}) {
  const { productIds: ids, onChange } = props
  const [q, setQ] = useState("")
  const [hits, setHits] = useState<CatalogHit[]>([])
  const [busy, setBusy] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [selectedMeta, setSelectedMeta] = useState<Record<string, CatalogHit>>({})
  const boxRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestGen = useRef(0)

  async function runSearch(term: string) {
    const query = term.trim()
    if (query.length < 1) {
      setHits([])
      setSearched(false)
      setSearchError(null)
      setBusy(false)
      return
    }
    const gen = ++requestGen.current
    setBusy(true)
    setSearchError(null)
    try {
      const res = await listAdminProducts({ q: query, limit: 24 })
      if (gen !== requestGen.current) return
      const mapped = (res.products ?? []).map((row) => mapHit(row, query)).filter((p) => p.id)
      setHits(mapped)
      setSearched(true)
      setOpen(true)
      setSelectedMeta((prev) => {
        const next = { ...prev }
        for (const hit of mapped) next[hit.id] = hit
        return next
      })
    } catch (e) {
      if (gen !== requestGen.current) return
      setHits([])
      setSearched(true)
      setOpen(true)
      setSearchError(e instanceof Error ? e.message : "Zoeken mislukt.")
    } finally {
      if (gen === requestGen.current) setBusy(false)
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void runSearch(q)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  const availableHits = useMemo(
    () => hits.filter((h) => !ids.includes(h.id)),
    [hits, ids]
  )

  return (
    <div className="space-y-2">
      <div ref={boxRef} className="relative">
        <input
          className="h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (q.trim()) setOpen(true)
          }}
          placeholder="Zoek op productnaam, merk, SKU of EAN"
          autoComplete="off"
        />
        {busy ? <p className="mt-1 text-[11px] text-wf-500">Zoeken…</p> : null}
        {searchError ? (
          <p className="mt-1 text-[11px] text-red-700">{searchError}</p>
        ) : null}
        {open && q.trim() ? (
          <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-wf-200 bg-white shadow-lg">
            {availableHits.length === 0 && searched && !busy ? (
              <li className="px-3 py-2 text-[12px] text-wf-500">Geen producten gevonden.</li>
            ) : (
              availableHits.map((hit) => (
                <li key={hit.id} className="border-b border-wf-100 last:border-0">
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 px-2 py-2 text-left hover:bg-wf-50"
                    onClick={() => {
                      if (ids.includes(hit.id)) return
                      onChange([...ids, hit.id])
                      setSelectedMeta((prev) => ({ ...prev, [hit.id]: hit }))
                      setQ("")
                      setHits([])
                      setOpen(false)
                      setSearched(false)
                    }}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded border border-wf-100 bg-wf-50">
                      {hit.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={hit.image} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-wf-400">—</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-wf-900">
                        {hit.title}
                      </span>
                      <span className="mt-0.5 block space-y-0.5 text-[10.5px] leading-snug text-wf-600">
                        {hit.matchReasons.map((reason) => (
                          <span key={reason} className="block truncate">
                            {reason}
                          </span>
                        ))}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      {ids.length > 0 ? (
        <ul className="space-y-1 text-[12px]">
          {ids.map((id, index) => {
            const meta = selectedMeta[id]
            return (
              <li
                key={id}
                className="flex items-center justify-between gap-2 rounded border border-wf-100 bg-white px-2 py-1.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border border-wf-100 bg-wf-50">
                    {meta?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={meta.image} alt="" className="h-full w-full object-contain" />
                    ) : null}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-wf-900">{meta?.title || id}</p>
                    <p className="truncate text-[10px] text-wf-500">
                      {meta?.brand || <span className="font-mono">{id}</span>}
                    </p>
                  </div>
                </div>
                <span className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="underline disabled:opacity-40"
                    disabled={index === 0}
                    onClick={() => {
                      const next = [...ids]
                      const tmp = next[index - 1]!
                      next[index - 1] = next[index]!
                      next[index] = tmp
                      onChange(next)
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="underline disabled:opacity-40"
                    disabled={index >= ids.length - 1}
                    onClick={() => {
                      const next = [...ids]
                      const tmp = next[index + 1]!
                      next[index + 1] = next[index]!
                      next[index] = tmp
                      onChange(next)
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="text-red-700 underline"
                    onClick={() => onChange(ids.filter((x) => x !== id))}
                  >
                    Verwijderen
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-[11px] text-wf-500">Nog geen producten geselecteerd.</p>
      )}
    </div>
  )
}
