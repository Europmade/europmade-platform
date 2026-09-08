"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Input, Notice } from "@europmade/ui"
import { listAdminProducts, type ApprovalProductRow } from "../../../../lib/product-approval-admin-api"

export default function CmsProductsSearchPage() {
  const [q, setQ] = useState("")
  const [rows, setRows] = useState<ApprovalProductRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function search() {
    setBusy(true)
    setError(null)
    try {
      const res = await listAdminProducts({ q: q.trim() || undefined, limit: 30 })
      setRows(res.products ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Zoeken mislukt")
    } finally {
      setBusy(false)
    }
  }

  const hint = useMemo(
    () => "Zoek op productnaam, SKU of EAN/GTIN in Product Cloud.",
    []
  )

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-wf-500">
        <Link href="/cms" className="hover:underline">
          CMS
        </Link>{" "}
        / Productpagina&apos;s
      </p>
      <h1 className="text-xl font-bold text-wf-950">Aanvullende product-CMS</h1>
      <p className="text-sm text-wf-600">
        Productdata (naam, prijs, gallery, EAN) blijft in Product Cloud. Hier
        beheer je alleen aanvullende redactionele content of — via de template —
        de standaard layout van productpagina&apos;s.
      </p>
      <div className="rounded-xl border border-wf-200 bg-wf-50 p-3 text-sm text-wf-700">
        <p className="font-semibold text-wf-900">Aanbevolen workflow</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          <li>Bewerk eerst het Producttemplate (layout + standaard CMS-secties).</li>
          <li>
            Open alleen een individueel product als je product-specifieke
            intro/FAQ/USP&apos;s nodig hebt.
          </li>
        </ol>
      </div>
      <Link
        href="/cms/products/template"
        className="inline-flex rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900 hover:border-sky-400"
      >
        Producttemplate bewerken (aanbevolen)
      </Link>
      <p className="text-sm text-wf-600">{hint}</p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void search()
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Naam, SKU of EAN"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-wf bg-wf-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Zoeken
        </button>
      </form>
      {error ? <Notice variant="warning">{error}</Notice> : null}
      <ul className="space-y-2">
        {rows.map((p) => (
          <li key={p.id}>
            <Link
              href={`/cms/products/${encodeURIComponent(p.id)}`}
              className="flex items-center gap-3 rounded-xl border border-wf-200 bg-white p-3 hover:border-wf-400"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-wf-50">
                {p.primary_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.primary_image_url} alt="" className="h-full w-full object-contain" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-wf-900">{p.title || p.id}</p>
                <p className="text-[12px] text-wf-500">
                  {p.brand_name || "—"} · SKU {p.sku_hint || "—"} · EAN {p.identifier_value || "—"}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
