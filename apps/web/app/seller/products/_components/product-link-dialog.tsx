"use client"

import { useMemo, useState } from "react"
import { Notice } from "@europmade/ui"
import {
  ProductCloudApiError,
  submitProductLinkGroupProposal,
  type CatalogProduct,
  type ProductLinkGroupProposal,
} from "../../_lib/product-cloud-api"
import { resolveSellerMediaUrl } from "../../_lib/media-url"
import {
  SELLER_PRODUCT_LINK_DIMENSIONS,
  buildProductLinkProposalBody,
} from "../../_lib/product-link-proposal"

function brandLabel(p: CatalogProduct) {
  if (p.brand_name) return p.brand_name
  if (p.brand_id && !p.brand_id.startsWith("brand_")) return p.brand_id
  return "—"
}

export function ProductLinkDialog({
  products,
  onClose,
  onSubmitted,
}: {
  products: CatalogProduct[]
  onClose: () => void
  onSubmitted: (group: ProductLinkGroupProposal) => void
}) {
  const defaultName = useMemo(() => {
    const titles = products
      .map((p) => p.title?.trim())
      .filter(Boolean)
      .slice(0, 3)
    return titles.length ? `Koppeling ${titles.join(", ")}` : "Koppeling"
  }, [products])

  const [name, setName] = useState(defaultName)
  const [note, setNote] = useState("")
  const [dimensions, setDimensions] = useState<string[]>(["Kleur"])
  const [values, setValues] = useState<Record<string, Record<string, string>>>(
    () => Object.fromEntries(products.map((p) => [p.id, { Kleur: "" }]))
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function setDimensionAt(index: number, next: string) {
    setDimensions((prev) => {
      const copy = [...prev]
      copy[index] = next
      return copy
    })
  }

  function addDimension() {
    const unused = SELLER_PRODUCT_LINK_DIMENSIONS.find(
      (dim) => !dimensions.includes(dim)
    )
    if (!unused) return
    setDimensions((prev) => [...prev, unused])
  }

  function removeDimension(index: number) {
    if (dimensions.length <= 1) return
    setDimensions((prev) => prev.filter((_, i) => i !== index))
  }

  function setValue(productId: string, dim: string, value: string) {
    setValues((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), [dim]: value },
    }))
  }

  async function submit() {
    setError(null)
    let body
    try {
      body = buildProductLinkProposalBody({
        name,
        dimensions,
        note,
        members: products.map((p) => ({
          product_id: p.id,
          values: values[p.id] || {},
        })),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Controleer de velden.")
      return
    }
    setBusy(true)
    try {
      const res = await submitProductLinkGroupProposal(body)
      onSubmitted(res.product_link_group)
    } catch (err) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : "Voorstel indienen mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-link-title"
      onClick={() => {
        if (!busy) onClose()
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-wf-300 bg-white p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="product-link-title" className="text-sm font-bold text-wf-900">
          Producten koppelen
        </h2>
        <p className="mt-1 text-[11px] text-wf-600">
          Je dient een voorstel in. De producten blijven zelfstandig. Alleen
          EuropMade-beheer keurt de koppeling later goed.
        </p>

        {error ? (
          <Notice variant="warning" className="mt-3">
            {error}
          </Notice>
        ) : null}

        <label className="mt-3 block text-xs font-semibold text-wf-700">
          Naam
          <input
            className="mt-1 h-9 w-full rounded-[5px] border border-wf-400 px-3 text-xs"
            value={name}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="mt-3 space-y-2">
          {dimensions.map((dim, index) => (
            <div key={`${dim}-${index}`} className="flex flex-wrap items-end gap-2">
              <label className="min-w-[10rem] flex-1 text-xs font-semibold text-wf-700">
                Dimensie {index + 1}
                <select
                  className="mt-1 h-9 w-full rounded-[5px] border border-wf-400 bg-white px-2 text-xs"
                  value={dim}
                  disabled={busy}
                  onChange={(e) => setDimensionAt(index, e.target.value)}
                >
                  {SELLER_PRODUCT_LINK_DIMENSIONS.map((option) => (
                    <option
                      key={option}
                      value={option}
                      disabled={
                        option !== dim && dimensions.includes(option)
                      }
                    >
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              {dimensions.length > 1 ? (
                <button
                  type="button"
                  className="h-9 rounded-[5px] border border-wf-400 px-2 text-xs text-wf-700"
                  disabled={busy}
                  onClick={() => removeDimension(index)}
                >
                  Verwijderen
                </button>
              ) : null}
            </div>
          ))}
          {dimensions.length < SELLER_PRODUCT_LINK_DIMENSIONS.length ? (
            <button
              type="button"
              className="text-xs font-semibold text-wf-800 underline"
              disabled={busy}
              onClick={addDimension}
            >
              Dimensie toevoegen
            </button>
          ) : null}
        </div>

        <div className="mt-4 overflow-x-auto rounded border border-wf-200">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="bg-wf-50 text-[11px] uppercase tracking-wide text-wf-500">
              <tr>
                <th className="px-2 py-2">Product</th>
                {dimensions.map((dim) => (
                  <th key={dim} className="px-2 py-2">
                    Waarde · {dim}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const imageSrc = resolveSellerMediaUrl(p.primary_image_url)
                return (
                  <tr key={p.id} className="border-t border-wf-100 align-top">
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        {imageSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageSrc}
                            alt=""
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-wf-100" />
                        )}
                        <div>
                          <p className="text-[10px] uppercase text-wf-500">
                            {brandLabel(p)}
                          </p>
                          <p className="font-semibold text-wf-900">
                            {p.title || p.id}
                          </p>
                          <p className="font-mono text-[10px] text-wf-500">
                            {p.id}
                          </p>
                          <p className="font-mono text-[10px] text-wf-500">
                            GTIN {p.identifier_value || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    {dimensions.map((dim) => (
                      <td key={dim} className="px-2 py-2">
                        <input
                          className="h-8 w-full rounded-[5px] border border-wf-400 px-2 text-xs"
                          placeholder="Waarde"
                          disabled={busy}
                          value={values[p.id]?.[dim] || ""}
                          onChange={(e) => setValue(p.id, dim, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <label className="mt-3 block text-xs font-semibold text-wf-700">
          Toelichting (optioneel)
          <textarea
            className="mt-1 w-full rounded-[5px] border border-wf-400 px-2 py-1.5 text-xs"
            rows={2}
            disabled={busy}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-[5px] border border-wf-400 bg-white px-3 text-xs font-semibold text-wf-800"
            disabled={busy}
            onClick={onClose}
          >
            Annuleren
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-[5px] bg-wf-900 px-3 text-xs font-semibold text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? "Bezig…" : "Voorstel indienen"}
          </button>
        </div>
      </div>
    </div>
  )
}
