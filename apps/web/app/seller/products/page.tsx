"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Input, Notice } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { EmptyState } from "../_components/empty-state"
import { formatEuro } from "../../_components/storefront-shell"
import {
  bulkLinkBrandLocation,
  bulkUpdateProductInformation,
  bulkAssignShippingProfile,
  listOwnProducts,
  ProductCloudApiError,
  type CatalogProduct,
} from "../_lib/product-cloud-api"
import { ProductLinkDialog } from "./_components/product-link-dialog"
import {
  applyVisibleSelection,
  canOpenProductLinkDialog,
  showProductLinkBulkAction,
  toggleSelectedId,
} from "../_lib/product-link-proposal"
import { resolveSellerMediaUrl } from "../_lib/media-url"
import { patchOffer, CommerceCloudApiError } from "../_lib/commerce-cloud-api"
import {
  listShippingProfiles,
  type SellerShippingProfile,
} from "../_lib/commerce-cloud-api"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { t } from "../../_lib/i18n/messages"
import { statusLabel } from "../../_lib/i18n/status-labels"
import { gpsrHint } from "../_lib/gpsr-hints"
import { listSellerBrands, listSellerFacilities } from "../_lib/brands-api"
import {
  canEditCatalogInformation,
  canProposeCatalogChange,
  isSellerCatalogOwner,
  sellerCatalogInformationHref,
  sellerCatalogTabHref,
  sellerOfferHref,
  sellerProductHref,
} from "../_lib/seller-list-actions"

type ListFilter =
  | "all"
  | "for_sale"
  | "paused"
  | "no_stock"
  | "incomplete"
  | "sufficient"
  | "complete"
  | "published"
  | "unpublished"
  | "pending_approval"

type ListSort = "newest" | "title" | "stock" | "price"

type BulkAction = "" | "eu_compliance" | "brand_location" | "shipping_profile"

const EU_COMPLIANCE_FIELDS = [
  { code: "gpsr_manufacturer_name", labelKey: "plManufacturerName" as const },
  { code: "gpsr_manufacturer_address", labelKey: "plManufacturerAddress" as const },
  { code: "gpsr_manufacturer_postal_city", labelKey: "plManufacturerPostal" as const },
  { code: "gpsr_manufacturer_country", labelKey: "plManufacturerCountry" as const },
  { code: "gpsr_manufacturer_email", labelKey: "plManufacturerEmail" as const },
  { code: "gpsr_eu_responsible_name", labelKey: "plEuResponsibleName" as const },
  { code: "gpsr_eu_responsible_address", labelKey: "plEuResponsibleAddress" as const },
  { code: "gpsr_eu_responsible_postal_city", labelKey: "plEuResponsiblePostal" as const },
  { code: "gpsr_eu_responsible_country", labelKey: "plEuResponsibleCountry" as const },
  { code: "gpsr_eu_responsible_contact", labelKey: "plEuResponsibleContact" as const },
] as const

type EuComplianceForm = Record<
  (typeof EU_COMPLIANCE_FIELDS)[number]["code"],
  string
>

function emptyEuForm(): EuComplianceForm {
  return {
    gpsr_manufacturer_name: "",
    gpsr_manufacturer_address: "",
    gpsr_manufacturer_postal_city: "",
    gpsr_manufacturer_country: "",
    gpsr_manufacturer_email: "",
    gpsr_eu_responsible_name: "",
    gpsr_eu_responsible_address: "",
    gpsr_eu_responsible_postal_city: "",
    gpsr_eu_responsible_country: "",
    gpsr_eu_responsible_contact: "",
  }
}

function qualityLabel(q: CatalogProduct["completeness"], locale: StorefrontLocale = "nl") {
  const level = q?.information_quality
  if (level === "complete")
    return { label: t("qualityComplete", locale), className: "text-emerald-700", pct: q?.percent }
  if (level === "sufficient")
    return { label: t("qualitySufficient", locale), className: "text-wf-800", pct: q?.percent }
  if (level === "insufficient")
    return { label: t("qualityInsufficient", locale), className: "text-amber-700 font-semibold", pct: q?.percent }
  const pct = q?.percent ?? 0
  if (pct >= 100) return { label: t("qualityComplete", locale), className: "text-emerald-700", pct }
  if (q?.publishable) return { label: t("qualitySufficient", locale), className: "text-wf-800", pct }
  return { label: t("qualityInsufficient", locale), className: "text-amber-700 font-semibold", pct }
}

import {
  complianceReviewLabel,
  salePresentationLabel,
  publicationGateLabel,
} from "../_lib/product-status-labels"

function CopyButton({ value }: { value: string }) {
  const locale = useStorefrontLocale()
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      title={t("plCopy", locale)}
      className="ml-1 rounded px-1 text-[10px] text-wf-500 hover:bg-wf-100 hover:text-wf-800"
      onClick={async (e) => {
        e.preventDefault()
        e.stopPropagation()
        try {
          await navigator.clipboard.writeText(value)
          setDone(true)
          setTimeout(() => setDone(false), 1200)
        } catch {
          /* ignore */
        }
      }}
    >
      {done ? "✓" : "⧉"}
    </button>
  )
}

/**
 * Seller Product Manager list — P1B (real Product Cloud + Commerce Cloud).
 * stock_total = som van quantity_available over seller offers op dit product.
 */
export default function SellerProductsPage() {
  const locale = useStorefrontLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialFilter = (searchParams.get("filter") || "all") as ListFilter
  const [rows, setRows] = useState<CatalogProduct[] | "loading">("loading")
  const [totalUnfiltered, setTotalUnfiltered] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [debouncedQ, setDebouncedQ] = useState("")
  const [filter, setFilter] = useState<ListFilter>(
    [
      "all",
      "for_sale",
      "paused",
      "no_stock",
      "incomplete",
      "sufficient",
      "complete",
      "published",
      "unpublished",
      "pending_approval",
    ].includes(initialFilter)
      ? initialFilter
      : "all"
  )
  const [sort, setSort] = useState<ListSort>("newest")
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [selection, setSelection] = useState<Set<string>>(() => new Set())
  const [bulkAction, setBulkAction] = useState<BulkAction>("")
  const [bulkBrandId, setBulkBrandId] = useState("")
  const [bulkFacilityId, setBulkFacilityId] = useState("")
  const [brandOptions, setBrandOptions] = useState<Array<{ id: string; name: string }>>([])
  const [facilityOptions, setFacilityOptions] = useState<
    Array<{ id: string; name: string; brand_id: string }>
  >([])
  const [euPanelOpen, setEuPanelOpen] = useState(false)
  const [brandPanelOpen, setBrandPanelOpen] = useState(false)
  const [shippingPanelOpen, setShippingPanelOpen] = useState(false)
  const [shippingProfiles, setShippingProfiles] = useState<SellerShippingProfile[]>([])
  const [bulkShippingProfileId, setBulkShippingProfileId] = useState("")
  const [euForm, setEuForm] = useState<EuComplianceForm>(() => emptyEuForm())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQ(query), 280)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const load = useCallback(() => {
    setError(null)
    listOwnProducts({
      q: debouncedQ || undefined,
      filter: filter === "all" ? undefined : filter,
      sort,
    })
      .then((res) => {
        setRows(res.products)
        setTotalUnfiltered(res.total_unfiltered ?? res.count)
      })
      .catch((err: unknown) => {
        setRows([])
        setTotalUnfiltered(0)
        setError(
          err instanceof ProductCloudApiError
            ? err.message
            : t("plLoadFailed", locale)
        )
      })
  }, [debouncedQ, filter, sort])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    void (async () => {
      try {
        const [brandsRes, facRes] = await Promise.all([
          listSellerBrands(),
          listSellerFacilities(),
        ])
        setBrandOptions(brandsRes.brands.map((b) => ({ id: b.id, name: b.name })))
        setFacilityOptions(
          facRes.facilities
            .filter((f) => f.is_active !== false)
            .map((f) => ({
              id: f.id,
              name: f.name,
              brand_id: f.brand_id,
            }))
        )
      } catch {
        // ignore; regular list stays functional
      }
    })()
  }, [])

  useEffect(() => {
    setSelection(new Set())
    setBulkAction("")
    setEuPanelOpen(false)
    setBrandPanelOpen(false)
  }, [debouncedQ, filter, sort])

  useEffect(() => {
    function onDocClick() {
      setOpenMenu(null)
    }
    if (openMenu) {
      document.addEventListener("click", onDocClick)
      return () => document.removeEventListener("click", onDocClick)
    }
  }, [openMenu])

  const pageIds = useMemo(
    () => (Array.isArray(rows) ? rows.map((p) => p.id) : []),
    [rows]
  )
  const selectedProducts = useMemo(() => {
    if (!Array.isArray(rows)) return []
    return rows.filter((p) => selection.has(p.id))
  }, [rows, selection])

  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selection.has(id))
  const somePageSelected =
    pageIds.some((id) => selection.has(id)) && !allPageSelected

  function toggleSelectAllPage() {
    setSelection((prev) =>
      applyVisibleSelection(prev, pageIds, !allPageSelected)
    )
  }

  function toggleRow(id: string) {
    setSelection((prev) => toggleSelectedId(prev, id))
  }

  function clearSelection() {
    setSelection(new Set())
    setBulkAction("")
    setEuPanelOpen(false)
    setBrandPanelOpen(false)
    setShippingPanelOpen(false)
    setEuForm(emptyEuForm())
    setBulkBrandId("")
    setBulkFacilityId("")
    setBulkShippingProfileId("")
    setLinkDialogOpen(false)
  }

  function openProductLinkDialog() {
    if (!canOpenProductLinkDialog(selection.size)) {
      setActionNotice("Selecteer minimaal 2 producten om te koppelen.")
      return
    }
    setActionNotice(null)
    setLinkDialogOpen(true)
  }

  function onBulkActionChange(value: string) {
    const next = value as BulkAction
    setBulkAction(next)
    if (next === "eu_compliance") {
      setEuForm(emptyEuForm())
      setEuPanelOpen(true)
      setBrandPanelOpen(false)
    } else if (next === "brand_location") {
      setEuPanelOpen(false)
      setBrandPanelOpen(true)
      setShippingPanelOpen(false)
    } else if (next === "shipping_profile") {
      setEuPanelOpen(false)
      setBrandPanelOpen(false)
      setShippingPanelOpen(true)
      void listShippingProfiles()
        .then((res) => setShippingProfiles(res.shipping_profiles))
        .catch(() => setShippingProfiles([]))
    } else {
      setEuPanelOpen(false)
      setBrandPanelOpen(false)
      setShippingPanelOpen(false)
    }
  }

  async function submitBulkShippingProfile() {
    if (!bulkShippingProfileId) {
      setActionNotice("Kies een verzendprofiel.")
      return
    }
    const count = selection.size
    const ok = window.confirm(
      `${count} geselecteerde product${count === 1 ? "" : "en"} koppelen aan dit verzendprofiel?`
    )
    if (!ok) return
    setBulkBusy(true)
    setActionNotice(null)
    try {
      const res = await bulkAssignShippingProfile({
        product_ids: Array.from(selection),
        shipping_profile_id: bulkShippingProfileId,
      })
      setActionNotice(res.message)
      clearSelection()
      load()
    } catch (err: unknown) {
      setActionNotice(
        err instanceof ProductCloudApiError
          ? err.message
          : "Bulk koppelen mislukt."
      )
    } finally {
      setBulkBusy(false)
    }
  }

  async function submitBulkBrandLocation() {
    if (!bulkBrandId || !bulkFacilityId) {
      setActionNotice(t("plChooseBrandFirst", locale))
      return
    }
    setBulkBusy(true)
    setActionNotice(null)
    try {
      const res = await bulkLinkBrandLocation({
        product_ids: Array.from(selection),
        brand_id: bulkBrandId,
        production_facility_id: bulkFacilityId,
      })
      setActionNotice(res.message)
      clearSelection()
      load()
    } catch (err: unknown) {
      setActionNotice(
        err instanceof ProductCloudApiError
          ? err.message
          : t("plBulkBrandFailed", locale)
      )
    } finally {
      setBulkBusy(false)
    }
  }

  async function submitEuCompliance() {
    const attributes = EU_COMPLIANCE_FIELDS.map((f) => ({
      code: f.code,
      value: euForm[f.code].trim(),
    })).filter((a) => a.value.length > 0)

    if (attributes.length === 0) {
      setActionNotice(t("plFillOneField", locale))
      return
    }

    const count = selection.size
    const ok = window.confirm(
      `EU Compliance bijwerken voor ${count} product${count === 1 ? "" : "en"}? Alleen ingevulde velden worden gezet.`
    )
    if (!ok) return

    setBulkBusy(true)
    setActionNotice(null)
    try {
      const res = await bulkUpdateProductInformation({
        product_ids: Array.from(selection),
        attributes,
        confirm: true,
      })
      const okCount = res.results.filter((r) => r.ok).length
      const failCount = res.results.length - okCount
      setActionNotice(
        `Bulk EU Compliance: ${okCount} geslaagd, ${failCount} mislukt.`
      )
      if (failCount === 0) {
        clearSelection()
      }
      load()
    } catch (err: unknown) {
      setActionNotice(
        err instanceof ProductCloudApiError
          ? err.message
          : t("plBulkEuFailed", locale)
      )
    } finally {
      setBulkBusy(false)
    }
  }

  async function pauseOrResume(
    p: CatalogProduct,
    next: "paused" | "active"
  ) {
    const offerId = p.offers?.primary_offer_id || p.offer?.offer_id
    if (!offerId) return
    if (next === "paused") {
      const ok = window.confirm(
        "Dit aanbod wordt niet meer actief verkocht. Wil je pauzeren?"
      )
      if (!ok) return
    }
    setActionBusy(p.id)
    setActionNotice(null)
    try {
      await patchOffer(offerId, { sales_status: next })
      setActionNotice(
        next === "paused" ? "Aanbod gepauzeerd." : "Aanbod hervat."
      )
      setOpenMenu(null)
      load()
    } catch (err: unknown) {
      setActionNotice(
        err instanceof CommerceCloudApiError
          ? err.message
          : t("plBulkActionFailed", locale)
      )
    } finally {
      setActionBusy(null)
    }
  }

  const brandDisplay = (p: CatalogProduct) => {
    if (p.brand_name) return p.brand_name
    if (p.brand_id && !p.brand_id.startsWith("brand_")) return p.brand_id
    return "—"
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavProducts", locale) },
      ]}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">
            {t("sellerNavProducts", locale)}
          </h1>
          <p className="mt-1 text-xs text-wf-600">
            Catalogusproducten en je eigen verkoopaanbiedingen.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/seller/products/add"
            className="inline-flex h-8 items-center rounded-[5px] bg-wf-900 px-3 text-xs font-semibold text-white"
          >
            Nieuw product
          </Link>
          <Link
            href="/seller/products/import"
            className="inline-flex h-8 items-center rounded-[5px] border border-wf-400 bg-white px-3 text-xs font-semibold text-wf-800"
          >
            Importeren
          </Link>
        </div>
      </div>

      {error ? (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      ) : null}
      {actionNotice ? (
        <Notice variant="info" className="mb-4">
          {actionNotice}
        </Notice>
      ) : null}

      <div className="mb-3 grid grid-cols-1 gap-2 tablet:grid-cols-[1fr_180px_160px]">
        <Input
          label={t("commonSearch", locale)}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("plSearchPlaceholder", locale)}
        />
        <div>
          <label
            htmlFor="pm-filter"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500"
          >
            Filter
          </label>
          <select
            id="pm-filter"
            className="h-9 w-full rounded-[5px] border border-wf-400 bg-white px-3 text-xs"
            value={filter}
            onChange={(e) => setFilter(e.target.value as ListFilter)}
          >
            <option value="all">Alle</option>
            <option value="for_sale">Te koop</option>
            <option value="paused">Gepauzeerd</option>
            <option value="no_stock">Geen voorraad</option>
            <option value="incomplete">Onvoldoende info</option>
            <option value="sufficient">Voldoende info</option>
            <option value="complete">Compleet</option>
            <option value="published">Gepubliceerd</option>
            <option value="unpublished">Niet gepubliceerd</option>
            <option value="pending_approval">Wacht op productgoedkeuring</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="pm-sort"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500"
          >
            Sortering
          </label>
          <select
            id="pm-sort"
            className="h-9 w-full rounded-[5px] border border-wf-400 bg-white px-3 text-xs"
            value={sort}
            onChange={(e) => setSort(e.target.value as ListSort)}
          >
            <option value="newest">Nieuwste</option>
            <option value="title">Productnaam</option>
            <option value="stock">Voorraad</option>
            <option value="price">Prijs</option>
          </select>
        </div>
      </div>

      {rows === "loading" ? (
        <div className="space-y-2 rounded-lg border border-wf-300 bg-white p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-wf-100" />
          ))}
        </div>
      ) : error && rows.length === 0 ? (
        <EmptyState
          title={t("plLoadFailed", locale)}
          description=""
          primaryAction={{ label: t("plRetry", locale), onClick: () => load() }}
        />
      ) : totalUnfiltered === 0 ? (
        <EmptyState
          title={t("plNoProducts", locale)}
          description={t("plNoProductsHint", locale)}
          primaryAction={{
            label: t("plAddProduct", locale),
            href: "/seller/products/add",
          }}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title={t("plNoResults", locale)}
          description={t("plNoResultsHint", locale)}
        />
      ) : (
        <>
          <p className="mb-2 text-[11px] text-wf-600">
            {rows.length === totalUnfiltered
              ? t("plProductCount", locale).replace("{count}", String(rows.length))
              : t("plProductCountFiltered", locale).replace("{count}", String(rows.length)).replace("{total}", String(totalUnfiltered))}
          </p>

          {showProductLinkBulkAction(selection.size) ? (
            <div className="sticky top-0 z-20 mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-wf-400 bg-white px-3 py-2 shadow-sm">
              <span className="text-xs font-semibold text-wf-900">
                {t("plSelected", locale).replace("{count}", String(selection.size))}
              </span>
              <button
                type="button"
                className="text-xs font-semibold text-wf-700 underline-offset-2 hover:underline"
                onClick={clearSelection}
              >
                {t("plClearSelection", locale)}
              </button>
              <button
                type="button"
                className="inline-flex h-8 items-center rounded-[5px] bg-wf-900 px-3 text-xs font-semibold text-white disabled:opacity-50"
                disabled={bulkBusy || !canOpenProductLinkDialog(selection.size)}
                onClick={openProductLinkDialog}
              >
                Producten koppelen
              </button>
              <label className="flex items-center gap-2 text-xs text-wf-700">
                <span className="font-semibold">{t("plBulkAction", locale)}</span>
                <select
                  className="h-8 rounded-[5px] border border-wf-400 bg-white px-2 text-xs"
                  value={bulkAction}
                  onChange={(e) => onBulkActionChange(e.target.value)}
                  disabled={bulkBusy}
                >
                  <option value="">Kies actie…</option>
                  <option value="eu_compliance">EU Compliance invullen</option>
                  <option value="brand_location">Merk koppelen</option>
                  <option value="shipping_profile">Verzendprofiel wijzigen</option>
                  <option value="category" disabled>
                    Categorie wijzigen (niet beschikbaar)
                  </option>
                </select>
              </label>
              <p className="basis-full text-[11px] text-wf-600">
                {canOpenProductLinkDialog(selection.size)
                  ? "Bulkacties: producten koppelen, EU Compliance, merk of verzendprofiel."
                  : "Selecteer minimaal 2 producten om te koppelen. Overige bulkacties blijven beschikbaar."}
              </p>
            </div>
          ) : null}

          {euPanelOpen ? (
            <div
              className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="eu-bulk-title"
              onClick={() => {
                if (!bulkBusy) {
                  setEuPanelOpen(false)
                  setBulkAction("")
                }
              }}
            >
              <div
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-wf-300 bg-white p-4 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <h2
                  id="eu-bulk-title"
                  className="text-sm font-bold text-wf-900"
                >
                  EU Compliance invullen
                </h2>
                <p className="mt-1 text-[11px] text-wf-600">
                  Alleen ingevulde velden worden toegepast op {selection.size}{" "}
                  geselecteerde product{selection.size === 1 ? "" : "en"}. Bulk
                  ondersteunt alleen EU Compliance (GPSR). Merk/categorie/structuurvelden
                  zijn niet beschikbaar in bulk.
                </p>
                <div className="mt-3 space-y-3">
                  {EU_COMPLIANCE_FIELDS.map((field) => {
                    const hint = gpsrHint(field.code)
                    return (
                    <div key={field.code}>
                      <label
                        htmlFor={`bulk-${field.code}`}
                        className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-wf-700"
                      >
                        {t(field.labelKey, locale)}
                        {hint ? (
                          <span
                            title={hint}
                            className="cursor-help text-wf-500"
                            aria-label={hint}
                          >
                            ⓘ
                          </span>
                        ) : null}
                      </label>
                      <input
                        id={`bulk-${field.code}`}
                        type="text"
                        className="h-9 w-full rounded-[5px] border border-wf-400 bg-white px-3 text-xs"
                        value={euForm[field.code]}
                        disabled={bulkBusy}
                        onChange={(e) =>
                          setEuForm((prev) => ({
                            ...prev,
                            [field.code]: e.target.value,
                          }))
                        }
                      />
                    </div>
                    )
                  })}
                </div>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="inline-flex h-8 items-center rounded-[5px] border border-wf-400 bg-white px-3 text-xs font-semibold text-wf-800 disabled:opacity-50"
                    disabled={bulkBusy}
                    onClick={() => {
                      setEuPanelOpen(false)
                      setBulkAction("")
                    }}
                  >
                    {t("commonCancel", locale)}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center rounded-[5px] bg-wf-900 px-3 text-xs font-semibold text-white disabled:opacity-50"
                    disabled={bulkBusy}
                    onClick={() => void submitEuCompliance()}
                  >
                    {bulkBusy ? t("commonBusy", locale) : t("commonSave", locale)}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {brandPanelOpen ? (
            <div className="mb-3 rounded-lg border border-wf-300 bg-white p-3">
              <h2 className="text-sm font-bold text-wf-900">{t("commonBrand", locale)}</h2>
              <p className="mt-1 text-[11px] text-wf-600">
                {t("pdpSelectBrandFirst", locale)}
              </p>
              <div className="mt-2 grid gap-2 tablet:grid-cols-2">
                <label className="text-xs font-semibold text-wf-700">
                  {t("commonBrand", locale)}
                  <select
                    className="mt-1 h-9 w-full rounded-[5px] border border-wf-400 bg-white px-2 text-xs"
                    value={bulkBrandId}
                    onChange={(e) => {
                      setBulkBrandId(e.target.value)
                      setBulkFacilityId("")
                    }}
                  >
                    <option value="">{t("commonBrand", locale)}</option>
                    {brandOptions.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-wf-700">
                  {t("pdpProductionLocation", locale)}
                  <select
                    className="mt-1 h-9 w-full rounded-[5px] border border-wf-400 bg-white px-2 text-xs"
                    value={bulkFacilityId}
                    onChange={(e) => setBulkFacilityId(e.target.value)}
                    disabled={!bulkBrandId}
                  >
                    <option value="">
                      {!bulkBrandId
                        ? t("pdpSelectBrandFirst", locale)
                        : t("pdpSelectLocation2", locale)}
                    </option>
                    {facilityOptions
                      .filter((facility) => facility.brand_id === bulkBrandId)
                      .map((facility) => (
                        <option key={facility.id} value={facility.id}>
                          {facility.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              {bulkBrandId &&
              facilityOptions.filter((f) => f.brand_id === bulkBrandId).length ===
                0 ? (
                <p className="mt-2 text-[11px] text-wf-600">
                  {t("pdpNoBrandLocations", locale)} {t("sellerNavBrands", locale)}.
                </p>
              ) : null}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  className="inline-flex h-8 items-center rounded-[5px] border border-wf-400 bg-white px-3 text-xs font-semibold text-wf-800"
                  onClick={() => {
                    setBrandPanelOpen(false)
                    setBulkAction("")
                  }}
                >
                  {t("commonCancel", locale)}
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 items-center rounded-[5px] bg-wf-900 px-3 text-xs font-semibold text-white disabled:opacity-50"
                  disabled={bulkBusy || !bulkBrandId || !bulkFacilityId}
                  onClick={() => void submitBulkBrandLocation()}
                >
                  {bulkBusy ? t("commonBusy", locale) : t("commonSave", locale)}
                </button>
              </div>
            </div>
          ) : null}

          {shippingPanelOpen ? (
            <div className="mb-3 rounded-lg border border-wf-300 bg-white p-3">
              <h2 className="text-sm font-bold text-wf-900">
                Verzendprofiel wijzigen
              </h2>
              <p className="mt-1 text-[11px] text-wf-600">
                {selection.size} geselecteerde product
                {selection.size === 1 ? "" : "en"} koppelen aan hetzelfde
                verzendprofiel.
              </p>
              <label className="mt-3 block text-xs font-semibold text-wf-700">
                Verzendprofiel
                <select
                  className="mt-1 h-9 w-full max-w-md rounded border border-wf-400 bg-white px-2 text-xs"
                  value={bulkShippingProfileId}
                  onChange={(e) => setBulkShippingProfileId(e.target.value)}
                >
                  <option value="">Kies profiel…</option>
                  {shippingProfiles
                    .filter((p) => p.status === "active")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  className="inline-flex h-8 items-center rounded-[5px] border border-wf-400 bg-white px-3 text-xs font-semibold text-wf-800"
                  onClick={() => {
                    setShippingPanelOpen(false)
                    setBulkAction("")
                  }}
                >
                  {t("commonCancel", locale)}
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 items-center rounded-[5px] bg-wf-900 px-3 text-xs font-semibold text-white disabled:opacity-50"
                  disabled={bulkBusy || !bulkShippingProfileId}
                  onClick={() => void submitBulkShippingProfile()}
                >
                  {bulkBusy ? t("commonBusy", locale) : t("commonSave", locale)}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mb-2 flex items-center gap-2 rounded-lg border border-wf-200 bg-white px-3 py-2">
            <input
              type="checkbox"
              id="seller-select-all-visible"
              aria-label="Selecteren"
              checked={allPageSelected}
              ref={(el) => {
                if (el) el.indeterminate = somePageSelected
              }}
              onChange={toggleSelectAllPage}
            />
            <label
              htmlFor="seller-select-all-visible"
              className="text-xs font-semibold text-wf-800"
            >
              Selecteren
            </label>
            <span className="text-[11px] text-wf-500">
              Zichtbare producten op deze lijst
            </span>
          </div>

          <div className="grid gap-3">
            {rows.map((p) => {
              const info = qualityLabel(p.completeness, locale)
              const sales = salePresentationLabel(p.completeness, {
                sales_status: p.offers?.sales_status ?? p.offer?.sales_status,
                has_offer: Boolean(p.offers?.offer_count || p.offer?.has_offer),
              }, locale)
              const stock = p.offers?.stock_total ?? p.offer?.stock
              const price = p.offers?.price ?? p.offer?.price
              const sku =
                p.offers?.sku_display ??
                p.offer?.seller_sku ??
                p.sku_hint
              const actions = p.actions || {}
              const pub = publicationGateLabel(p, locale)
              const imageSrc = resolveSellerMediaUrl(p.primary_image_url)
              const catalogOwner = isSellerCatalogOwner(p)
              const catalogInformationHref = sellerCatalogInformationHref(p)
              const catalogHistoryHref = sellerCatalogTabHref(p, "history")
              const selected = selection.has(p.id)

              return (
                <article
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(sellerProductHref(p))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      router.push(sellerProductHref(p))
                    }
                  }}
                  className={`relative cursor-pointer rounded-lg border bg-white p-3 text-left transition hover:border-wf-500 ${
                    selected
                      ? "border-wf-800 ring-1 ring-wf-800"
                      : "border-wf-300"
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className="flex shrink-0 items-start pt-1"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Selecteren ${p.title || "product"}`}
                        checked={selected}
                        onChange={() => toggleRow(p.id)}
                      />
                    </div>
                    {imageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageSrc}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-wf-100 text-[10px] text-wf-500">
                        —
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-wf-500">
                        {brandDisplay(p)}
                      </p>
                      <h3 className="truncate text-sm font-bold text-wf-900">
                        {p.title || t("pdpUntitledProduct", locale)}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${pub.className}`}>
                          {pub.label}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${sales.className}`}>
                          {sales.label}
                        </span>
                        <span className={`text-[10px] font-semibold ${info.className}`}>
                          {info.pct ?? 0}% compleet
                        </span>
                        {p.product_link_group ? (
                          <span className="rounded bg-wf-100 px-1.5 py-0.5 text-[10px] font-semibold text-wf-800">
                            Gekoppeld · {p.product_link_group.status}
                          </span>
                        ) : null}
                      </div>
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-wf-700 tablet:grid-cols-4">
                        <div>
                          <dt className="text-wf-500">Prijs</dt>
                          <dd>{price != null ? formatEuro(price) : "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-wf-500">Voorraad</dt>
                          <dd>{typeof stock === "number" ? stock : "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-wf-500">SKU</dt>
                          <dd className="truncate font-mono">{sku || "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-wf-500">GTIN</dt>
                          <dd className="truncate font-mono">
                            {p.identifier_value || "—"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <button
                      type="button"
                      aria-label={t("commonActions", locale)}
                      className="h-8 shrink-0 rounded border border-wf-400 px-2 text-[12px] font-bold leading-none"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenu((cur) => (cur === p.id ? null : p.id))
                      }}
                    >
                      ⋮
                    </button>
                  </div>
                  {openMenu === p.id ? (
                    <div
                      className="absolute right-3 top-12 z-30 w-56 rounded border border-wf-300 bg-white py-1 shadow-md"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href={sellerProductHref(p)}
                        className="block px-3 py-1.5 hover:bg-wf-50"
                      >
                        {catalogOwner ? "Beheer product" : "Eigen aanbod"}
                      </Link>
                      {catalogInformationHref ? (
                        <Link
                          href={catalogInformationHref}
                          className="block px-3 py-1.5 hover:bg-wf-50"
                        >
                          {canEditCatalogInformation(p, actions)
                            ? "Bewerk productinformatie"
                            : canProposeCatalogChange(p)
                              ? "Productinformatie / verbetering"
                              : "Productinformatie"}
                        </Link>
                      ) : null}
                      {catalogOwner ? (
                        <Link
                          href={sellerOfferHref(p)}
                          className="block px-3 py-1.5 hover:bg-wf-50"
                        >
                          Verkoopinformatie
                        </Link>
                      ) : null}
                      {catalogHistoryHref ? (
                        <Link
                          href={catalogHistoryHref}
                          className="block px-3 py-1.5 hover:bg-wf-50"
                        >
                          Geschiedenis
                        </Link>
                      ) : null}
                      {actions.pause_offer ? (
                        <button
                          type="button"
                          className="block w-full px-3 py-1.5 text-left hover:bg-wf-50"
                          disabled={actionBusy === p.id}
                          onClick={() => pauseOrResume(p, "paused")}
                        >
                          Pauzeren
                        </button>
                      ) : null}
                      {actions.resume_offer ? (
                        <button
                          type="button"
                          className="block w-full px-3 py-1.5 text-left hover:bg-wf-50"
                          disabled={actionBusy === p.id}
                          onClick={() => pauseOrResume(p, "active")}
                        >
                          Hervatten
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>

          <div className="hidden">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr>
                  <th className="border-b border-wf-400 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                    <input
                      type="checkbox"
                      aria-label={t("plSelectAll", locale)}
                      checked={allPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = somePageSelected
                      }}
                      onChange={toggleSelectAllPage}
                    />
                  </th>
                  {[
                    "",
                    t("plHeaderProduct", locale),
                    "EAN",
                    "SKU",
                    t("commonBrand", locale),
                    t("commonCategory", locale),
                    t("plHeaderVariants", locale),
                    "Info",
                    "Compliance",
                    t("plHeaderStock", locale),
                    t("plHeaderPrice", locale),
                    t("plHeaderDelivery", locale),
                    t("plHeaderSale", locale),
                    t("pdpPublicationLabel", locale),
                    "",
                  ].map((h, i) => (
                    <th
                      key={`${h}-${i}`}
                      className="border-b border-wf-400 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const info = qualityLabel(p.completeness, locale)
                  const comp = complianceReviewLabel(p.completeness, locale)
                  const sales = salePresentationLabel(p.completeness, {
                    sales_status: p.offers?.sales_status ?? p.offer?.sales_status,
                    has_offer: Boolean(p.offers?.offer_count || p.offer?.has_offer),
                  }, locale)
                  const stock = p.offers?.stock_total ?? p.offer?.stock
                  const price = p.offers?.price ?? p.offer?.price
                  const sku =
                    p.offers?.sku_display ??
                    p.offer?.seller_sku ??
                    p.sku_hint
                  const delivery =
                    p.offers?.delivery_days_max ?? p.offer?.delivery_days_max
                  const variants = p.variant_count ?? 0
                  const actions = p.actions || {}
                  const selected = selection.has(p.id)
                  const imageSrc = resolveSellerMediaUrl(p.primary_image_url)
                  const catalogOwner = isSellerCatalogOwner(p)
                  const catalogInformationHref = sellerCatalogTabHref(
                    p,
                    "information"
                  )
                  const catalogVariantsHref = sellerCatalogTabHref(p, "variants")
                  const catalogHistoryHref = sellerCatalogTabHref(p, "history")
                  const catalogChangesHref = sellerCatalogTabHref(p, "changes")
                  const catalogMediaHref = sellerCatalogTabHref(p, "media")

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-wf-200 text-wf-800 last:border-b-0"
                    >
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Selecteer ${p.title || "product"}`}
                          checked={selected}
                          onChange={() => toggleRow(p.id)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        {imageSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageSrc}
                            alt=""
                            className="h-9 w-9 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded bg-wf-100 text-[10px] text-wf-500">
                            —
                          </div>
                        )}
                      </td>
                      <td className="max-w-[13rem] px-2 py-2">
                        <Link
                          href={sellerProductHref(p)}
                          className="font-semibold text-wf-900 underline-offset-2 hover:underline"
                        >
                          {p.title || t("pdpUntitledProduct", locale)}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px]">
                        {p.identifier_value ? (
                          <span className="inline-flex items-center">
                            {p.identifier_value}
                            <CopyButton value={p.identifier_value} />
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="max-w-[7rem] truncate px-2 py-2 font-mono text-[11px]">
                        {sku || "—"}
                      </td>
                      <td className="max-w-[7rem] truncate px-2 py-2">
                        {brandDisplay(p)}
                      </td>
                      <td className="max-w-[8rem] truncate px-2 py-2">
                        {(p.category_names || []).join(", ") || "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        {variants > 0 && catalogVariantsHref ? (
                          <Link
                            href={catalogVariantsHref}
                            className="text-wf-800 underline-offset-2 hover:underline"
                          >
                            {variants === 1
                              ? "1 variant"
                              : `${variants} varianten`}
                          </Link>
                        ) : variants > 0 ? (
                          variants === 1 ? "1 variant" : `${variants} varianten`
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {catalogInformationHref ? (
                          <Link
                            href={catalogInformationHref}
                            className={info.className}
                          >
                            {info.label}
                            {typeof info.pct === "number" ? (
                              <span className="ml-1 font-normal text-wf-500">
                                {info.pct}%
                              </span>
                            ) : null}
                          </Link>
                        ) : (
                          <span className={info.className}>
                            {info.label}
                            {typeof info.pct === "number" ? (
                              <span className="ml-1 font-normal text-wf-500">
                                {info.pct}%
                              </span>
                            ) : null}
                          </span>
                        )}
                      </td>
                      <td className={`px-2 py-2 ${comp.className}`}>
                        {catalogInformationHref ? (
                          <Link href={catalogInformationHref}>{comp.label}</Link>
                        ) : (
                          <span>{comp.label}</span>
                        )}
                      </td>
                      <td
                        className={`whitespace-nowrap px-2 py-2 ${
                          typeof stock === "number" && stock <= 0
                            ? "font-bold text-red-700"
                            : ""
                        }`}
                      >
                        {typeof stock === "number"
                          ? p.offers && p.offers.offer_count > 1
                            ? `${stock} totaal`
                            : String(stock)
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        {price != null ? formatEuro(price) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        {delivery != null ? `${delivery}d` : "—"}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${sales.className}`}
                          title={sales.offerHint || undefined}
                        >
                          {sales.label}
                          {sales.offerHint ? (
                            <span className="ml-1 font-normal opacity-80">
                              ({sales.offerHint})
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        {(() => {
                          const pub = publicationGateLabel(p, locale)
                          return (
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${pub.className}`}
                            >
                              {pub.label}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="relative px-2 py-2">
                        <button
                          type="button"
                          aria-label={t("commonActions", locale)}
                          className="rounded border border-wf-400 px-2 py-1 text-[12px] font-bold leading-none"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenu((cur) => (cur === p.id ? null : p.id))
                          }}
                        >
                          ⋮
                        </button>
                        {openMenu === p.id ? (
                          <div
                            className="absolute right-2 z-30 mt-1 w-56 rounded border border-wf-300 bg-white py-1 shadow-md"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={sellerProductHref(p)}
                              className="block px-3 py-1.5 hover:bg-wf-50"
                            >
                              {catalogOwner ? "Beheer product" : "Eigen aanbod"}
                            </Link>
                            {catalogInformationHref ? (
                              <Link
                                href={catalogInformationHref}
                                className="block px-3 py-1.5 hover:bg-wf-50"
                              >
                                {canEditCatalogInformation(p, actions)
                                  ? "Bewerk productinformatie"
                                  : canProposeCatalogChange(p)
                                    ? "Productinformatie / verbetering"
                                    : "Productinformatie"}
                              </Link>
                            ) : null}
                            {catalogVariantsHref ? (
                              <Link
                                href={catalogVariantsHref}
                                className="block px-3 py-1.5 hover:bg-wf-50"
                              >
                                Varianten
                              </Link>
                            ) : null}
                            {catalogOwner ? (
                              <Link
                                href={sellerOfferHref(p)}
                                className="block px-3 py-1.5 hover:bg-wf-50"
                              >
                                Verkoopaanbod
                              </Link>
                            ) : null}
                            {catalogChangesHref ? (
                              <Link
                                href={catalogChangesHref}
                                className="block px-3 py-1.5 hover:bg-wf-50"
                              >
                                Gewijzigde productinformatie
                              </Link>
                            ) : null}
                            {catalogMediaHref ? (
                              <Link
                                href={catalogMediaHref}
                                className="block px-3 py-1.5 hover:bg-wf-50"
                              >
                                Media
                              </Link>
                            ) : null}
                            {actions.pause_offer ? (
                              <button
                                type="button"
                                disabled={actionBusy === p.id}
                                className="block w-full px-3 py-1.5 text-left hover:bg-wf-50 disabled:opacity-50"
                                onClick={() => pauseOrResume(p, "paused")}
                              >
                                Pauzeren
                              </button>
                            ) : null}
                            {actions.resume_offer ? (
                              <button
                                type="button"
                                disabled={actionBusy === p.id}
                                className="block w-full px-3 py-1.5 text-left hover:bg-wf-50 disabled:opacity-50"
                                onClick={() => pauseOrResume(p, "active")}
                              >
                                Hervatten
                              </button>
                            ) : null}
                            {catalogHistoryHref ? (
                            <Link
                              href={catalogHistoryHref}
                              className="block px-3 py-1.5 hover:bg-wf-50"
                            >
                              Geschiedenis
                            </Link>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {linkDialogOpen ? (
        <ProductLinkDialog
          products={selectedProducts}
          onClose={() => setLinkDialogOpen(false)}
          onSubmitted={(group) => {
            setActionNotice(
              `Voorstel ingediend (${group.status}). De producten blijven zelfstandig. Beheer beoordeelt de koppeling.`
            )
            clearSelection()
            loadLinkProposals()
          }}
        />
      ) : null}
    </SellerGate>
  )
}
