"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import {
  BrandApiError,
  deactivateSellerBrandFacility,
  getSellerBrand,
  patchSellerBrand,
  upsertSellerBrandFacility,
} from "../../_lib/brands-api"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t } from "../../../_lib/i18n/messages"

type FacilityRow = {
  id: string
  name: string
  street?: string | null
  house_number?: string | null
  postal_code?: string | null
  city?: string | null
  country_code?: string | null
  is_active?: boolean
}

type BrandProduct = {
  id: string
  title: string | null
  ean: string | null
  sku: string | null
  identifier_value: string | null
  category: string | null
  status: string
  image_url: string | null
}

type Access = {
  can_edit_description: boolean
  can_edit_facilities: boolean
}

/**
 * Seller merkdetail — merkbeschrijving, facilities, producten van dit merk.
 */
export default function SellerBrandDetailPage() {
  const locale = useStorefrontLocale()
  const params = useParams<{ id: string }>()
  const id = decodeURIComponent(params.id || "")
  const [brandName, setBrandName] = useState(id)
  const [intro, setIntro] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [facilities, setFacilities] = useState<FacilityRow[]>([])
  const [products, setProducts] = useState<BrandProduct[]>([])
  const [access, setAccess] = useState<Access>({
    can_edit_description: false,
    can_edit_facilities: false,
  })
  const [newName, setNewName] = useState("")
  const [newStreet, setNewStreet] = useState("")
  const [newHouse, setNewHouse] = useState("")
  const [newPostal, setNewPostal] = useState("")
  const [newCity, setNewCity] = useState("")
  const [newCountry, setNewCountry] = useState("NL")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const canEditDescription = access.can_edit_description
  const canEditFacilities = access.can_edit_facilities
  const canManageProducts = true

  async function reload() {
    const detail = await getSellerBrand(id)
    const brand = detail.brand as { name?: string; intro?: string | null }
    if (brand.name) setBrandName(brand.name)
    setIntro(brand.intro || "")
    setAccess({
      can_edit_description: Boolean(
        detail.access.can_edit_description ?? detail.access.can_edit_central
      ),
      can_edit_facilities: Boolean(detail.access.can_edit_facilities),
    })
    setFacilities(
      (detail.facilities || []).map((f) => {
        const row = f as FacilityRow
        return {
          id: row.id,
          name: row.name,
          street: row.street ?? null,
          house_number: row.house_number ?? null,
          postal_code: row.postal_code ?? null,
          city: row.city ?? null,
          country_code: row.country_code ?? "NL",
          is_active: row.is_active !== false,
        }
      })
    )
    setProducts(detail.products || [])
  }

  useEffect(() => {
    void (async () => {
      try {
        await reload()
      } catch (err) {
        setError(
          err instanceof BrandApiError ? err.message : t("brandLoadFailed", locale)
        )
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function saveIntro() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await patchSellerBrand(id, { intro })
      await reload()
      setNotice(t("sellerBrandSaved", locale))
    } catch (err) {
      setError(err instanceof BrandApiError ? err.message : t("brandSaveFailed", locale))
    } finally {
      setBusy(false)
    }
  }

  async function saveFacility(existingId?: string) {
    if (!newCountry.trim()) {
      setError(t("brandCountryIsRequired", locale))
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await upsertSellerBrandFacility(id, {
        id: existingId,
        name: newName.trim() || null,
        country_code: newCountry,
        street: newStreet.trim() || null,
        house_number: newHouse.trim() || null,
        postal_code: newPostal.trim() || null,
        city: newCity.trim() || null,
      })
      setNewName("")
      setNewStreet("")
      setNewHouse("")
      setNewPostal("")
      setNewCity("")
      setEditingId(null)
      await reload()
      setNotice(
        existingId
          ? t("sellerFacilityUpdated", locale)
          : t("sellerFacilityAdded", locale)
      )
    } catch (err) {
      setError(
        err instanceof BrandApiError ? err.message : t("brandFacilityUpdateFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  function startEdit(row: FacilityRow) {
    setEditingId(row.id)
    setNewName(row.name)
    setNewStreet(row.street || "")
    setNewHouse(row.house_number || "")
    setNewPostal(row.postal_code || "")
    setNewCity(row.city || "")
    setNewCountry((row.country_code || "NL").toUpperCase())
  }

  async function deactivateFacility(facilityId: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await deactivateSellerBrandFacility(id, facilityId)
      await reload()
      setNotice(t("sellerFacilityDeactivated", locale))
    } catch (err) {
      setError(
        err instanceof BrandApiError
          ? err.message
          : t("brandFacilityDeactivateError", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavBrands", locale), href: "/seller/brands" },
        { label: brandName },
      ]}
    >
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.04em] text-wf-500">
            Merk: {brandName}
          </p>
          <h1 className="text-xl font-bold text-wf-900">{brandName}</h1>
          <p className="mt-1 text-[11px] text-wf-600">
            Merknaam kan alleen door een bevoegde merkeigenaar of EuropMade
            worden gewijzigd.
          </p>
        </div>
        {error ? <Notice variant="warning">{error}</Notice> : null}
        {notice ? <Notice variant="info">{notice}</Notice> : null}

        <section className="rounded border border-wf-300 bg-white p-3">
          <Input
            label={t("sellerBrandDescriptionLabel", locale)}
            hint={t("sellerBrandDescriptionHint", locale)}
            value={intro}
            disabled={!canEditDescription || busy}
            onChange={(e) => setIntro(e.target.value)}
          />
          {canEditDescription ? (
            <Button
              type="button"
              className="mt-2"
              size="sm"
              disabled={busy}
              onClick={() => void saveIntro()}
            >
              {t("commonSave", locale)}
            </Button>
          ) : (
            <p className="text-[11px] text-wf-500">
              {t("sellerBrandDescriptionReadonly", locale)}
            </p>
          )}
        </section>

        <section className="rounded border border-wf-300 bg-white p-3">
          <h2 className="text-xs font-bold text-wf-900">
            {t("brandFacilitiesHeading", locale)}
          </h2>
          <ul className="mt-2 space-y-2 text-xs">
            {facilities.map((f) => (
              <li
                key={f.id}
                className="rounded border border-wf-200 px-2 py-1.5"
              >
                <p className="font-semibold text-wf-900">
                  {f.name || t("pdpProductionLocation", locale)}
                  {f.is_active === false ? ` ${t("brandFacilityInactive", locale)}` : ""}
                </p>
                <p className="text-wf-600">{t("brandFacilityCountry", locale)}{(f.country_code || "—").toUpperCase()}</p>
                <p className="text-wf-600">{t("brandFacilityCity", locale)}{f.city || "—"}</p>
                {detailsId === f.id ? (
                  <div className="mt-1 rounded border border-wf-200 bg-wf-50 p-2 text-[11px] text-wf-700">
                    <p>{t("brandFacilityBrand", locale)}{brandName}</p>
                    <p>
                      {t("brandFacilityAddress", locale)}
                      {[f.street, f.house_number, f.postal_code, f.city]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </p>
                    <p>{t("brandFacilityCountry", locale)}{(f.country_code || "—").toUpperCase()}</p>
                  </div>
                ) : null}
                <p className="mt-1 text-[10px] text-wf-500">
                  {t("brandCountryOnlyRequiredLong", locale)}
                </p>
                {canEditFacilities ? (
                  <div className="mt-1 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setDetailsId((prev) => (prev === f.id ? null : f.id))
                      }
                    >
                      {t("brandViewDetails", locale)}
                    </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => startEdit(f)}
                      >
                      {t("commonEdit", locale)}
                    </Button>
                    {f.is_active !== false ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void deactivateFacility(f.id)}
                      >
                        {t("brandDeactivate", locale)}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
            {facilities.length === 0 ? (
              <li className="text-wf-500">{t("brandNoFacilities", locale)}</li>
            ) : null}
          </ul>
          {canEditFacilities ? (
            <div className="mt-3 grid gap-2 tablet:grid-cols-2">
              <Input
                label={t("brandFacilityNamePlaceholder", locale)}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                label={t("formStreet", locale)}
                value={newStreet}
                onChange={(e) => setNewStreet(e.target.value)}
              />
              <Input
                label={t("formHouseNumber", locale)}
                value={newHouse}
                onChange={(e) => setNewHouse(e.target.value)}
              />
              <Input
                label={t("formPostalCode", locale)}
                value={newPostal}
                onChange={(e) => setNewPostal(e.target.value)}
              />
              <Input
                label={t("formCity", locale)}
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
              />
              <Input
                label={t("brandCountryIsoLabel", locale)}
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value.toUpperCase())}
              />
              <div className="tablet:col-span-2">
                <p className="mb-2 text-[11px] text-wf-600">
                  {t("brandFacilityRealLocation", locale)}
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void saveFacility(editingId || undefined)}
                >
                  {editingId
                    ? t("brandFacilityUpdate", locale)
                    : t("brandFacilityAdd", locale)}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-wf-500">
              {t("brandNoEditRights", locale)}
            </p>
          )}
        </section>

        <section className="rounded border border-wf-300 bg-white p-3">
          <h2 className="text-xs font-bold text-wf-900">
            {t("sellerBrandProductsHeading", locale)}
          </h2>
          {products.length === 0 ? (
            <p className="mt-2 text-xs text-wf-500">
              {t("sellerBrandProductsEmpty", locale)}
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {products.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded border border-wf-200 px-2 py-2"
                >
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt=""
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-wf-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-wf-900">
                      {p.title || p.id}
                    </p>
                    <p className="text-[11px] text-wf-500">
                      EAN {p.ean || p.identifier_value || "—"} · SKU{" "}
                      {p.sku || "—"} · {p.category || "—"} · {p.status}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Link href={`/seller/products/${encodeURIComponent(p.id)}`}>
                      <Button type="button" size="sm" variant="secondary">
                        {t("sellerBrandProductView", locale)}
                      </Button>
                    </Link>
                    {canManageProducts ? (
                      <Link
                        href={`/seller/products/${encodeURIComponent(p.id)}?tab=information`}
                      >
                        <Button type="button" size="sm">
                          {t("sellerBrandProductEdit", locale)}
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link href="/seller/brands" className="text-xs font-semibold underline">
          {t("sellerBrandBack", locale)}
        </Link>
      </div>
    </SellerGate>
  )
}
