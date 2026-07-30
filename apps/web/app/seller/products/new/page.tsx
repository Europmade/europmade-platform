"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import {
  createProduct,
  ProductCloudApiError,
} from "../../_lib/product-cloud-api"

const CATEGORIES = [
  "Algemeen",
  "Elektronica",
  "Mode",
  "Home & Living",
  "Sport & Outdoor",
  "Beauty & Verzorging",
] as const

/** GTIN: 8–14 digits; otherwise MPN (ADR-0016). */
function resolveIdentifier(raw: string): {
  identifier_type: "GTIN" | "MPN"
  identifier_value: string
} {
  const value = raw.trim()
  if (/^\d{8,14}$/.test(value)) {
    return { identifier_type: "GTIN", identifier_value: value }
  }
  return { identifier_type: "MPN", identifier_value: value }
}

/** product-04 — Retailer Created (S3-03-06, ADR-0016). */
export default function SellerProductNewPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState("")
  const [brand, setBrand] = useState("")
  const [category, setCategory] = useState<string>("")
  const [identifier, setIdentifier] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit() {
    const trimmedTitle = title.trim()
    const trimmedBrand = brand.trim()
    const trimmedId = identifier.trim()
    if (!trimmedTitle) {
      setError("Vul een producttitel in.")
      return
    }
    if (!trimmedBrand) {
      setError("Vul een merknaam in.")
      return
    }
    if (!category) {
      setError("Kies een categorie.")
      return
    }
    if (!trimmedId) {
      setError("Vul een EAN/GTIN of MPN in.")
      return
    }

    const { identifier_type, identifier_value } = resolveIdentifier(trimmedId)
    setBusy(true)
    setError(null)
    try {
      const result = await createProduct({
        brand_id: trimmedBrand,
        manufacturer_id: trimmedBrand,
        title: trimmedTitle,
        description: trimmedTitle,
        category_name: category,
        identifier_type,
        identifier_value,
        create_as_retailer: true,
        media: fileName
          ? [
              {
                media_type: "Hoofdafbeelding",
                storage_reference: `upload://${fileName}`,
              },
            ]
          : undefined,
      })

      if (!result.created && result.exact_match_existing) {
        if (result.identifier_id) {
          router.push(
            `/seller/products/offer?identifier_id=${encodeURIComponent(result.identifier_id)}`
          )
          return
        }
        setError(
          result.message ??
            "Dit product bestaat al. Zoek op EAN om een aanbod te koppelen."
        )
        return
      }

      if (!result.identifier_id) {
        setError("Product aangemaakt, maar identifier ontbreekt.")
        return
      }

      router.push(
        `/seller/products/offer?identifier_id=${encodeURIComponent(result.identifier_id)}`
      )
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : "Aanmaken mislukt. Probeer opnieuw."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Producten", href: "/seller/products" },
        { label: "Nieuw product aanmaken — Retailer Created" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        Nieuw product aanmaken
      </h1>
      <p className="mb-5 mt-1.5 text-xs text-wf-600">
        Retailer Created — dit product krijgt de status &apos;Retailer
        Created&apos; tot een Producent/Merkhouder het eventueel claimt (Product
        Cloud Architecture Deel 8.1).
      </p>

      <div className="mb-3.5 max-w-xl">
        <label className="mb-1.5 block text-xs font-semibold text-wf-700">
          Producttitel
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Bijv. Draadloze koptelefoon XR-200"
        />
      </div>
      <div className="mb-3.5 max-w-xl">
        <label className="mb-1.5 block text-xs font-semibold text-wf-700">
          Merk
        </label>
        <Input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Merknaam"
        />
      </div>
      <div className="mb-3.5 max-w-xl">
        <label className="mb-1.5 block text-xs font-semibold text-wf-700">
          Categorie
        </label>
        <select
          className="w-full rounded-wf border border-wf-400 bg-white px-3 py-2 text-sm text-wf-800"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Kies categorie...</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3.5 max-w-xl">
        <label className="mb-1.5 block text-xs font-semibold text-wf-700">
          EAN/GTIN (optioneel) of MPN
        </label>
        <Input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="EAN of fabrikantnummer"
        />
      </div>
      <div className="mb-3.5 max-w-xl">
        <label className="mb-1.5 block text-xs font-semibold text-wf-700">
          Hoofdafbeelding
        </label>
        <div className="flex flex-wrap items-center gap-2.5 rounded-wf border border-dashed border-wf-400 px-3 py-2.5">
          <span className="text-xs text-wf-600">
            {fileName ?? "Nog geen bestand gekozen"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              setFileName(file?.name ?? null)
            }}
          />
          <button
            type="button"
            className="rounded-wf border border-wf-500 bg-white px-3 py-1.5 text-xs font-semibold text-wf-800"
            onClick={() => fileRef.current?.click()}
          >
            Uploaden
          </button>
        </div>
      </div>

      <Notice variant="warning" className="mb-4 max-w-xl">
        Verplicht vóór publicatie: minimaal één hoofdafbeelding en alle
        verplichte attributen voor deze categorie.
      </Notice>

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
        <Button type="button" disabled={busy} onClick={() => void onSubmit()}>
          {busy ? "Bezig…" : "Product aanmaken (concept)"}
        </Button>
      </div>
    </SellerGate>
  )
}
