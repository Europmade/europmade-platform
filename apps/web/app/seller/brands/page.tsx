"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button, Notice } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import {
  BrandApiError,
  createSellerBrand,
  deactivateSellerBrandFacility,
  getSellerBrand,
  listSellerBrandFacilityProducts,
  listSellerBrands,
  patchSellerBrand,
  type ManageableBrand,
  upsertSellerBrandFacility,
} from "../_lib/brands-api"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t } from "../../_lib/i18n/messages"

type Facility = {
  id: string
  name: string
  street?: string | null
  house_number?: string | null
  postal_code?: string | null
  city?: string | null
  country_code?: string
  is_active?: boolean
}

function facilityLabel(facility: {
  name?: string | null
  country_code?: string | null
  is_active?: boolean
}, locale: import("../../_lib/i18n/locales").StorefrontLocale = "nl") {
  const country = (facility.country_code || "").toUpperCase()
  const name = (facility.name || "").trim()
  const plLabel = t("pdpProductionLocation", locale)
  const label = name || (country ? `${plLabel} — ${country}` : plLabel)
  return facility.is_active === false ? `${label} (${t("pdpDeactivated", locale)})` : label
}

function emptyFacilityDraft() {
  return {
    name: "",
    street: "",
    house_number: "",
    postal_code: "",
    city: "",
    country_code: "NL",
  }
}

type ProductRow = {
  id: string
  title: string | null
  ean?: string | null
  sku?: string | null
  brand_name?: string | null
  status?: string | null
}

function FacilityForm({
  draft,
  busy,
  locale,
  onChange,
  onSave,
  onCancel,
}: {
  locale: import("../../_lib/i18n/locales").StorefrontLocale
  draft: {
    name: string
    street: string
    house_number: string
    postal_code: string
    city: string
    country_code: string
  }
  busy: boolean
  onChange: (next: {
    name: string
    street: string
    house_number: string
    postal_code: string
    city: string
    country_code: string
  }) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="mt-2 space-y-2 rounded border border-wf-200 p-2">
      <input
        className="h-9 w-full rounded border border-wf-300 px-2 text-xs"
        value={draft.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        placeholder={t("brandFacilityNamePlaceholder", locale)}
      />
      <input
        className="h-9 w-full rounded border border-wf-300 px-2 text-xs"
        value={draft.street}
        onChange={(e) => onChange({ ...draft, street: e.target.value })}
        placeholder={t("formStreet", locale)}
      />
      <input
        className="h-9 w-full rounded border border-wf-300 px-2 text-xs"
        value={draft.house_number}
        onChange={(e) => onChange({ ...draft, house_number: e.target.value })}
        placeholder={t("formHouseNumber", locale)}
      />
      <input
        className="h-9 w-full rounded border border-wf-300 px-2 text-xs"
        value={draft.postal_code}
        onChange={(e) => onChange({ ...draft, postal_code: e.target.value })}
        placeholder={t("formPostalCode", locale)}
      />
      <input
        className="h-9 w-full rounded border border-wf-300 px-2 text-xs"
        value={draft.city}
        onChange={(e) => onChange({ ...draft, city: e.target.value })}
        placeholder={t("formCity", locale)}
      />
      <input
        className="h-9 w-full rounded border border-wf-300 px-2 text-xs uppercase"
        value={draft.country_code}
        maxLength={2}
        onChange={(e) =>
          onChange({ ...draft, country_code: e.target.value.toUpperCase() })
        }
        placeholder={t("brandCountryRequired", locale)}
      />
      <p className="text-[11px] text-wf-600">
        {t("brandCountryOnlyRequired", locale)}
      </p>
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={onSave}>
          {t("commonSave", locale)}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
          {t("commonCancel", locale)}
        </Button>
      </div>
    </div>
  )
}

export default function SellerBrandsPage() {
  const locale = useStorefrontLocale()
  const [brands, setBrands] = useState<ManageableBrand[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>("")
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("")
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showCreateBrand, setShowCreateBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [brandDetailsOpen, setBrandDetailsOpen] = useState<string | null>(null)
  const [brandEditId, setBrandEditId] = useState<string | null>(null)
  const [brandEditName, setBrandEditName] = useState("")
  const [showCreateFacility, setShowCreateFacility] = useState(false)
  const [facilityEditId, setFacilityEditId] = useState<string | null>(null)
  const [facilityDetailsId, setFacilityDetailsId] = useState<string | null>(null)
  const [facilityDraft, setFacilityDraft] = useState({
    name: "",
    street: "",
    house_number: "",
    postal_code: "",
    city: "",
    country_code: "NL",
  })

  const selectedBrand = useMemo(
    () => brands.find((brand) => brand.id === selectedBrandId) ?? null,
    [brands, selectedBrandId]
  )
  const selectedFacility = useMemo(
    () => facilities.find((facility) => facility.id === selectedFacilityId) ?? null,
    [facilities, selectedFacilityId]
  )

  async function loadBrands() {
    const res = await listSellerBrands()
    setBrands(res.brands)
    if (!selectedBrandId && res.brands[0]?.id) {
      setSelectedBrandId(res.brands[0].id)
    }
  }

  async function loadBrandDetails(brandId: string, keepFacilityId?: string) {
    const detail = await getSellerBrand(brandId)
    const nextFacilities = (detail.facilities ?? []) as Facility[]
    setFacilities(nextFacilities)
    const keep =
      keepFacilityId && nextFacilities.some((row) => row.id === keepFacilityId)
        ? keepFacilityId
        : ""
    setSelectedFacilityId(keep)
    if (!keep) setProducts([])
    return detail.brand
  }

  async function loadFacilityProducts(brandId: string, facilityId: string) {
    const res = await listSellerBrandFacilityProducts(brandId, facilityId)
    setProducts(
      res.products.map((row) => ({
        id: row.id,
        title: row.title,
        ean: row.ean,
        sku: row.sku,
        brand_name: row.brand_name,
        status: row.status,
      }))
    )
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await loadBrands()
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof BrandApiError
              ? err.message
              : t("sellerBrandsEmpty", locale)
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [locale])

  useEffect(() => {
    if (!selectedBrandId) return
    void loadBrandDetails(selectedBrandId).catch((err) => {
      setError(err instanceof Error ? err.message : t("brandDetailLoadFailed", locale))
    })
  }, [selectedBrandId])

  useEffect(() => {
    if (!selectedBrandId || !selectedFacilityId) return
    void loadFacilityProducts(selectedBrandId, selectedFacilityId).catch((err) => {
      setError(err instanceof Error ? err.message : t("brandProductsLoadFailed", locale))
    })
  }, [selectedBrandId, selectedFacilityId])

  async function handleCreateBrand() {
    if (!newBrandName.trim()) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = await createSellerBrand({
        name: newBrandName.trim(),
      })
      const createdId = res.brand?.id
      if (!createdId) {
        throw new BrandApiError(t("brandCreateFailed", locale))
      }
      await loadBrands()
      const listed = await listSellerBrands()
      const persisted = (listed.brands || []).some((row) => row.id === createdId)
      if (!persisted) {
        throw new BrandApiError(t("brandCreateFailed", locale))
      }
      setNotice(t("brandCreated", locale))
      setShowCreateBrand(false)
      setNewBrandName("")
      setSelectedBrandId(createdId)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("brandCreateFailed", locale))
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveBrand() {
    if (!brandEditId) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await patchSellerBrand(brandEditId, {
        name: brandEditName.trim(),
      })
      setNotice(t("brandSaved", locale))
      setBrandEditId(null)
      await loadBrands()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("brandSaveFailed", locale))
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveFacility() {
    if (!selectedBrandId || !facilityDraft.country_code.trim()) return
    setBusy(true)
    setError(null)
    try {
      await upsertSellerBrandFacility(selectedBrandId, {
        id: facilityEditId ?? undefined,
        name: facilityDraft.name.trim() || null,
        street: facilityDraft.street.trim() || null,
        house_number: facilityDraft.house_number.trim() || null,
        postal_code: facilityDraft.postal_code.trim() || null,
        city: facilityDraft.city.trim() || null,
        country_code: facilityDraft.country_code.trim().toUpperCase(),
      })
      setNotice(t("brandFacilitySaved", locale))
      setShowCreateFacility(false)
      setFacilityEditId(null)
      setFacilityDraft(emptyFacilityDraft())
      await loadBrandDetails(selectedBrandId, facilityEditId ?? undefined)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("brandFacilitySaveFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleDeactivateFacility(facilityId: string) {
    if (!selectedBrandId) return
    const ok = window.confirm(
      t("brandFacilityDeactivateConfirm", locale)
    )
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await deactivateSellerBrandFacility(selectedBrandId, facilityId)
      setNotice(t("brandFacilityDeactivated", locale))
      await loadBrandDetails(selectedBrandId, facilityId)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("brandFacilityDeactivateFailed", locale))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavBrands", locale) },
      ]}
    >
      <div className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="text-xl font-bold text-wf-900">{t("sellerBrandsTitle", locale)}</h1>
        <p className="mt-1 text-xs text-wf-600">
          {t("sellerBrandsIntro", locale)}
        </p>
        {notice ? <Notice className="mt-3">{notice}</Notice> : null}
        {error ? (
          <Notice variant="warning" className="mt-3">
            {error}
          </Notice>
        ) : null}
        {loading ? <p className="mt-4 text-sm text-wf-600">…</p> : null}

        <div className="mt-4 grid gap-3 desktop:grid-cols-3">
          <section className="rounded-lg border border-wf-200 bg-white p-3">
            <h2 className="text-sm font-bold text-wf-900">Merken</h2>
            <div className="mt-2 space-y-2">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className={`rounded border p-2 ${
                    selectedBrandId === brand.id ? "border-wf-700" : "border-wf-200"
                  }`}
                >
                  <button
                    type="button"
                    className="w-full text-left font-semibold text-wf-900"
                    onClick={() => setSelectedBrandId(brand.id)}
                  >
                    {brand.name}
                  </button>
                  <div className="mt-1 flex flex-wrap gap-3 text-[11px]">
                    <button
                      type="button"
                      className="underline"
                      onClick={() =>
                        setBrandDetailsOpen((cur) => (cur === brand.id ? null : brand.id))
                      }
                    >
                      Details bekijken
                    </button>
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        setBrandEditId(brand.id)
                        setBrandEditName(brand.name)
                      }}
                    >
                      Bewerken
                    </button>
                  </div>
                  {brandDetailsOpen === brand.id ? (
                    <p className="mt-2 text-[11px] text-wf-700">
                      Slug: {brand.slug || "—"}
                    </p>
                  ) : null}
                  {brandEditId === brand.id ? (
                    <div className="mt-2 space-y-2">
                      <input
                        className="h-9 w-full rounded border border-wf-300 px-2 text-xs"
                        value={brandEditName}
                        onChange={(e) => setBrandEditName(e.target.value)}
                        placeholder={t("brandNamePlaceholder", locale)}
                      />
                      <p className="text-[11px] text-wf-500">
                        Slug: {brand.slug || "—"}
                      </p>
                      <Link
                        href={`/seller/marketing/brand-pages/${encodeURIComponent(brand.id)}`}
                        className="inline-block text-[11px] font-semibold underline"
                      >
                        Merkpagina beheren
                      </Link>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={busy} onClick={() => void handleSaveBrand()}>
                          Opslaan
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setBrandEditId(null)}
                        >
                          Annuleren
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-3">
              <button
                type="button"
                className="text-xs font-semibold underline"
                onClick={() => setShowCreateBrand((v) => !v)}
              >
                + Merk toevoegen
              </button>
              {showCreateBrand ? (
                <div className="mt-2 space-y-2 rounded border border-wf-200 p-2">
                  <input
                    className="h-9 w-full rounded border border-wf-300 px-2 text-xs"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    placeholder={t("brandNamePlaceholder", locale)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy} onClick={() => void handleCreateBrand()}>
                      Opslaan
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowCreateBrand(false)}
                    >
                      Annuleren
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-lg border border-wf-200 bg-white p-3">
            <h2 className="text-sm font-bold text-wf-900">Productielocaties</h2>
            <p className="mt-1 text-[11px] text-wf-600">
              Productielocaties van {selectedBrand?.name || "—"}
            </p>
            <p className="mt-1 text-[11px] text-wf-500">
              Productielocatie = de daadwerkelijke locatie waar het product wordt
              geproduceerd of geassembleerd.
            </p>
            <div className="mt-2 space-y-2">
              {facilities.map((facility) => (
                <div
                  key={facility.id}
                  className={`rounded border p-2 ${
                    selectedFacilityId === facility.id
                      ? "border-wf-700"
                      : "border-wf-200"
                  }`}
                >
                  <button
                    type="button"
                    className="w-full text-left font-semibold text-wf-900"
                    onClick={() => setSelectedFacilityId(facility.id)}
                  >
                    {facilityLabel(facility, locale)}
                  </button>
                  <p className="text-[11px] text-wf-600">
                    Land: {(facility.country_code || "").toUpperCase() || "—"}
                    {facility.is_active === false ? " · Gedeactiveerd" : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-3 text-[11px]">
                    <button
                      type="button"
                      className="underline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFacilityDetailsId((cur) =>
                          cur === facility.id ? null : facility.id
                        )
                      }}
                    >
                      Details bekijken
                    </button>
                    {facility.is_active !== false ? (
                      <>
                        <button
                          type="button"
                          className="underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowCreateFacility(false)
                            setFacilityEditId(facility.id)
                            setFacilityDraft({
                              name: facility.name || "",
                              street: facility.street || "",
                              house_number: facility.house_number || "",
                              postal_code: facility.postal_code || "",
                              city: facility.city || "",
                              country_code: (facility.country_code || "NL").toUpperCase(),
                            })
                          }}
                        >
                          Bewerken
                        </button>
                        <button
                          type="button"
                          className="underline text-red-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleDeactivateFacility(facility.id)
                          }}
                        >
                          Deactiveren
                        </button>
                      </>
                    ) : null}
                  </div>
                  {facilityDetailsId === facility.id ? (
                    <p className="mt-2 text-[11px] text-wf-700">
                      Merk: {selectedBrand?.name || "—"}
                      <br />
                      {[
                        [facility.street, facility.house_number].filter(Boolean).join(" "),
                        [facility.postal_code, facility.city].filter(Boolean).join(" "),
                        (facility.country_code || "").toUpperCase(),
                      ]
                        .filter(Boolean)
                        .join(", ") || t("brandNoAddress", locale)}
                    </p>
                  ) : null}
                  {facilityEditId === facility.id ? (
                    <FacilityForm
                      draft={facilityDraft}
                      busy={busy}
                      locale={locale}
                      onChange={setFacilityDraft}
                      onSave={() => void handleSaveFacility()}
                      onCancel={() => setFacilityEditId(null)}
                    />
                  ) : null}
                </div>
              ))}
            </div>
            {selectedBrand ? (
              <div className="mt-3">
                <button
                  type="button"
                  className="text-xs font-semibold underline"
                  onClick={() => {
                    setFacilityEditId(null)
                    setFacilityDraft(emptyFacilityDraft())
                    setShowCreateFacility((v) => !v)
                  }}
                >
                  + Productielocatie toevoegen
                </button>
                {showCreateFacility ? (
                  <FacilityForm
                    draft={facilityDraft}
                    busy={busy}
                    locale={locale}
                    onChange={setFacilityDraft}
                    onSave={() => void handleSaveFacility()}
                    onCancel={() => setShowCreateFacility(false)}
                  />
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-wf-200 bg-white p-3">
            <h2 className="text-sm font-bold text-wf-900">Producten</h2>
            <p className="mt-1 text-[11px] text-wf-600">
              {t("brandProductsOf", locale)} {selectedFacility ? facilityLabel(selectedFacility, locale) : "—"}
            </p>
            <div className="mt-2 space-y-2">
              {products.map((product) => (
                <div key={product.id} className="rounded border border-wf-200 p-2">
                  <p className="font-semibold text-wf-900">
                    {product.title || t("pdpUntitledProduct", locale)}
                  </p>
                  <p className="mt-1 text-[11px] text-wf-600">
                    EAN: {product.ean || "—"} · SKU: {product.sku || "—"} · Merk:{" "}
                    {product.brand_name || selectedBrand?.name || "—"} · {t("brandStatusPrefix", locale)}
                    {product.status || "—"}
                  </p>
                  <p className="mt-1 text-[11px]">
                    <a
                      href={`/seller/products/${product.id}`}
                      className="underline underline-offset-2"
                    >
                      Details bekijken
                    </a>
                    {" · "}
                    <a
                      href={`/seller/products/${product.id}?tab=information`}
                      className="underline underline-offset-2"
                    >
                      Bewerken
                    </a>
                  </p>
                </div>
              ))}
              {selectedFacilityId && products.length === 0 ? (
                <p className="text-xs text-wf-600">Geen producten voor deze productielocatie.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </SellerGate>
  )
}
