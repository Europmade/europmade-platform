"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Input, Notice } from "@europmade/ui"
import {
  normalizeCategoryAssignment,
  sellerChildCategoryOptions,
  sellerL3CategoryOptions,
  sellerParentCategoryOptions,
} from "@europmade/utils"
import { SellerGate } from "../../_components/seller-gate"
import {
  createProduct,
  listProductCloudCategories,
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
import { t } from "../../../_lib/i18n/messages"

type PcCategory = {
  id: string
  name: string
  slug: string | null
  parent_category_id: string | null
}

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
  const [pcCategories, setPcCategories] = useState<PcCategory[]>([])
  const [parentId, setParentId] = useState("")
  const [childId, setChildId] = useState("")
  const [l3Id, setL3Id] = useState("")
  const [identifier, setIdentifier] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void listSellerBrands()
      .then((res) => setBrands(res.brands || []))
      .catch(() => setBrands([]))
    void listProductCloudCategories()
      .then((res) => setPcCategories(res.categories || []))
      .catch(() => setPcCategories([]))
  }, [])

  const treeRows = pcCategories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parent_id: c.parent_category_id,
  }))
  const selectedCategoryIds = [parentId, childId, l3Id]
  const parents = sellerParentCategoryOptions(treeRows, selectedCategoryIds)
  const children = sellerChildCategoryOptions(
    treeRows,
    parentId,
    selectedCategoryIds
  )
  const l3Options = sellerL3CategoryOptions(
    treeRows,
    childId,
    selectedCategoryIds
  )

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
    const normalized = normalizeCategoryAssignment(treeRows, {
      parentId,
      childId,
      l3Id,
    })
    if (!normalized.ok) {
      setError(normalized.message)
      return
    }
    const parentName =
      pcCategories.find((c) => c.id === normalized.parentId)?.name || "Algemeen"

    setBusy(true)
    setError(null)
    try {
      const base = {
        brand_id: trimmedBrand,
        manufacturer_id: trimmedBrand,
        title: trimmedTitle,
        description: trimmedTitle,
        category_name: parentName,
        category_ids: normalized.categoryIds,
        create_as_retailer: true as const,
      }
      const result = trimmedId
        ? await createProduct({
            ...base,
            ...resolveIdentifier(trimmedId),
          })
        : await createProduct(base)

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
      <div className="mb-3.5 grid max-w-xl gap-3 tablet:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-wf-700">
            Niveau 1
          </label>
          <select
            className="w-full rounded-wf border border-wf-400 bg-white px-3 py-2 text-sm text-wf-800"
            value={parentId}
            onChange={(e) => {
              setParentId(e.target.value)
              setChildId("")
              setL3Id("")
            }}
          >
            <option value="">{t("sellerProductNewChooseCategory", locale)}</option>
            {parents.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-wf-700">
            Niveau 2
          </label>
          <select
            className="w-full rounded-wf border border-wf-400 bg-white px-3 py-2 text-sm text-wf-800 disabled:bg-wf-50"
            value={childId}
            disabled={!parentId || children.length === 0}
            onChange={(e) => {
              setChildId(e.target.value)
              setL3Id("")
            }}
          >
            <option value="">— kies —</option>
            {children.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-wf-700">
            Niveau 3
          </label>
          <select
            className="w-full rounded-wf border border-wf-400 bg-white px-3 py-2 text-sm text-wf-800 disabled:bg-wf-50"
            value={l3Id}
            disabled={!childId || l3Options.length === 0}
            onChange={(e) => setL3Id(e.target.value)}
          >
            <option value="">— kies —</option>
            {l3Options.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
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
