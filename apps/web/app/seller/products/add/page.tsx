"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import {
  matchByEan,
  ProductCloudApiError,
  type EanMatchResponse,
  type ProductCloudPreview,
} from "../../_lib/product-cloud-api"

type View =
  | { kind: "search" }
  | { kind: "exact"; data: EanMatchResponse; ean: string }
  | { kind: "none"; ean: string }
  | { kind: "uncertain"; data: EanMatchResponse; ean: string }

function PreviewBlock({
  preview,
  ean,
}: {
  preview: ProductCloudPreview
  ean: string
}) {
  return (
    <div className="mb-4 rounded-lg border border-wf-200 p-5">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
        Gevonden product
      </h3>
      <div className="flex justify-between py-1 text-[12.5px] text-wf-800">
        <span className="text-wf-600">Titel</span>
        <span>{preview.title ?? "—"}</span>
      </div>
      <div className="flex justify-between py-1 text-[12.5px] text-wf-800">
        <span className="text-wf-600">Merk</span>
        <span>{preview.brand_id}</span>
      </div>
      <div className="flex justify-between py-1 text-[12.5px] text-wf-800">
        <span className="text-wf-600">EAN</span>
        <span>{preview.identifier_value ?? ean}</span>
      </div>
      <div className="flex justify-between py-1 text-[12.5px] text-wf-800">
        <span className="text-wf-600">Categorie</span>
        <span>
          {preview.category_names.length
            ? preview.category_names.join(" > ")
            : "—"}
        </span>
      </div>
    </div>
  )
}

function AiBox({
  ok,
  label,
  note,
}: {
  ok: boolean
  label: string
  note: string
}) {
  return (
    <div className="rounded-md border border-dashed border-wf-500 p-4 text-[11.5px] leading-relaxed text-wf-700">
      <div className="mb-1.5">
        <span className="font-bold text-wf-800">{ok ? "✓ " : "⚠ "}</span>
        {label}
      </div>
      <div>{note}</div>
    </div>
  )
}

export default function SellerProductAddPage() {
  const router = useRouter()
  const [ean, setEan] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>({ kind: "search" })

  async function onSearch() {
    const value = ean.trim()
    if (!value) {
      setError("Vul een EAN / GTIN in.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const data = await matchByEan(value)
      if (data.outcome === "exact_match") {
        setView({ kind: "exact", data, ean: value })
      } else if (data.outcome === "uncertain") {
        setView({ kind: "uncertain", data, ean: value })
      } else {
        setView({ kind: "none", ean: value })
      }
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : "Zoeken mislukt. Probeer opnieuw."
      )
    } finally {
      setBusy(false)
    }
  }

  const breadcrumb =
    view.kind === "exact"
      ? [
          { label: "Seller Dashboard", href: "/seller" },
          { label: "Producten", href: "/seller/products" },
          { label: "Match gevonden" },
        ]
      : view.kind === "none"
        ? [
            { label: "Seller Dashboard", href: "/seller" },
            { label: "Producten", href: "/seller/products" },
            { label: "Geen match gevonden" },
          ]
        : view.kind === "uncertain"
          ? [
              { label: "Seller Dashboard", href: "/seller" },
              { label: "Producten", href: "/seller/products" },
              { label: "Onzekere match" },
            ]
          : [
              { label: "Seller Dashboard", href: "/seller" },
              { label: "Producten", href: "/seller/products" },
              { label: "Product toevoegen — EAN-zoeken" },
            ]

  return (
    <SellerGate breadcrumb={breadcrumb}>
      {view.kind === "search" ? (
        <>
          <h1 className="text-[19px] font-bold text-wf-900">
            Product toevoegen — EAN-zoeken
          </h1>
          <p className="mb-5 mt-1.5 text-xs text-wf-600">
            Zoek op EAN/GTIN om te controleren of dit product al in de Product
            Cloud bestaat.
          </p>
          <div className="mb-3.5 max-w-xl">
            <label className="mb-1.5 block text-xs font-semibold text-wf-700">
              EAN / GTIN
            </label>
            <Input
              value={ean}
              onChange={(e) => setEan(e.target.value)}
              placeholder="bijv. 8712345678901"
              onKeyDown={(e) => {
                if (e.key === "Enter") void onSearch()
              }}
            />
            <p className="mt-1 text-[10.5px] text-wf-500">
              Sterkste matchsleutel (Product Cloud Architecture Deel 2.4). Geen
              EAN? Gebruik MPN via &apos;Nieuw product aanmaken&apos;.
            </p>
          </div>
          {error ? (
            <Notice variant="warning" className="mb-4 max-w-xl">
              {error}
            </Notice>
          ) : null}
          <div className="mt-5 flex justify-end gap-2.5">
            <Button
              variant="secondary"
              type="button"
              onClick={() => router.push("/seller/products")}
            >
              Annuleren
            </Button>
            <Button type="button" disabled={busy} onClick={() => void onSearch()}>
              {busy ? "Zoeken…" : "Zoeken"}
            </Button>
          </div>
          <Notice className="mt-5 max-w-xl">
            Resultaat verschijnt hieronder zodra gezocht is — zie &apos;Match
            gevonden&apos; / &apos;Geen match gevonden&apos; in deze
            wireframe-groep.
          </Notice>
        </>
      ) : null}

      {view.kind === "exact" && view.data.product_preview ? (
        <>
          <h1 className="text-[19px] font-bold text-wf-900">Match gevonden</h1>
          <p className="mb-5 mt-1.5 text-xs text-wf-600">
            Dit product bestaat al in de Product Cloud — koppel je aanbod eraan.
          </p>
          <div className="grid gap-5 desktop:grid-cols-[1.7fr_1fr]">
            <div>
              <PreviewBlock preview={view.data.product_preview} ean={view.ean} />
              <div className="rounded-lg border border-wf-200 p-5">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                  Jouw aanbod — commerciële gegevens
                </h3>
                  <div className="mb-3.5">
                  <label className="mb-1.5 block text-xs font-semibold text-wf-700">
                    Prijs
                  </label>
                  <Input placeholder="€ 0,00" disabled />
                </div>
                <div className="mb-3.5">
                  <label className="mb-1.5 block text-xs font-semibold text-wf-700">
                    Voorraad
                  </label>
                  <Input placeholder="Aantal" disabled />
                </div>
                <Notice>
                  Prijs en voorraad stel je in op het volgende scherm (Commerce
                  Cloud Offer).
                </Notice>
              </div>
            </div>
            <AiBox
              ok
              label={`EAN-match: ${view.data.confidence_label ?? "100% zekerheid"}`}
              note={
                view.data.confidence_note ??
                "Deterministische match — AI ondersteunt, beslist nooit."
              }
            />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5 border-t border-wf-300 bg-wf-100 px-0 py-4 tablet:px-0">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setView({ kind: "search" })
                setError(null)
              }}
            >
              Terug naar zoeken
            </Button>
            <Button
              type="button"
              disabled={
                !view.data.identifier_id &&
                !view.data.product_preview?.identifier_id
              }
              onClick={() => {
                const id =
                  view.data.identifier_id ??
                  view.data.product_preview?.identifier_id
                if (!id) {
                  setError(
                    "Identifier ontbreekt — zoek opnieuw of neem contact op."
                  )
                  return
                }
                router.push(
                  `/seller/products/offer?identifier_id=${encodeURIComponent(id)}`
                )
              }}
            >
              Aanbod aanmaken
            </Button>
          </div>
        </>
      ) : null}

      {view.kind === "none" ? (
        <>
          <h1 className="text-[19px] font-bold text-wf-900">
            Geen match gevonden
          </h1>
          <p className="mb-5 mt-1.5 text-xs text-wf-600">
            Er bestaat nog geen product met dit EAN in de Product Cloud.
          </p>
          <div className="px-7 py-[60px] text-center text-wf-600">
            <div className="mx-auto mb-3.5 h-11 w-11 rounded-full border border-dashed border-wf-400" />
            <p className="mb-1.5 text-sm font-bold text-wf-800">Geen resultaten</p>
            <p className="text-xs text-wf-600">
              Controleer het ingevoerde EAN ({view.ean}), of maak een nieuw
              product aan als dit de eerste keer is dat dit product wordt
              aangeboden.
            </p>
          </div>
          <div className="mt-5 flex justify-end gap-2.5">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setView({ kind: "search" })
                setError(null)
              }}
            >
              Opnieuw zoeken
            </Button>
            <Link
              href="/seller/products/new"
              className="inline-flex items-center justify-center rounded-wf border border-transparent bg-wf-900 px-[18px] py-[9px] text-sm font-semibold text-white hover:bg-wf-800"
            >
              Nieuw product aanmaken
            </Link>
          </div>
        </>
      ) : null}

      {view.kind === "uncertain" ? (
        <>
          <h1 className="text-[19px] font-bold text-wf-900">Onzekere match</h1>
          <p className="mb-5 mt-1.5 text-xs text-wf-600">
            Er is geen unieke deterministische EAN-match. AI ondersteunt; jij
            beslist (ADR-0012 / ADR-0007).
          </p>
          <div className="mb-5 grid gap-5 desktop:grid-cols-[1.7fr_1fr]">
            <div>
              {(view.data.candidate_previews ?? []).length === 0 ? (
                <Notice>
                  Er zijn kandidaten geregistreerd, maar geen preview
                  beschikbaar. Zoek opnieuw of maak een nieuw product.
                </Notice>
              ) : (
                view.data.candidate_previews!.map((preview) => (
                  <PreviewBlock
                    key={preview.product_id}
                    preview={preview}
                    ean={view.ean}
                  />
                ))
              )}
            </div>
            <AiBox
              ok={false}
              label={view.data.confidence_label ?? "Onzeker — AI-ondersteuning"}
              note={
                view.data.confidence_note ??
                "AI ondersteunt; de verkoper beslist. Geen automatische koppeling."
              }
            />
          </div>
          <div className="mt-5 flex justify-end gap-2.5">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setView({ kind: "search" })
                setError(null)
              }}
            >
              Opnieuw zoeken
            </Button>
            <Link
              href="/seller/products/new"
              className="inline-flex items-center justify-center rounded-wf border border-transparent bg-wf-900 px-[18px] py-[9px] text-sm font-semibold text-white hover:bg-wf-800"
            >
              Nieuw product aanmaken
            </Link>
          </div>
        </>
      ) : null}
    </SellerGate>
  )
}
