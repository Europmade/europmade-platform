"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import {
  createProduct,
  ProductCloudApiError,
  uploadProductMediaFile,
} from "../../_lib/product-cloud-api"
import {
  BrandApiError,
  createSellerBrand,
  listSellerBrands,
  type ManageableBrand,
} from "../../_lib/brands-api"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t, type StorefrontMessageKey } from "../../../_lib/i18n/messages"

const CATEGORY_KEYS = [
  { value: "Tuin", key: "catTuin" as StorefrontMessageKey },
  { value: "Elektronica", key: "catElektronica" as StorefrontMessageKey },
  { value: "Mode", key: "catMode" as StorefrontMessageKey },
  { value: "Wonen", key: "catWonen" as StorefrontMessageKey },
  { value: "Sport", key: "catSport" as StorefrontMessageKey },
  { value: "Voeding", key: "catVoeding" as StorefrontMessageKey },
  { value: "Keuken", key: "catKeuken" as StorefrontMessageKey },
  { value: "Huishouden", key: "catHuishouden" as StorefrontMessageKey },
  { value: "Beauty & Verzorging", key: "catBeautyVerzorging" as StorefrontMessageKey },
  { value: "Baby & Kind", key: "catBabyKind" as StorefrontMessageKey },
  { value: "Speelgoed", key: "catSpeelgoed" as StorefrontMessageKey },
  { value: "Dieren", key: "catDieren" as StorefrontMessageKey },
  { value: "Klus & Gereedschap", key: "catKlusGereedschap" as StorefrontMessageKey },
  { value: "Auto & Motor", key: "catAutoMotor" as StorefrontMessageKey },
  { value: "Kantoor", key: "catKantoor" as StorefrontMessageKey },
  { value: "Boeken & Media", key: "catBoekenMedia" as StorefrontMessageKey },
  { value: "Gezondheid", key: "catGezondheid" as StorefrontMessageKey },
  { value: "Verlichting", key: "catVerlichting" as StorefrontMessageKey },
  { value: "Badkamer", key: "catBadkamer" as StorefrontMessageKey },
  { value: "Slaapkamer", key: "catSlaapkamer" as StorefrontMessageKey },
  { value: "Outdoor", key: "catOutdoor" as StorefrontMessageKey },
  { value: "Duurzaam", key: "catDuurzaam" as StorefrontMessageKey },
  { value: "Cadeaus", key: "catCadeaus" as StorefrontMessageKey },
  { value: "Juwelen & Horloges", key: "catJuwelenHorloges" as StorefrontMessageKey },
  { value: "Tassen & Accessoires", key: "catTassenAccessoires" as StorefrontMessageKey },
  { value: "Schoenen", key: "catSchoenen" as StorefrontMessageKey },
  { value: "Plant & Bloem", key: "catPlantBloem" as StorefrontMessageKey },
  { value: "Feest & Seizoen", key: "catFeestSeizoen" as StorefrontMessageKey },
  { value: "Ambacht", key: "catAmbacht" as StorefrontMessageKey },
  { value: "Algemeen", key: "catAlgemeen" as StorefrontMessageKey },
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
  const locale = useStorefrontLocale()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState("")
  const [brand, setBrand] = useState("")
  const [brands, setBrands] = useState<ManageableBrand[]>([])
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [brandCreateBusy, setBrandCreateBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [category, setCategory] = useState<string>("")
  const [identifier, setIdentifier] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void listSellerBrands()
      .then((res) => setBrands(res.brands || []))
      .catch(() => setBrands([]))
  }, [])

  async function onCreateBrand() {
    const name = newBrandName.trim()
    if (!name) {
      setError(t("sellerProductNewBrandRequired", locale))
      return
    }
    setBrandCreateBusy(true)
    setError(null)
    setNotice(null)
    try {
      const created = await createSellerBrand({ name })
      const row = created.brand
      setBrands((prev) =>
        prev.some((b) => b.id === row.id) ? prev : [...prev, row]
      )
      setBrand(row.id)
      setShowNewBrand(false)
      setNewBrandName("")
      setNotice(t("brandCreated", locale))
      void listSellerBrands()
        .then((res) => {
          const next = res.brands || []
          if (next.some((b) => b.id === row.id)) setBrands(next)
        })
        .catch(() => {
          /* keep locally added brand */
        })
    } catch (err) {
      setNotice(null)
      setError(
        err instanceof BrandApiError
          ? err.message
          : t("brandCreateFailed", locale)
      )
    } finally {
      setBrandCreateBusy(false)
    }
  }

  async function onSubmit() {
    const trimmedTitle = title.trim()
    const trimmedBrand = brand.trim()
    const trimmedId = identifier.trim()
    if (!trimmedTitle) {
      setError(t("sellerProductNewTitleRequired", locale))
      return
    }
    if (!trimmedBrand) {
      setError(t("sellerProductNewBrandRequired", locale))
      return
    }
    if (!category) {
      setError(t("sellerProductNewCategoryRequired", locale))
      return
    }
    if (!trimmedId) {
      // EAN/GTIN optional at concept creation — seller can add it in the product flow.
    } else {
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
        })

        if (!result.created && result.exact_match_existing) {
          if (result.product_id) {
            router.push(`/seller/products/${result.product_id}?tab=offer`)
            return
          }
          setError(result.message ?? t("sellerProductNewExists", locale))
          return
        }

        if (!result.product_id) {
          setError(t("sellerProductNewCreatedNoId", locale))
          return
        }

        if (pendingFile) {
          await uploadProductMediaFile(result.product_id, pendingFile, {
            media_type: "Hoofdafbeelding",
            version_id: result.version_id,
          })
        }

        router.push(`/seller/products/${result.product_id}?tab=information`)
      } catch (err: unknown) {
        setError(
          err instanceof ProductCloudApiError
            ? err.message
            : t("sellerProductNewCreateFailed", locale)
        )
      } finally {
        setBusy(false)
      }
      return
    }

    setBusy(true)
    setError(null)
    try {
      const result = await createProduct({
        brand_id: trimmedBrand,
        manufacturer_id: trimmedBrand,
        title: trimmedTitle,
        description: trimmedTitle,
        category_name: category,
        create_as_retailer: true,
      })

      if (!result.product_id) {
        setError(t("sellerProductNewCreatedNoId", locale))
        return
      }

      if (pendingFile) {
        await uploadProductMediaFile(result.product_id, pendingFile, {
          media_type: "Hoofdafbeelding",
          version_id: result.version_id,
        })
      }

      router.push(`/seller/products/${result.product_id}?tab=information`)
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("sellerProductNewCreateFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavProducts", locale), href: "/seller/products" },
        { label: t("sellerProductNewBreadcrumb", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("sellerProductNewTitle", locale)}
      </h1>
      <p className="mb-5 mt-1.5 text-xs text-wf-600">
        {t("sellerProductNewIntro", locale)}
      </p>

      <div className="mb-3.5 max-w-xl">
        <label className="mb-1.5 block text-xs font-semibold text-wf-700">
          {t("sellerProductNewTitleLabel", locale)}
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("sellerProductNewTitlePlaceholder", locale)}
        />
      </div>
      {notice ? (
        <div className="mb-3 max-w-xl">
          <Notice variant="success">{notice}</Notice>
        </div>
      ) : null}
      <div className="mb-3.5 max-w-xl">
        <label className="mb-1.5 block text-xs font-semibold text-wf-700">
          {t("commonBrand", locale)}
        </label>
        <select
          className="w-full rounded-wf border border-wf-400 bg-white px-3 py-2 text-sm text-wf-800"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        >
          <option value="">{t("sellerProductNewBrandPlaceholder", locale)}</option>
          {brands.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <div className="mt-2 space-y-2">
          <Button
            size="sm"
            type="button"
            variant="secondary"
            onClick={() => setShowNewBrand((v) => !v)}
          >
            {t("pdpAddBrand", locale)}
          </Button>
          {showNewBrand ? (
            <div className="space-y-2 rounded border border-wf-300 p-2">
              <Input
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder={t("brandNamePlaceholder", locale)}
              />
              <Button
                size="sm"
                type="button"
                disabled={brandCreateBusy}
                onClick={() => void onCreateBrand()}
              >
                {t("commonSave", locale)}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="mb-3.5 max-w-xl">
        <label className="mb-1.5 block text-xs font-semibold text-wf-700">
          {t("commonCategory", locale)}
        </label>
        <select
          className="w-full rounded-wf border border-wf-400 bg-white px-3 py-2 text-sm text-wf-800"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">{t("sellerProductNewChooseCategory", locale)}</option>
          {CATEGORY_KEYS.map((c) => (
            <option key={c.value} value={c.value}>
              {t(c.key, locale)}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3.5 max-w-xl">
        <label className="mb-1.5 block text-xs font-semibold text-wf-700">
          {t("sellerProductNewIdentifierLabel", locale)}
        </label>
        <Input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={t("sellerProductNewIdentifierPlaceholder", locale)}
        />
        <p className="mt-1 text-[11px] text-wf-600">
          Mag leeg voor een Concept. EAN/GTIN is verplicht vóór indienen ter
          controle, goedkeuring, publicatie en verkoop.
        </p>
      </div>
      <div className="mb-3.5 max-w-xl">
        <label className="mb-1.5 block text-xs font-semibold text-wf-700">
          {t("sellerProductNewMainImage", locale)}
        </label>
        <div className="flex flex-wrap items-center gap-2.5 rounded-wf border border-dashed border-wf-400 px-3 py-2.5">
          <span className="text-xs text-wf-600">
            {fileName ?? t("sellerProductNewNoFile", locale)}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              setPendingFile(file)
              setFileName(file?.name ?? null)
            }}
          />
          <button
            type="button"
            className="rounded-wf border border-wf-500 bg-white px-3 py-1.5 text-xs font-semibold text-wf-800"
            onClick={() => fileRef.current?.click()}
          >
            {t("commonUpload", locale)}
          </button>
        </div>
      </div>

      <Notice variant="warning" className="mb-4 max-w-xl">
        {t("sellerProductNewPublishNotice", locale)}
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
          {t("commonCancel", locale)}
        </Button>
        <Button type="button" disabled={busy} onClick={() => void onSubmit()}>
          {busy
            ? t("commonBusy", locale)
            : t("sellerProductNewCreate", locale)}
        </Button>
      </div>
    </SellerGate>
  )
}
