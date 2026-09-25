"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import { resolveDestinationVatRate } from "@europmade/utils"
import { SellerGate } from "../../_components/seller-gate"
import { formatEuro } from "../../../_components/storefront-shell"
import {
  assignProductMadeInEurope,
  getProductManager,
  patchProductInformation,
  patchProductCategories,
  listProductCloudCategories,
  addProductMediaByUrl,
  uploadProductMediaFile,
  deleteProductMedia,
  setProductMediaPrimary,
  reorderProductMedia,
  listProductVariants,
  getMadeInEuropeEvidence,
  submitProductForApproval,
  submitChangeProposal,
  uploadProductMediaProposal,
  ProductCloudApiError,
  type ProductManagerDetail,
  type SellerOfferSummary,
  type MadeInEuropeEvidenceResponse,
} from "../../_lib/product-cloud-api"
import { resolveSellerMediaUrl } from "../../_lib/media-url"
import {
  BrandApiError,
  createSellerBrand,
  listSellerBrands,
  getSellerBrand,
} from "../../_lib/brands-api"
import type { ManageableBrand } from "../../_lib/brands-api"
import {
  patchOffer,
  upsertOffer,
  CommerceCloudApiError,
} from "../../_lib/commerce-cloud-api"
import { gpsrHint } from "../../_lib/gpsr-hints"
import {
  complianceReviewLabel,
  parseMultiSelectValue,
  publicationGateLabel,
  salePresentationLabel,
  serializeMultiSelectValue,
  workflowStatusLabel,
} from "../../_lib/product-status-labels"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import type { StorefrontLocale } from "../../../_lib/i18n/locales"
import { t } from "../../../_lib/i18n/messages"
import { statusLabel } from "../../../_lib/i18n/status-labels"
import { SellerVariantsPanel } from "./_components/variants-panel"
import { ProposeInlineForm } from "./_components/propose-inline-form"
import { ProductManagerRequestSection } from "./_components/product-manager-request-section"
import { ProductWizardProgress } from "./_components/product-wizard-progress"
import { PublicationReadinessCards } from "./_components/publication-readiness-cards"
import { ProductShippingStep } from "./_components/product-shipping-step"
import {
  nextWizardStep,
  resolveWizardStep,
  type WizardStepKey,
} from "./_lib/product-wizard"
import { UnifiedComplianceEvidenceSection } from "../../_components/compliance-evidence-section"
import { EuropeanOwnershipSection } from "../../_components/european-ownership-section"
import {
  createSellerManufacturer,
  listSellerManufacturers,
  ManufacturerApiError,
  patchSellerManufacturer,
  type SellerManufacturer,
} from "../../_lib/manufacturers-api"

const EU_MARKET_CODES = [
  "NL",
  "BE",
  "DE",
  "FR",
  "ES",
  "IT",
  "AT",
  "PL",
  "PT",
  "IE",
  "SE",
  "DK",
  "FI",
  "CZ",
  "HU",
  "RO",
  "GR",
  "LU",
  "SK",
  "SI",
  "HR",
  "BG",
  "EE",
  "LV",
  "LT",
  "CY",
  "MT",
] as const

const VARIANT_AXIS_KEYS = [
  "vpAxisColor",
  "vpAxisSize",
  "vpAxisContent",
  "vpAxisPower",
  "vpAxisVoltage",
  "vpAxisMaterial",
  "vpAxisVariant",
  "vpAxisBundle",
] as const

type HistoryFilter = "all" | "compliance" | "price" | "variants" | "media" | "rest"

type TabKey = WizardStepKey | "history"

const MEDIA_MAX_BYTES = 10 * 1024 * 1024

function tierBadge(tier: string, locale: StorefrontLocale = "nl") {
  if (tier === "compliance_required") return t("pdpTierCompliance", locale)
  if (tier === "category_required") return t("pdpTierRequired", locale)
  if (tier === "recommended") return t("pdpTierRecommended", locale)
  return t("pdpTierOptional", locale)
}

function gpsrFieldLabel(code: string | null | undefined, fallback: string, locale: StorefrontLocale = "nl") {
  if (code === "gpsr_manufacturer_name") {
    return t("pdpManufacturerResponsible", locale)
  }
  return fallback
}

const GPSR_MANUFACTURER_FIELD_CODES = new Set([
  "gpsr_manufacturer_name",
  "gpsr_manufacturer_address",
  "gpsr_manufacturer_postal_city",
  "gpsr_manufacturer_country",
  "gpsr_manufacturer_email",
])

const GPSR_EU_RESPONSIBLE_FIELD_CODES = new Set([
  "gpsr_eu_responsible_name",
  "gpsr_eu_responsible_address",
  "gpsr_eu_responsible_postal_city",
  "gpsr_eu_responsible_country",
  "gpsr_eu_responsible_contact",
])

const COMPLIANCE_HANDLED_FIELD_CODES = new Set([
  ...GPSR_MANUFACTURER_FIELD_CODES,
  ...GPSR_EU_RESPONSIBLE_FIELD_CODES,
  "collects_data",
  "ce_marking",
])

function manufacturerNameMatchesBrand(
  manufacturerName: string | null | undefined,
  brandName: string | null | undefined
) {
  const left = (manufacturerName || "").trim().toLowerCase()
  const right = (brandName || "").trim().toLowerCase()
  return Boolean(left && right && left === right)
}

function manufacturerProfileLines(m: {
  name?: string | null
  street?: string | null
  house_number?: string | null
  postal_code?: string | null
  city?: string | null
  country_code?: string | null
  contact_email?: string | null
  contact_phone?: string | null
}) {
  const address = [m.street, m.house_number].filter(Boolean).join(" ")
  const city = [m.postal_code, m.city].filter(Boolean).join(" ")
  return {
    name: m.name?.trim() || "—",
    address: [address, city].filter(Boolean).join(", ") || "—",
    country: (m.country_code || "").toUpperCase() || "—",
    contact:
      [m.contact_email, m.contact_phone].filter(Boolean).join(" · ") || "—",
  }
}

type SchemaField = NonNullable<ProductManagerDetail["schema"]>[number]

function AttributeFieldEditor(props: {
  field: SchemaField
  value: string
  onChange: (value: string) => void
  openHintCode: string | null
  onToggleHint: (code: string | null) => void
  locale: StorefrontLocale
  disabled?: boolean
  onPropose?: () => void
}) {
  const {
    field,
    value,
    onChange,
    openHintCode,
    onToggleHint,
    locale,
    disabled,
    onPropose,
  } = props
  const hint = gpsrHint(field.code) || field.help_text
  const hintOpen = openHintCode === field.code
  return (
    <div className="relative">
      {field.code === "gpsr_eu_responsible_name" ? (
        <p className="mb-1 text-[11px] font-bold text-wf-800">
          {t("pdpEuResponsible", locale)}
        </p>
      ) : null}
      <div className="mb-1 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
            {gpsrFieldLabel(field.code, field.name, locale)}
            {field.unit ? ` (${field.unit})` : ""}
          </span>
          {hint || field.help_text ? (
            <button
              type="button"
              aria-expanded={hintOpen}
              aria-controls={`hint-${field.id}`}
              aria-label="GPSR"
              onClick={() =>
                onToggleHint(hintOpen ? null : field.code || null)
              }
              className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-wf-400 text-[9px] font-bold text-wf-600"
            >
              i
            </button>
          ) : null}
        </div>
        {disabled && onPropose ? (
          <button
            type="button"
            onClick={onPropose}
            className="shrink-0 text-[10px] font-semibold text-wf-700 underline"
          >
            Wijziging voorstellen
          </button>
        ) : null}
      </div>
      {hint && hintOpen ? (
        <div
          id={`hint-${field.id}`}
          role="dialog"
          className="absolute left-0 top-6 z-20 max-w-sm rounded border border-wf-400 bg-white p-2 text-[11px] leading-snug text-wf-700 shadow-md"
        >
          {hint}
          <button
            type="button"
            className="mt-1 block text-[10px] font-semibold underline"
            onClick={() => onToggleHint(null)}
          >
            {t("commonCancel", locale)}
          </button>
        </div>
      ) : null}
      {(field.code === "manual_languages" ||
        field.code === "product_languages") &&
      field.data_type === "Keuzelijst" ? (
        <div className="rounded border border-wf-300 p-2">
          <p className="mb-1 text-[10px] text-wf-600">
            {parseMultiSelectValue(value).length} {t("commonSelected", locale).replace("{count} ", "")}
          </p>
          <div className="max-h-36 space-y-1 overflow-y-auto">
            {(field.option_values || []).map((opt) => {
              const selected = parseMultiSelectValue(value).includes(opt)
              return (
                <label key={opt} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={disabled}
                    onChange={(e) => {
                      const cur = parseMultiSelectValue(value)
                      const next = e.target.checked
                        ? [...cur, opt]
                        : cur.filter((v) => v !== opt)
                      onChange(serializeMultiSelectValue(next))
                    }}
                  />
                  {opt}
                </label>
              )
            })}
          </div>
        </div>
      ) : field.data_type === "Keuzelijst" && field.option_values?.length ? (
        <select
          className="h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs disabled:bg-wf-50"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {field.option_values.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <Input
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={tierBadge(field.requirement_tier, locale)}
        />
      )}
      <p className="mt-0.5 text-[10px] text-wf-500">
        {tierBadge(field.requirement_tier, locale)}
        {field.is_required ||
        field.requirement_tier === "category_required" ||
        field.requirement_tier === "compliance_required"
          ? ` · ${t("pdpRequiredForPublication", locale)}`
          : ""}
      </p>
    </div>
  )
}

function qualityLabel(product: ProductManagerDetail, locale: StorefrontLocale = "nl") {
  const q = product.completeness?.information_quality
  if (q === "complete") return { label: t("qualityComplete", locale), className: "text-emerald-700" }
  if (q === "sufficient") return { label: t("qualitySufficient", locale), className: "text-wf-800" }
  return { label: t("qualityInsufficient", locale), className: "text-amber-700" }
}

function salesBadge(product: ProductManagerDetail, locale: StorefrontLocale = "nl") {
  const sales = salePresentationLabel(product.completeness, {
    sales_status: product.offers?.sales_status ?? product.offer?.sales_status,
    has_offer: Boolean(product.offers?.offer_count || product.offer?.has_offer),
  }, locale)
  return sales
}

function publicationLabel(product: ProductManagerDetail, locale: StorefrontLocale = "nl") {
  const pub = publicationGateLabel(product, locale)
  const tone =
    pub.label === t("pubPublished", locale) || pub.label === t("pubPublishable", locale)
      ? ("ok" as const)
      : pub.label === t("pubNotPublishable", locale)
        ? ("warn" as const)
        : ("neutral" as const)
  return { label: pub.label, tone, className: pub.className }
}

function sectionDetail(
  sections: Array<{ key?: string; filled?: number; total?: number }>,
  keys: string[]
) {
  const matched = sections.filter((s) => s.key && keys.includes(s.key))
  if (matched.length === 0) return "—"
  const filled = matched.reduce((n, s) => n + (s.filled ?? 0), 0)
  const total = matched.reduce((n, s) => n + (s.total ?? 0), 0)
  if (total <= 0) return "—"
  return `${filled}/${total} ingevuld`
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(local: string): string | null {
  if (!local.trim()) return null
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

/**
 * Seller enters customer prices incl. shipping.
 * Backend stores product component (base/promo) separately from shipping_cost.
 */
function effectivePricing(
  unitPrice: number | string | null | undefined,
  promoUnit: number | string | null | undefined,
  start: string | null | undefined,
  end: string | null | undefined,
  shipping: number | string | null | undefined,
  extra: number | string | null | undefined,
  now: Date = new Date()
) {
  const regularNum = Number(unitPrice)
  const promoNum = Number(promoUnit)
  const shippingNum = Number(shipping)
  const extraNum = Number(extra)
  const shippingSafe = Number.isFinite(shippingNum) ? shippingNum : 0
  const extraSafe = Number.isFinite(extraNum) ? extraNum : 0
  const regularSafe = Number.isFinite(regularNum) ? regularNum : null

  let unit = regularSafe
  let promoActive = false

  if (Number.isFinite(promoNum) && promoUnit !== "" && promoUnit != null) {
    const startOk = !start || new Date(start) <= now
    const endOk = !end || new Date(end) >= now
    if (startOk && endOk) {
      unit = promoNum
      promoActive = true
    }
  }

  const customer =
    unit != null
      ? Math.round((unit + shippingSafe + extraSafe) * 100) / 100
      : null
  const productNet = unit
  const discountAmount =
    promoActive && regularSafe != null ? regularSafe - promoNum : null
  const discountPercent =
    discountAmount != null && regularSafe != null && regularSafe > 0
      ? (discountAmount / regularSafe) * 100
      : null

  return {
    regular: regularSafe,
    customer,
    shipping: shippingSafe,
    extra: extraSafe,
    productNet,
    promoActive,
    discountAmount,
    discountPercent,
  }
}

function historyCategory(fieldCode: string): HistoryFilter {
  if (fieldCode.startsWith("gpsr_")) return "compliance"
  if (fieldCode.startsWith("offer.")) return "price"
  if (fieldCode.startsWith("variant.")) return "variants"
  if (
    fieldCode.startsWith("media.") ||
    fieldCode.includes("media") ||
    fieldCode.startsWith("document.")
  )
    return "media"
  return "rest"
}

function tabForFieldCode(fieldCode: string): TabKey {
  if (fieldCode.startsWith("offer.")) return "offer"
  if (fieldCode.startsWith("variant.")) return "information"
  if (
    fieldCode.startsWith("media.") ||
    fieldCode.includes("media") ||
    fieldCode.startsWith("document.")
  )
    return "media"
  return "information"
}

function isVideoMedia(
  mediaType: string,
  ref: string,
  mime?: string | null,
  metadata?: Record<string, unknown> | null
) {
  const videoMeta = metadata?.video as { embed_url?: string } | undefined
  if (videoMeta?.embed_url) return true
  const m = (mime || "").toLowerCase()
  if (m.startsWith("video/")) return true
  if (mediaType === "Video") return true
  return /\.(mp4|webm)(\?|$)/i.test(ref)
}

function videoEmbedUrl(
  metadata?: Record<string, unknown> | null
): string | null {
  const video = metadata?.video as { embed_url?: string } | undefined
  return video?.embed_url ?? null
}

type OfferDraft = {
  offer_id: string | null
  identifier_id: string
  base_price: string
  promo_price: string
  promo_starts_at: string
  promo_ends_at: string
  shipping_cost: string
  extra_delivery_cost: string
  quantity_available: string
  seller_sku: string
  delivery_days_max: string
  vat_rate: string
  region_code: string
  sales_status: "active" | "paused"
  clear_promo: boolean
}

type ManufacturerDraft = {
  name: string
  street: string
  house_number: string
  postal_code: string
  city: string
  country_code: string
  contact_email: string
  contact_phone: string
}

function draftFromOffer(
  offer: SellerOfferSummary,
  fallbackIdent: string
): OfferDraft {
  const shipping =
    offer.shipping_cost != null && Number.isFinite(Number(offer.shipping_cost))
      ? Number(offer.shipping_cost)
      : 0
  const extra =
    offer.extra_delivery_cost != null &&
    Number.isFinite(Number(offer.extra_delivery_cost))
      ? Number(offer.extra_delivery_cost)
      : 0
  const base =
    offer.price != null && Number.isFinite(Number(offer.price))
      ? Number(offer.price)
      : null
  const promo =
    offer.promo_price != null && Number.isFinite(Number(offer.promo_price))
      ? Number(offer.promo_price)
      : null
  return {
    offer_id: offer.offer_id,
    identifier_id: offer.identifier_id || fallbackIdent,
    base_price: base != null ? String(base) : "",
    promo_price: promo != null ? String(promo) : "",
    promo_starts_at: toDatetimeLocal(offer.promo_starts_at),
    promo_ends_at: toDatetimeLocal(offer.promo_ends_at),
    shipping_cost: String(shipping),
    extra_delivery_cost: String(extra),
    quantity_available: offer.stock != null ? String(offer.stock) : "0",
    seller_sku: offer.seller_sku || "",
    delivery_days_max:
      offer.delivery_days_max != null ? String(offer.delivery_days_max) : "",
    vat_rate:
      offer.vat_rate != null && Number.isFinite(Number(offer.vat_rate))
        ? String(Number(offer.vat_rate))
        : "0.21",
    region_code: offer.region_code || "NL",
    sales_status: offer.sales_status === "paused" ? "paused" : "active",
    clear_promo: false,
  }
}

function emptyOfferDraft(identifierId: string, region = "NL"): OfferDraft {
  return {
    offer_id: null,
    identifier_id: identifierId,
    base_price: "",
    promo_price: "",
    promo_starts_at: "",
    promo_ends_at: "",
    shipping_cost: "0",
    extra_delivery_cost: "0",
    quantity_available: "0",
    seller_sku: "",
    delivery_days_max: "",
    vat_rate: "0.21",
    region_code: region,
    sales_status: "active",
    clear_promo: false,
  }
}

/**
 * Seller Product Detail — P2 correction round (single tab bar, promo pricing, media CRUD).
 */
export default function SellerProductDetailPage() {
  const locale = useStorefrontLocale()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const search = useSearchParams()
  const productId = params.id
  const initialStep = resolveWizardStep(
    search.get("step") || search.get("tab")
  )

  const [tab, setTabState] = useState<TabKey>(initialStep)
  const [product, setProduct] = useState<ProductManagerDetail | "loading" | null>(
    "loading"
  )
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [offerSaving, setOfferSaving] = useState(false)
  const [mediaBusy, setMediaBusy] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [pcCategories, setPcCategories] = useState<
    Array<{ id: string; name: string }>
  >([])
  const [categoryPick, setCategoryPick] = useState("")
  const [attrDraft, setAttrDraft] = useState<Record<string, string>>({})
  const [offerDraft, setOfferDraft] = useState<OfferDraft | null>(null)
  const [regularPriceDraft, setRegularPriceDraft] = useState("")
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null)
  const [mediaUrl, setMediaUrl] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [uploadMediaType, setUploadMediaType] = useState<
    "Hoofdafbeelding" | "Overige afbeelding"
  >("Overige afbeelding")
  const [openHintCode, setOpenHintCode] = useState<string | null>(null)
  const [addMarketCode, setAddMarketCode] = useState("")
  const [marketBusy, setMarketBusy] = useState(false)
  const [suggestedAxes, setSuggestedAxes] = useState<string[]>([])
  const [allowedVariantTypes, setAllowedVariantTypes] = useState<string[]>(
    VARIANT_AXIS_KEYS.map((k) => t(k, locale))
  )
  const [mie, setMie] = useState<MadeInEuropeEvidenceResponse | null>(null)
  const [publishBusy, setPublishBusy] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all")
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null)
  const [dragMediaId, setDragMediaId] = useState<string | null>(null)
  const [manufacturers, setManufacturers] = useState<SellerManufacturer[]>([])
  const [manufacturersLoaded, setManufacturersLoaded] = useState(false)
  const [manufacturerId, setManufacturerId] = useState("")
  const [brandIsNotManufacturer, setBrandIsNotManufacturer] = useState(false)
  const [showNewManufacturer, setShowNewManufacturer] = useState(false)
  const [showEditManufacturer, setShowEditManufacturer] = useState(false)
  const [facilityId, setFacilityId] = useState("")
  const [selectedBrandId, setSelectedBrandId] = useState("")
  const [brands, setBrands] = useState<ManageableBrand[]>([])
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [brandCreateBusy, setBrandCreateBusy] = useState(false)
  const [facilities, setFacilities] = useState<
    Array<{
      id: string
      name: string
      brand_id: string
      country_code?: string
      is_active?: boolean
    }>
  >([])
  const [manufacturerDraft, setManufacturerDraft] = useState<ManufacturerDraft>({
    name: "",
    street: "",
    house_number: "",
    postal_code: "",
    city: "",
    country_code: "NL",
    contact_email: "",
    contact_phone: "",
  })
  const [proposeSection, setProposeSection] = useState<
    | "title"
    | "description"
    | "brand"
    | "manufacturer"
    | "attribute"
    | "media"
    | null
  >(null)
  const [proposedValue, setProposedValue] = useState("")
  const [proposeAttrId, setProposeAttrId] = useState<string | null>(null)
  const [proposeToelichting, setProposeToelichting] = useState("")
  const [proposeBusy, setProposeBusy] = useState(false)
  const [proposeMediaRefs, setProposeMediaRefs] = useState<string[]>([])
  const [proposeUploadBusy, setProposeUploadBusy] = useState(false)

  const sortedMedia = useMemo(() => {
    if (!product || product === "loading") return []
    return [...(product.media || [])]
      .filter((m) => {
        const meta = (m as { metadata?: Record<string, unknown> | null })
          .metadata
        const mime = String(meta?.mime_type || m.mime_type || "").toLowerCase()
        const ref = String(m.storage_reference || "").toLowerCase()
        const purpose = String(meta?.purpose || "")
        if (purpose === "compliance_evidence") return false
        if (mime.includes("pdf") || ref.includes(".pdf")) return false
        return true
      })
      .sort(
        (a, b) =>
          Number((a as { sort_order?: number }).sort_order ?? 0) -
          Number((b as { sort_order?: number }).sort_order ?? 0)
      )
  }, [product])

  const setTab = useCallback(
    (next: TabKey, section?: string | null) => {
      setTabState(next)
      const qs = new URLSearchParams(search.toString())
      if (next === "history") {
        qs.set("tab", "history")
      } else {
        qs.set("step", next)
        qs.delete("tab")
      }
      if (section) qs.set("section", section)
      else qs.delete("section")
      router.replace(`/seller/products/${productId}?${qs.toString()}`, {
        scroll: false,
      })
    },
    [productId, router, search]
  )

  const load = useCallback(() => {
    setError(null)
    getProductManager(productId)
      .then((res) => {
        setProduct(res.product)
        setManufacturerId(res.product.manufacturer_id || "")
        setSelectedBrandId(res.product.brand_id || "")
        setTitle(res.product.title || "")
        setDescription(res.product.description || "")
        setCategoryPick(res.product.category_names?.[0] || "")
        void listProductCloudCategories()
          .then((cats) =>
            setPcCategories(
              (cats.categories || []).map((c) => ({ id: c.id, name: c.name }))
            )
          )
          .catch(() => undefined)
        const draft: Record<string, string> = {}
        for (const field of res.product.schema || []) {
          draft[field.id] = field.value || ""
        }
        setAttrDraft(draft)

        const allOffers: SellerOfferSummary[] = []
        for (const v of res.product.variants || []) {
          for (const o of v.offers || []) {
            if (o.has_offer) allOffers.push(o)
          }
        }
        if (!allOffers.length && res.product.offer?.has_offer) {
          allOffers.push(res.product.offer)
        }
        const primaryId =
          res.product.offers?.primary_offer_id ||
          allOffers.find((o) => o.is_sellable)?.offer_id ||
          allOffers[0]?.offer_id ||
          null
        setSelectedOfferId(primaryId)
        const primary =
          allOffers.find((o) => o.offer_id === primaryId) ||
          res.product.offer ||
          null
        if (primary?.has_offer && primary.identifier_id) {
          setOfferDraft(draftFromOffer(primary, primary.identifier_id))
        } else if (res.product.identifier_id) {
          setOfferDraft(emptyOfferDraft(res.product.identifier_id))
        } else {
          setOfferDraft(null)
        }
        setRegularPriceDraft(
          res.product.regular_customer_price != null
            ? String(res.product.regular_customer_price)
            : primary?.price != null
              ? String(primary.price)
              : ""
        )
        void listSellerManufacturers()
          .then((rows) => {
            setManufacturers(rows.manufacturers || [])
            setManufacturersLoaded(true)
          })
          .catch(() => {
            setManufacturers([])
            setManufacturersLoaded(true)
          })
      })
      .catch((err: unknown) => {
        setProduct(null)
        setError(
          err instanceof ProductCloudApiError
            ? err.message
            : t("pdpLoadFailed", locale)
        )
      })
  }, [productId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const next = search.get("tab")
    if (next === "history") {
      setTabState("history")
      return
    }
    const step = search.get("step") || search.get("tab")
    if (step) setTabState(resolveWizardStep(step))
  }, [search])

  useEffect(() => {
    if (tab !== "information") return
    const section = search.get("section")
    if (section !== "compliance") return
    const el = document.getElementById("section-compliance")
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [tab, search, product])

  useEffect(() => {
    if (!product || product === "loading") return
    let cancelled = false
    void listProductVariants(productId)
      .then((res) => {
        if (cancelled) return
        setSuggestedAxes(res.suggested_axes || [])
        if (res.allowed_variant_types?.length) {
          setAllowedVariantTypes(res.allowed_variant_types)
        }
      })
      .catch(() => {
        /* manager already has variants; axes optional */
      })
    void getMadeInEuropeEvidence(productId)
      .then((res) => {
        if (!cancelled) setMie(res)
      })
      .catch(() => {
        if (!cancelled) setMie(null)
      })
    return () => {
      cancelled = true
    }
  }, [product, productId])

  useEffect(() => {
    void listSellerBrands()
      .then((res) => setBrands(res.brands || []))
      .catch(() => setBrands([]))
  }, [])

  useEffect(() => {
    if (!selectedBrandId) {
      setFacilities([])
      return
    }
    let cancelled = false
    void getSellerBrand(selectedBrandId)
      .then((res) => {
        if (cancelled) return
        const rows = (
          (res.facilities || []) as Array<{
            id: string
            name?: string
            brand_id?: string
            country_code?: string
            is_active?: boolean
          }>
        ).map((f) => ({
          id: f.id,
          name: f.name || t("pdpProductionLocation", locale),
          brand_id: f.brand_id || selectedBrandId,
          country_code: f.country_code,
          is_active: f.is_active,
        }))
        setFacilities((prev) => {
          const extra = prev.filter(
            (row) => row.id === facilityId && !rows.some((f) => f.id === row.id)
          )
          return [...rows.filter((f) => f.is_active !== false), ...extra]
        })
        const allowedIds = new Set(
          rows
            .filter((f) => f.is_active !== false || f.id === facilityId)
            .map((f) => f.id)
        )
        if (facilityId && !allowedIds.has(facilityId)) {
          setFacilityId("")
          setNotice(t("offerLocationMismatch", locale))
        }
      })
      .catch(() => {
        if (!cancelled) setFacilities([])
      })
    return () => {
      cancelled = true
    }
    // facilityId is read to keep a current (possibly inactive) link visible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrandId])

  useEffect(() => {
    if (!mie?.facility?.id || !selectedBrandId) return
    if (
      mie.facility.brand_id &&
      mie.facility.brand_id !== selectedBrandId
    ) {
      return
    }
    setFacilities((prev) => {
      if (prev.some((f) => f.id === mie.facility?.id)) return prev
      return [
        ...prev,
        {
          id: mie.facility.id,
          name: mie.facility.name,
          brand_id: selectedBrandId,
          country_code: mie.facility.country_code,
          is_active: mie.facility.is_active,
        },
      ]
    })
  }, [mie, selectedBrandId])

  useEffect(() => {
    const selected = manufacturers.find((m) => m.id === manufacturerId)
    if (!selected) return
    setManufacturerDraft({
      name: selected.name || "",
      street: selected.street || "",
      house_number: selected.house_number || "",
      postal_code: selected.postal_code || "",
      city: selected.city || "",
      country_code: (selected.country_code || "NL").toUpperCase(),
      contact_email: selected.contact_email || "",
      contact_phone: selected.contact_phone || "",
    })
  }, [manufacturerId, manufacturers])

  useEffect(() => {
    if (!manufacturersLoaded || !product || product === "loading") return
    const brandName =
      brands.find((row) => row.id === product.brand_id)?.name ||
      product.brand_name ||
      ""
    const current = manufacturers.find((m) => m.id === product.manufacturer_id)
    setBrandIsNotManufacturer(
      Boolean(
        product.manufacturer_id &&
          brandName &&
          !manufacturerNameMatchesBrand(current?.name, brandName)
      )
    )
  }, [manufacturersLoaded, manufacturers, brands, product])

  const schemaByTier = useMemo(() => {
    if (!product || product === "loading") return {}
    const groups: Record<string, NonNullable<ProductManagerDetail["schema"]>> = {
      compliance_required: [],
      category_required: [],
      recommended: [],
      optional: [],
    }
    for (const field of product.schema || []) {
      const tier = field.requirement_tier || "optional"
      if (!groups[tier]) groups[tier] = []
      groups[tier].push(field)
    }
    return groups
  }, [product])

  const attrByCode = useMemo(() => {
    if (!product || product === "loading") return {} as Record<string, string>
    const map: Record<string, string> = {}
    for (const field of product.schema || []) {
      if (field.code) {
        map[field.code] = attrDraft[field.id] ?? field.value ?? ""
      }
    }
    return map
  }, [product, attrDraft])

  const ceMarkingVisible = attrByCode.ce_marking?.trim() === "Zichtbaar"
  const collectsDataYes = attrByCode.collects_data?.trim() === "Ja"

  useEffect(() => {
    const selected = mie?.facility
    if (!selected?.id) return
    if (selected.brand_id && selectedBrandId && selected.brand_id !== selectedBrandId) {
      return
    }
    setFacilityId(selected.id)
  }, [mie, selectedBrandId])

  const refreshCompliance = useCallback(async () => {
    const [res, mgr] = await Promise.all([
      getMadeInEuropeEvidence(productId),
      getProductManager(productId),
    ])
    setMie(res)
    setProduct(mgr.product)
  }, [productId])

  const variantOfferRows = useMemo(() => {
    if (!product || product === "loading") return []
    const rows: Array<{
      variantId: string
      variantType: string
      variantValue: string
      variantLabel: string
      ean: string | null
      identifierId: string | null
      offers: SellerOfferSummary[]
      primaryOffer: SellerOfferSummary | null
    }> = []
    for (const v of product.variants || []) {
      const ids = v.identifiers || []
      if (!ids.length) {
        rows.push({
          variantId: v.id,
          variantType: v.variant_type,
          variantValue: v.variant_value,
          variantLabel: `${v.variant_type}: ${v.variant_value}`,
          ean: null,
          identifierId: null,
          offers: [],
          primaryOffer: null,
        })
        continue
      }
      for (const iden of ids) {
        const offers = (v.offers || []).filter(
          (o) => o.has_offer && o.identifier_id === iden.id
        )
        rows.push({
          variantId: v.id,
          variantType: v.variant_type,
          variantValue: v.variant_value,
          variantLabel: `${v.variant_type}: ${v.variant_value}`,
          ean: iden.identifier_value,
          identifierId: iden.id,
          offers,
          primaryOffer: offers[0] || null,
        })
      }
    }
    return rows
  }, [product])

  const offersForSelectedIdentifier = useMemo(() => {
    if (!offerDraft?.identifier_id || !product || product === "loading") {
      return [] as SellerOfferSummary[]
    }
    const list: SellerOfferSummary[] = []
    for (const v of product.variants || []) {
      for (const o of v.offers || []) {
        if (
          o.has_offer &&
          o.identifier_id === offerDraft.identifier_id &&
          o.offer_id
        ) {
          list.push(o)
        }
      }
    }
    if (
      !list.length &&
      product.offer?.has_offer &&
      product.offer.identifier_id === offerDraft.identifier_id
    ) {
      list.push(product.offer)
    }
    return list
  }, [product, offerDraft?.identifier_id])

  const filteredChanges = useMemo(() => {
    if (!product || product === "loading") return []
    const all = product.field_changes || []
    if (historyFilter === "all") return all
    return all.filter((c) => historyCategory(c.field_code) === historyFilter)
  }, [product, historyFilter])

  const selectedChange = useMemo(() => {
    if (!selectedChangeId || !product || product === "loading") return null
    return (
      (product.field_changes || []).find((c) => c.id === selectedChangeId) ||
      null
    )
  }, [product, selectedChangeId])

  const pricingPreview = useMemo(() => {
    if (!offerDraft) return null
    const promoStart = offerDraft.clear_promo
      ? null
      : fromDatetimeLocal(offerDraft.promo_starts_at)
    const promoEnd = offerDraft.clear_promo
      ? null
      : fromDatetimeLocal(offerDraft.promo_ends_at)
    const promo =
      offerDraft.clear_promo || !offerDraft.promo_price.trim()
        ? null
        : offerDraft.promo_price
    return effectivePricing(
      regularPriceDraft || offerDraft.base_price,
      promo,
      promoStart,
      promoEnd,
      offerDraft.shipping_cost,
      offerDraft.extra_delivery_cost
    )
  }, [offerDraft, regularPriceDraft])

  function selectOffer(offer: SellerOfferSummary) {
    if (!offer.offer_id || !offer.identifier_id) return
    setSelectedOfferId(offer.offer_id)
    setOfferDraft(draftFromOffer(offer, offer.identifier_id))
    setTab("offer")
  }

  async function handleCreateBrand() {
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
      const brand = created.brand
      setBrands((prev) =>
        prev.some((row) => row.id === brand.id) ? prev : [...prev, brand]
      )
      setSelectedBrandId(brand.id)
      if (!brandIsNotManufacturer) {
        const match = manufacturers.find((m) =>
          manufacturerNameMatchesBrand(m.name, brand.name)
        )
        setManufacturerId(match?.id || "")
      }
      setShowNewBrand(false)
      setNewBrandName("")
      setNotice(t("brandCreated", locale))
      void listSellerBrands()
        .then((res) => {
          const next = res.brands || []
          if (next.some((row) => row.id === brand.id)) {
            setBrands(next)
          }
        })
        .catch(() => {
          /* keep locally added brand so it stays selectable */
        })
    } catch (err) {
      setError(
        err instanceof BrandApiError
          ? err.message
          : t("brandCreateFailed", locale)
      )
    } finally {
      setBrandCreateBusy(false)
    }
  }

  async function handleCreateManufacturer() {
    if (
      !manufacturerDraft.name.trim() ||
      !manufacturerDraft.country_code.trim() ||
      !manufacturerDraft.contact_email.trim()
    ) {
      setError(t("formNameCountryEmailRequired", locale))
      return
    }
    setSaving(true)
    setError(null)
    try {
      const created = await createSellerManufacturer({
        name: manufacturerDraft.name.trim(),
        street: manufacturerDraft.street.trim() || null,
        house_number: manufacturerDraft.house_number.trim() || null,
        postal_code: manufacturerDraft.postal_code.trim() || null,
        city: manufacturerDraft.city.trim() || null,
        country_code: manufacturerDraft.country_code.toUpperCase(),
        contact_email: manufacturerDraft.contact_email.trim(),
        contact_phone: manufacturerDraft.contact_phone.trim() || null,
      })
      const next = created.manufacturer
      setManufacturers((prev) => [...prev, next])
      setManufacturerId(next.id)
      setShowNewManufacturer(false)
      setShowEditManufacturer(false)
      setManufacturerDraft({
        name: "",
        street: "",
        house_number: "",
        postal_code: "",
        city: "",
        country_code: "NL",
        contact_email: "",
        contact_phone: "",
      })
      setNotice(t("pdpManufacturerSaved", locale))
    } catch (err) {
      setError(
        err instanceof ManufacturerApiError
          ? err.message
          : t("pdpManufacturerSaveFailed", locale)
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateManufacturer() {
    if (!manufacturerId) return
    if (
      !manufacturerDraft.name.trim() ||
      !manufacturerDraft.country_code.trim() ||
      !manufacturerDraft.contact_email.trim()
    ) {
      setError(t("formNameCountryEmailRequired", locale))
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updated = await patchSellerManufacturer(manufacturerId, {
        name: manufacturerDraft.name.trim(),
        street: manufacturerDraft.street.trim() || null,
        house_number: manufacturerDraft.house_number.trim() || null,
        postal_code: manufacturerDraft.postal_code.trim() || null,
        city: manufacturerDraft.city.trim() || null,
        country_code: manufacturerDraft.country_code.toUpperCase(),
        contact_email: manufacturerDraft.contact_email.trim(),
        contact_phone: manufacturerDraft.contact_phone.trim() || null,
      })
      setManufacturers((prev) =>
        prev.map((m) => (m.id === manufacturerId ? updated.manufacturer : m))
      )
      setNotice(t("pdpManufacturerUpdated", locale))
      setShowEditManufacturer(false)
    } catch (err) {
      setError(
        err instanceof ManufacturerApiError
          ? err.message
          : t("pdpManufacturerUpdateFailed", locale)
      )
    } finally {
      setSaving(false)
    }
  }

  async function saveInformation() {
    if (!product || product === "loading") return
    setSaving(true)
    setNotice(null)
    setError(null)
    try {
      const isOwner = product.catalog_owner === true
      if (!isOwner) {
        // Gap-fill only: blank central fields via existing information PATCH.
        const payload: {
          title?: string
          description?: string
          brand_id?: string
          manufacturer_id?: string
        } = {}
        if (!(product.title || "").trim() && title.trim()) {
          payload.title = title.trim()
        }
        if (!(product.description || "").trim() && description.trim()) {
          payload.description = description.trim()
        }
        if (!(product.brand_id || "").trim() && selectedBrandId.trim()) {
          payload.brand_id = selectedBrandId.trim()
        }
        if (
          !(product.manufacturer_id || "").trim() &&
          manufacturerId.trim()
        ) {
          payload.manufacturer_id = manufacturerId.trim()
        }
        if (Object.keys(payload).length === 0) {
          throw new Error(
            "Geen ontbrekende centrale velden om aan te vullen. Gebruik 'Wijziging voorstellen' voor bestaande waarden."
          )
        }
        const res = await patchProductInformation(productId, payload)
        setProduct(res.product)
        setNotice("Ontbrekende productgegevens aangevuld.")
        return
      }

      const attributes = Object.entries(attrDraft)
        .filter(([attribute_definition_id]) => {
          const field = (product.schema || []).find(
            (row) => row.id === attribute_definition_id
          )
          return !GPSR_MANUFACTURER_FIELD_CODES.has(field?.code || "")
        })
        .map(([attribute_definition_id, value]) => ({
          attribute_definition_id,
          value,
        }))
      const res = await patchProductInformation(productId, {
        title,
        description,
        brand_id: selectedBrandId || undefined,
        brand_is_manufacturer: !brandIsNotManufacturer,
        manufacturer_id: brandIsNotManufacturer
          ? manufacturerId || undefined
          : undefined,
        attributes,
      })
      if (facilityId) {
        await assignProductMadeInEurope(productId, {
          production_facility_id: facilityId,
        })
      }
      setProduct(res.product)
      await refreshCompliance()
      setNotice(t("pdpInfoSaved", locale))
      const next = nextWizardStep("information")
      if (tab === "information" && next) setTab(next)
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudApiError || err instanceof Error
          ? err.message
          : t("pdpSaveFailed", locale)
      )
    } finally {
      setSaving(false)
    }
  }

  function openPropose(
    section:
      | "title"
      | "description"
      | "brand"
      | "manufacturer"
      | "attribute"
      | "media",
    current: string,
    attrId?: string
  ) {
    setProposeSection(section)
    setProposedValue(section === "media" ? "" : current)
    setProposeAttrId(attrId || null)
    setProposeToelichting("")
    setProposeMediaRefs([])
    setError(null)
    setNotice(null)
  }

  async function handleProposeMediaFile(file: File | null) {
    if (!file) return
    setProposeUploadBusy(true)
    setError(null)
    try {
      const res = await uploadProductMediaProposal(productId, file)
      setProposeMediaRefs((prev) => [...prev, res.storage_reference])
      setNotice("Afbeelding geüpload als voorstel (nog niet live).")
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : "Media-upload voor voorstel mislukt."
      )
    } finally {
      setProposeUploadBusy(false)
    }
  }

  async function submitPropose(e: FormEvent) {
    e.preventDefault()
    if (!proposeSection || !proposeToelichting.trim()) {
      setError("Toelichting is verplicht.")
      return
    }
    if (proposeSection === "media") {
      if (!proposeMediaRefs.length && !proposedValue.trim()) {
        setError("Upload een afbeelding of beschrijf het mediavoorstel.")
        return
      }
    } else if (!proposedValue.trim()) {
      setError("Vul een voorgestelde waarde in.")
      return
    }
    setProposeBusy(true)
    setError(null)
    setNotice(null)
    try {
      const fieldMap = {
        title: "title" as const,
        description: "description" as const,
        brand: "brand_id" as const,
        manufacturer: "manufacturer_id" as const,
        attribute: "attribute" as const,
        media: "media_note" as const,
      }
      const labelMap = {
        title: "Productnaam",
        description: "Beschrijving",
        brand: "Merk",
        manufacturer: "Fabrikant",
        attribute:
          (product !== "loading" &&
            product?.schema?.find((s) => s.id === proposeAttrId)?.name) ||
          "Specificatie",
        media: "Media",
      }
      const currentMap = {
        title: product !== "loading" ? product?.title || null : null,
        description: product !== "loading" ? product?.description || null : null,
        brand: product !== "loading" ? product?.brand_id || null : null,
        manufacturer:
          product !== "loading" ? product?.manufacturer_id || null : null,
        attribute:
          (product !== "loading" &&
            product?.schema?.find((s) => s.id === proposeAttrId)?.value) ||
          null,
        media: null,
      }
      await submitChangeProposal({
        product_id: productId,
        toelichting: proposeToelichting.trim(),
        proposed_fields: {
          changes: [
            {
              field: fieldMap[proposeSection],
              label: labelMap[proposeSection],
              current_value: currentMap[proposeSection],
              proposed_value:
                proposedValue.trim() ||
                (proposeSection === "media"
                  ? "Voorgestelde productafbeelding"
                  : ""),
              attribute_definition_id: proposeAttrId || undefined,
              storage_references:
                proposeSection === "media" && proposeMediaRefs.length
                  ? proposeMediaRefs
                  : undefined,
            },
          ],
        },
      })
      setNotice("Wijzigingsvoorstel ingediend.")
      setProposeSection(null)
      setProposedValue("")
      setProposeAttrId(null)
      setProposeToelichting("")
      setProposeMediaRefs([])
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : "Voorstel indienen mislukt."
      )
    } finally {
      setProposeBusy(false)
    }
  }

  async function persistOfferDraft(opts?: { advanceFrom?: WizardStepKey }) {
    if (!offerDraft) return
    setOfferSaving(true)
    setNotice(null)
    setError(null)
    try {
      // UI fields are customer prices incl. shipping; API stores product component.
      const regular = Number(regularPriceDraft || offerDraft.base_price)
      const shipping_cost = Number(offerDraft.shipping_cost || 0)
      const extra_delivery_cost = Number(offerDraft.extra_delivery_cost || 0)
      const quantity_available = Number(offerDraft.quantity_available || 0)
      const delivery_days_max =
        offerDraft.delivery_days_max.trim() === ""
          ? null
          : Number(offerDraft.delivery_days_max)
      const vat_rate = resolveDestinationVatRate(offerDraft.region_code)

      if (!Number.isFinite(regular) || !Number.isFinite(vat_rate)) {
        throw new Error(t("offerPriceInvalid", locale))
      }
      const base_price = Math.round(regular * 100) / 100

      const promoPayload = offerDraft.clear_promo
        ? {
            clear_promo: true as const,
            promo_price: null,
            promo_starts_at: null,
            promo_ends_at: null,
          }
        : {
            clear_promo: false as const,
            promo_price:
              offerDraft.promo_price.trim() === ""
                ? null
                : Math.round(Number(offerDraft.promo_price) * 100) / 100,
            promo_starts_at: fromDatetimeLocal(offerDraft.promo_starts_at),
            promo_ends_at: fromDatetimeLocal(offerDraft.promo_ends_at),
          }

      if (
        !offerDraft.clear_promo &&
        promoPayload.promo_price != null &&
        !Number.isFinite(promoPayload.promo_price)
      ) {
        throw new Error(t("pdpActionPriceInvalid", locale))
      }
      if (
        !offerDraft.clear_promo &&
        promoPayload.promo_price != null &&
        promoPayload.promo_price < 0
      ) {
        throw new Error(t("pdpActionPriceNegative", locale))
      }

      if (offerDraft.offer_id) {
        await patchOffer(offerDraft.offer_id, {
          base_price,
          regular_customer_price: base_price,
          shipping_cost,
          extra_delivery_cost,
          quantity_available,
          vat_rate,
          seller_sku: offerDraft.seller_sku.trim() || null,
          delivery_days_max,
          sales_status: offerDraft.sales_status,
          ...promoPayload,
        })
      } else {
        await upsertOffer({
          identifier_id: offerDraft.identifier_id,
          region_code: offerDraft.region_code || "NL",
          base_price,
          regular_customer_price: base_price,
          shipping_cost,
          extra_delivery_cost,
          quantity_available,
          vat_rate,
          seller_sku: offerDraft.seller_sku.trim() || null,
          delivery_days_max,
          sales_status: offerDraft.sales_status,
          ...promoPayload,
        })
      }
      setNotice(t("pdpOfferSaved", locale))
      load()
      if (opts?.advanceFrom) {
        const next = nextWizardStep(opts.advanceFrom)
        if (next) setTab(next)
      }
    } catch (err: unknown) {
      setError(
        err instanceof CommerceCloudApiError || err instanceof Error
          ? err.message
          : t("pdpOfferSaveFailed", locale)
      )
    } finally {
      setOfferSaving(false)
    }
  }

  async function saveOffer() {
    if (!offerDraft) return
    const regular = Number(regularPriceDraft || offerDraft.base_price)
    if (!Number.isFinite(regular) || regular <= 0) {
      setError(t("offerPriceInvalid", locale))
      return
    }
    await persistOfferDraft({ advanceFrom: "offer" })
  }

  async function saveShipping() {
    if (!offerDraft) return
    const shipping_cost = Number(offerDraft.shipping_cost)
    const quantityRaw = offerDraft.quantity_available.trim()
    if (quantityRaw === "" || !/^\d+$/.test(quantityRaw)) {
      setError("Vul een geldige voorraad in (geheel getal, minimaal 0).")
      return
    }
    const quantity_available = Number(quantityRaw)
    if (
      !Number.isFinite(shipping_cost) ||
      !Number.isFinite(quantity_available) ||
      quantity_available < 0 ||
      !Number.isInteger(quantity_available)
    ) {
      setError("Vul een geldige voorraad in (geheel getal, minimaal 0).")
      return
    }
    await persistOfferDraft({ advanceFrom: "shipping" })
  }

  async function pauseOrResume(next: "paused" | "active") {
    const offerId = offerDraft?.offer_id || selectedOfferId
    if (!offerId) return
    if (next === "paused") {
      const ok = window.confirm(
        t("pdpConfirmPause", locale)
      )
      if (!ok) return
    }
    setOfferSaving(true)
    setError(null)
    try {
      await patchOffer(offerId, { sales_status: next })
      setNotice(next === "paused" ? t("pdpOfferPaused", locale) : t("pdpOfferResumed", locale))
      load()
    } catch (err: unknown) {
      setError(
        err instanceof CommerceCloudApiError
          ? err.message
          : t("pdpStatusChangeFailed", locale)
      )
    } finally {
      setOfferSaving(false)
    }
  }

  async function addMarketOffer() {
    if (!offerDraft?.identifier_id || !addMarketCode) return
    const taken = new Set(
      offersForSelectedIdentifier.map((o) => (o.region_code || "").toUpperCase())
    )
    if (taken.has(addMarketCode.toUpperCase())) {
      setError(`Er bestaat al een offer voor markt ${addMarketCode}.`)
      return
    }
    setMarketBusy(true)
    setError(null)
    setNotice(null)
    try {
      const shipping = Number(offerDraft.shipping_cost) || 0
      const extra = Number(offerDraft.extra_delivery_cost) || 0
      const base = Number(regularPriceDraft || offerDraft.base_price) || 0
      await upsertOffer({
        identifier_id: offerDraft.identifier_id,
        region_code: addMarketCode.toUpperCase(),
        base_price: base,
        regular_customer_price: base,
        shipping_cost: shipping,
        extra_delivery_cost: extra,
        quantity_available: Number(offerDraft.quantity_available) || 0,
        seller_sku: offerDraft.seller_sku.trim() || null,
        delivery_days_max:
          offerDraft.delivery_days_max.trim() === ""
            ? null
            : Number(offerDraft.delivery_days_max),
        sales_status: "active",
      })
      setAddMarketCode("")
      setNotice(`Markt ${addMarketCode.toUpperCase()} toegevoegd.`)
      load()
    } catch (err: unknown) {
      setError(
        err instanceof CommerceCloudApiError || err instanceof Error
          ? err.message
          : t("pdpMarketAddFailed", locale)
      )
    } finally {
      setMarketBusy(false)
    }
  }

  async function handleSubmitForApproval() {
    if (!product || product === "loading" || !product.version_id) return
    if (!product.completeness?.publishable) {
      setError(t("pdpSubmitNotReady", locale))
      return
    }
    setPublishBusy(true)
    setError(null)
    setNotice(null)
    try {
      await submitProductForApproval(productId, product.version_id)
      setNotice(t("pdpSubmitSuccess", locale))
      load()
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("pdpSubmitFailed", locale)
      )
    } finally {
      setPublishBusy(false)
    }
  }

  async function handleMediaUpload(file: File | null) {
    if (!file) return
    if (file.size > MEDIA_MAX_BYTES) {
      setError(t("pdpFileTooLarge", locale))
      return
    }
    setMediaBusy(true)
    setError(null)
    setNotice(null)
    try {
      await uploadProductMediaFile(productId, file, {
        media_type: uploadMediaType,
      })
      setNotice(t("pdpMediaUploaded", locale))
      load()
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudApiError ? err.message : t("pdpUploadFailed", locale)
      )
    } finally {
      setMediaBusy(false)
    }
  }

  async function handleImageUrlAdd() {
    const url = mediaUrl.trim()
    if (!url) {
      setError(t("pdpMediaUrlEmpty", locale))
      return
    }
    setMediaBusy(true)
    setError(null)
    setNotice(null)
    try {
      await addProductMediaByUrl(productId, {
        storage_reference: url,
        media_type: uploadMediaType,
      })
      setMediaUrl("")
      setNotice(t("pdpMediaUrlAdded", locale))
      load()
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("pdpMediaAddFailed", locale)
      )
    } finally {
      setMediaBusy(false)
    }
  }

  async function handleVideoUrlAdd() {
    const url = videoUrl.trim()
    if (!url) {
      setError(t("pdpMediaUrlEmpty", locale))
      return
    }
    setMediaBusy(true)
    setError(null)
    setNotice(null)
    try {
      await addProductMediaByUrl(productId, {
        storage_reference: url,
        media_type: "Video",
      })
      setVideoUrl("")
      setNotice(t("pdpMediaUrlAdded", locale))
      load()
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("mediaVideoInvalidUrl", locale)
      )
    } finally {
      setMediaBusy(false)
    }
  }

  async function handleMediaDelete(mediaId: string) {
    const ok = window.confirm(t("pdpMediaDeleteConfirm", locale))
    if (!ok) return
    setMediaBusy(true)
    setError(null)
    setNotice(null)
    try {
      await deleteProductMedia(productId, mediaId)
      setNotice(t("pdpMediaDeleted", locale))
      load()
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("pdpMediaDeleteFailed", locale)
      )
    } finally {
      setMediaBusy(false)
    }
  }

  async function handleMediaPrimary(mediaId: string) {
    setMediaBusy(true)
    setError(null)
    setNotice(null)
    try {
      await setProductMediaPrimary(productId, mediaId)
      setNotice(t("pdpPrimaryUpdated", locale))
      load()
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("pdpSaveFailed", locale)
      )
    } finally {
      setMediaBusy(false)
    }
  }

  async function handleMediaReorder(fromId: string, toId: string) {
    if (fromId === toId || product === "loading" || !product) return
    const ids = sortedMedia.map((m) => m.id)
    const fromIdx = ids.indexOf(fromId)
    const toIdx = ids.indexOf(toId)
    if (fromIdx < 0 || toIdx < 0) return
    const next = [...ids]
    next.splice(fromIdx, 1)
    next.splice(toIdx, 0, fromId)
    setMediaBusy(true)
    setError(null)
    try {
      await reorderProductMedia(productId, next)
      setNotice(t("mediaOrderSaved", locale))
      load()
    } catch (err: unknown) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("mediaOrderFailed", locale)
      )
    } finally {
      setMediaBusy(false)
      setDragMediaId(null)
    }
  }

  if (product === "loading") {
    return (
      <SellerGate
        breadcrumb={[
          { label: t("sellerDashboardTitle", locale), href: "/seller" },
          { label: t("sellerNavProducts", locale), href: "/seller/products" },
          { label: "…" },
        ]}
      >
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-wf-100" />
          ))}
        </div>
      </SellerGate>
    )
  }

  if (!product) {
    return (
      <SellerGate
        breadcrumb={[
          { label: t("sellerDashboardTitle", locale), href: "/seller" },
          { label: t("sellerNavProducts", locale), href: "/seller/products" },
          { label: "Product" },
        ]}
      >
        <Notice variant="warning">{error || "Product niet gevonden."}</Notice>
        <Link
          href="/seller/products"
          className="mt-3 inline-block text-xs font-semibold underline"
        >
          {t("commonBack", locale)}
        </Link>
      </SellerGate>
    )
  }

  const sections = product.completeness?.sections || []
  const canEditCatalog = product.catalog_owner === true
  const canProposeChange = !canEditCatalog
  const titleIsBlank = !(product.title || "").trim()
  const descriptionIsBlank = !(product.description || "").trim()
  const canGapFillTitle = canProposeChange && titleIsBlank
  const canGapFillDescription = canProposeChange && descriptionIsBlank
  const quality = qualityLabel(product, locale)
  const sales = salesBadge(product, locale)
  const pub = publicationLabel(product, locale)
  const brand =
    brands.find((b) => b.id === selectedBrandId)?.name ||
    product.brand_name ||
    (product.brand_id && !product.brand_id.startsWith("brand_")
      ? product.brand_id
      : "—")
  const selectableFacilities = facilities.filter(
    (row) => row.is_active !== false || row.id === facilityId
  )
  const activeFacilitiesForBrand = selectableFacilities.filter(
    (row) => row.is_active !== false
  )
  const collectsDataField = (product.schema || []).find(
    (field) => field.code === "collects_data"
  )
  const selectedManufacturer =
    manufacturers.find((row) => row.id === manufacturerId) || null
  const selectedBrandName =
    brands.find((row) => row.id === selectedBrandId)?.name ||
    product.brand_name ||
    ""
  const brandManufacturer = manufacturers.find((row) =>
    manufacturerNameMatchesBrand(row.name, selectedBrandName)
  )
  const displayManufacturer = brandIsNotManufacturer
    ? selectedManufacturer
    : brandManufacturer || selectedManufacturer
  const manufacturerLines = displayManufacturer
    ? manufacturerProfileLines(displayManufacturer)
    : selectedBrandName
      ? {
          name: selectedBrandName,
          address: "—",
          country: "—",
          contact: "—",
        }
      : null
  const ceMarkingField = (product.schema || []).find(
    (field) => field.code === "ce_marking"
  )
  const extraComplianceFields = (schemaByTier.compliance_required || []).filter(
    (field) => !COMPLIANCE_HANDLED_FIELD_CODES.has(field.code || "")
  )
  const informationDirty =
    title !== (product.title || "") ||
    description !== (product.description || "") ||
    manufacturerId !== (product.manufacturer_id || "") ||
    selectedBrandId !== (product.brand_id || "") ||
    facilityId !== (mie?.facility?.id || "") ||
    (product.schema || []).some(
      (field) => (attrDraft[field.id] || "") !== (field.value || "")
    )
  const evidenceStatusLabel =
    mie?.evidence_status === "approved"
      ? t("complianceApproved", locale)
      : mie?.evidence_status === "pending_review"
        ? t("compliancePendingReview", locale)
        : mie?.evidence_status === "rejected"
          ? t("complianceRejected", locale)
          : t("complianceMissing", locale)

  const overviewCards: Array<{
    key: string
    label: string
    tab: TabKey
    section?: string
    detail: string
  }> = [
    {
      key: "basis",
      label: t("pdpBasicInfo", locale),
      tab: "information",
      detail: quality.label,
    },
    {
      key: "required",
      label: t("pdpTierRequired", locale),
      tab: "information",
      detail: sectionDetail(sections, ["required", "category_required"]),
    },
    {
      key: "compliance",
      label: "EU Compliance",
      tab: "information",
      section: "compliance",
      detail:
        product.completeness?.compliance_status === "complete"
          ? t("complianceComplete", locale)
          : product.completeness?.compliance_status === "not_applicable"
            ? t("complianceNotApplicable", locale)
            : t("complianceIncomplete", locale),
    },
    {
      key: "recommended",
      label: t("pdpTierRecommended", locale),
      tab: "information",
      detail: sectionDetail(sections, ["recommended"]),
    },
    {
      key: "optional",
      label: t("pdpTierOptional", locale),
      tab: "information",
      detail: sectionDetail(sections, ["optional"]),
    },
    {
      key: "offer",
      label: t("pdpTabOffer", locale),
      tab: "offer",
      detail:
        (product.offers?.offer_count ?? 0) > 0 || product.offer?.has_offer
          ? `${sales.label}${
              (product.offers?.price ?? product.offer?.price) != null
                ? ` · ${formatEuro(product.offers?.price ?? product.offer?.price ?? 0)}`
                : ""
            }`
          : t("pdpNoOffer", locale),
    },
    {
      key: "variants",
      label: t("pdpTabVariants", locale),
      tab: "variants",
      detail: t("pdpVariantCount", locale).replace("{count}", String(product.variant_count ?? product.variants?.length ?? 0)),
    },
    {
      key: "media",
      label: t("pdpTabMedia", locale),
      tab: "media",
      detail: t("pdpMediaCount", locale).replace("{count}", String((product.media || []).length)),
    },
    {
      key: "translations",
      label: t("pdpTabTranslations", locale),
      tab: "translations",
      detail: "Product Cloud",
    },
    {
      key: "publication",
      label: t("pdpTabPublication", locale),
      tab: "publication",
      detail: pub.label,
    },
    {
      key: "history",
      label: t("pdpTabHistory", locale),
      tab: "history",
      detail: t("pdpChangesCount", locale).replace("{count}", String((product.field_changes || []).length)),
    },
  ]

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavProducts", locale), href: "/seller/products" },
        { label: product.title || product.id },
      ]}
    >
      <div className="mb-4 flex flex-wrap gap-4 border-b border-wf-300 pb-4">
        {product.primary_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveSellerMediaUrl(product.primary_image_url)}
            alt=""
            className="h-20 w-20 rounded bg-wf-50 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none"
              const fallback = e.currentTarget.nextElementSibling
              if (fallback instanceof HTMLElement) {
                fallback.classList.remove("hidden")
                fallback.classList.add("flex")
              }
            }}
          />
        ) : null}
        <div
          className={`h-20 w-20 items-center justify-center rounded bg-wf-100 text-xs text-wf-500 ${
            product.primary_image_url ? "hidden" : "flex"
          }`}
        >
          {t("pdpNoMedia", locale)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[19px] font-bold text-wf-900">
            {product.title || t("pdpUntitledProduct", locale)}
          </h1>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-wf-600">
            <span>EAN: {product.identifier_value || "—"}</span>
            <span>{t("commonBrand", locale)}: {brand}</span>
            <span>
              {t("commonCategory", locale)}:{" "}
              {(product.category_names || []).join(", ") ||
                "Categorie moet nog worden toegewezen"}
            </span>
            <span className="font-mono">{product.id}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {statusLabel(product.lifecycle_status, locale)}
            </Badge>
            <span
              className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${sales.className}`}
              title={sales.detail || sales.offerHint || undefined}
            >
              {t("pdpSaleLabel", locale)}: {sales.label}
              {sales.offerHint ? (
                <span className="ml-1 font-normal opacity-75">
                  · {sales.offerHint}
                </span>
              ) : null}
            </span>
            {sales.detail ? (
              <span className="w-full text-[11px] text-red-700">
                {t("saleBlockedNeedList", locale)}: {sales.detail}
              </span>
            ) : null}
            <span
              className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${pub.className}`}
            >
              {t("pdpPublicationLabel", locale)}: {pub.label}
            </span>
            <span className={`text-[11px] font-semibold ${quality.className}`}>
              {t("pdpInfoLabel", locale)}: {quality.label}
              {typeof product.completeness?.percent === "number"
                ? ` (${product.completeness.percent}%)`
                : ""}
            </span>
            <span
              className={`text-[11px] font-semibold ${complianceReviewLabel(product.completeness, locale).className}`}
            >
              {t("pdpComplianceLabel", locale)}: {complianceReviewLabel(product.completeness, locale).label}
            </span>
            {product.actions?.pause_offer ? (
              <button
                type="button"
                disabled={offerSaving}
                onClick={() => pauseOrResume("paused")}
                className="text-[11px] font-semibold text-wf-700 underline disabled:opacity-50"
              >
                {t("pdpPause", locale)}
              </button>
            ) : null}
            {product.actions?.resume_offer ? (
              <button
                type="button"
                disabled={offerSaving}
                onClick={() => pauseOrResume("active")}
                className="text-[11px] font-semibold text-wf-700 underline disabled:opacity-50"
              >
                {t("pdpResume", locale)}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <Notice variant="warning" className="mb-3">
          {error}
        </Notice>
      ) : null}
      {notice ? (
        <Notice variant="info" className="mb-3">
          {notice}
        </Notice>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-1 border-b border-wf-200 pb-2">
        {product && product !== "loading" ? (
          <ProductWizardProgress
            product={product}
            current={tab === "history" ? "information" : tab}
            onSelect={(step) => setTab(step)}
          />
        ) : null}
        <button
          type="button"
          onClick={() => setTab("history")}
          className={`ml-auto rounded px-2.5 py-1.5 text-[11px] font-semibold ${
            tab === "history"
              ? "bg-wf-900 text-white"
              : "bg-wf-100 text-wf-700 hover:bg-wf-200"
          }`}
        >
          {t("pdpTabHistory", locale)}
        </button>
      </div>

      {false && tab === "overview" ? (
        <div className="grid gap-3 tablet:grid-cols-2">
          {overviewCards.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => setTab(card.tab, card.section ?? null)}
              className="rounded border border-wf-300 bg-white px-3 py-2.5 text-left hover:border-wf-500"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-wf-900">{card.label}</span>
                <span className="text-[10px] text-wf-500">{t("pdpOpenArrow", locale)}</span>
              </div>
              <p className="mt-1 text-[11px] text-wf-600">{card.detail}</p>
              {(() => {
                const sec = sections.find(
                  (s) =>
                    s.key === card.key ||
                    (card.key === "required" && s.key === "category_required")
                )
                if (!sec || !sec.total) return null
                return (
                  <div className="mt-2 h-1.5 overflow-hidden rounded bg-wf-200">
                    <div
                      className="h-full bg-wf-800"
                      style={{
                        width: `${Math.round((sec.filled / sec.total) * 100)}%`,
                      }}
                    />
                  </div>
                )
              })()}
            </button>
          ))}
        </div>
      ) : null}

      {tab === "information" ? (
        <div className="space-y-4 pb-16">
          {canProposeChange ? (
            <Notice variant="info" className="text-[11px]">
              Je bent geen Productbeheerder. Centrale gegevens zijn read-only;
              gebruik &quot;Wijziging voorstellen&quot; voor bestaande waarden.
              Ontbrekende velden mag je aanvullen. Prijs, voorraad en SKU beheer
              je via Verkoopinformatie / Voorraad &amp; verzending.
            </Notice>
          ) : null}
          {product.product_manager_request ? (
            <ProductManagerRequestSection
              productId={productId}
              request={product.product_manager_request}
              onChanged={async () => {
                await load()
              }}
            />
          ) : null}
          <section className="rounded border border-wf-300 bg-white p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-wf-900">{t("pdpBasicInfo", locale)}</h2>
              <span className={`text-[11px] font-semibold ${quality.className}`}>
                {quality.label}
              </span>
            </div>
            <div className="mt-2 grid gap-2 tablet:grid-cols-2">
              <div>
                <Input
                  label={t("pdpProductName", locale)}
                  value={title}
                  disabled={canProposeChange && !canGapFillTitle}
                  onChange={(e) => setTitle(e.target.value)}
                />
                {canProposeChange && !canGapFillTitle ? (
                  <button
                    type="button"
                    className="mt-1 text-[10px] font-semibold text-wf-700 underline"
                    onClick={() => openPropose("title", title)}
                  >
                    Wijziging voorstellen
                  </button>
                ) : null}
                {proposeSection === "title" ? (
                  <ProposeInlineForm
                    sectionLabel="Productnaam"
                    proposedValue={proposedValue}
                    toelichting={proposeToelichting}
                    busy={proposeBusy}
                    onProposedValueChange={setProposedValue}
                    onToelichtingChange={setProposeToelichting}
                    onSubmit={(e) => void submitPropose(e)}
                    onCancel={() => setProposeSection(null)}
                  />
                ) : null}
              </div>
              <Input
                label="EAN / GTIN"
                value={product.identifier_value || ""}
                disabled
              />
              <div>
                <Input
                  label={t("commonBrand", locale)}
                  value={brand && brand !== "—" ? brand : t("pdpChooseBrandAtMie", locale)}
                  disabled
                />
                {canProposeChange && product.brand_id ? (
                  <button
                    type="button"
                    className="mt-1 text-[10px] font-semibold text-wf-700 underline"
                    onClick={() =>
                      openPropose("brand", product.brand_id || "")
                    }
                  >
                    Wijziging voorstellen
                  </button>
                ) : null}
                {proposeSection === "brand" ? (
                  <ProposeInlineForm
                    sectionLabel="Merk"
                    proposedValue={proposedValue}
                    toelichting={proposeToelichting}
                    busy={proposeBusy}
                    onProposedValueChange={setProposedValue}
                    onToelichtingChange={setProposeToelichting}
                    onSubmit={(e) => void submitPropose(e)}
                    onCancel={() => setProposeSection(null)}
                  />
                ) : null}
              </div>
              {!(product.category_names || []).length ? (
                <label className="text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                  {t("commonCategory", locale)}
                  <select
                    className="mt-1 h-8 w-full rounded border border-wf-400 bg-white px-2 text-xs font-normal normal-case tracking-normal text-wf-800 disabled:bg-wf-50"
                    value={categoryPick}
                    disabled={saving || canProposeChange}
                    onChange={(e) => {
                      const next = e.target.value
                      setCategoryPick(next)
                      if (!next) return
                      setSaving(true)
                      void patchProductCategories(productId, [next])
                        .then(() => {
                          setNotice("Categorie toegewezen.")
                          load()
                        })
                        .catch((err) =>
                          setError(
                            err instanceof ProductCloudApiError
                              ? err.message
                              : "Categorie kon niet worden toegewezen."
                          )
                        )
                        .finally(() => setSaving(false))
                    }}
                  >
                    <option value="">— kies een EuropMade-categorie —</option>
                    {pcCategories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block font-normal normal-case tracking-normal text-amber-800">
                    Categorie niet herkend — kies een EuropMade-categorie.
                  </span>
                </label>
              ) : (
                <Input
                  label={t("commonCategory", locale)}
                  value={(product.category_names || []).join(", ")}
                  disabled
                />
              )}
              <div className="tablet:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                  {t("pdpDescription", locale)}
                </label>
                <textarea
                  className="min-h-[96px] w-full rounded-[5px] border border-wf-400 bg-white px-3 py-2 text-xs text-wf-800 disabled:bg-wf-50"
                  value={description}
                  disabled={canProposeChange && !canGapFillDescription}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
                {canProposeChange && !canGapFillDescription ? (
                  <button
                    type="button"
                    className="mt-1 text-[10px] font-semibold text-wf-700 underline"
                    onClick={() => openPropose("description", description)}
                  >
                    Wijziging voorstellen
                  </button>
                ) : null}
                {proposeSection === "description" ? (
                  <ProposeInlineForm
                    sectionLabel="Beschrijving"
                    proposedValue={proposedValue}
                    toelichting={proposeToelichting}
                    busy={proposeBusy}
                    onProposedValueChange={setProposedValue}
                    onToelichtingChange={setProposeToelichting}
                    onSubmit={(e) => void submitPropose(e)}
                    onCancel={() => setProposeSection(null)}
                  />
                ) : null}
              </div>
            </div>
          </section>

          {(
            [
              ["category_required", t("pdpTierRequiredInfo", locale)],
              ["recommended", t("pdpTierRecommendedInfo", locale)],
              ["optional", t("pdpTierOptionalInfo", locale)],
            ] as [string, string][]
          ).map(([tier, label]) => {
            const fields = schemaByTier[tier] || []
            const displayFields = fields.filter(
              (f) =>
                f.code !== "collects_data" &&
                !GPSR_MANUFACTURER_FIELD_CODES.has(f.code || "") &&
                !GPSR_EU_RESPONSIBLE_FIELD_CODES.has(f.code || "") &&
                f.code !== "ce_marking"
            )
            if (!displayFields.length) return null
            const filled = displayFields.filter((f) =>
              (attrDraft[f.id] || "").trim()
            ).length
            const missing = displayFields.filter(
              (f) => !(attrDraft[f.id] || "").trim()
            )
            return (
              <section
                key={tier}
                className="rounded border border-wf-300 bg-white p-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-wf-900">{label}</h2>
                  <span className="text-[10px] text-wf-500">
                    {filled} / {displayFields.length}
                  </span>
                </div>
                {missing.length > 0 &&
                tier !== "optional" &&
                tier !== "recommended" ? (
                  <p className="mt-1 text-[10px] text-amber-700">
                    {t("pdpMissingFields", locale)}: {missing.map((f) => f.name).join(", ")}
                  </p>
                ) : null}
                <div className="mt-2 grid gap-2 tablet:grid-cols-2">
                  {displayFields.map((field) => (
                    <div key={field.id}>
                      <AttributeFieldEditor
                        field={field}
                        value={attrDraft[field.id] || ""}
                        onChange={(next) =>
                          setAttrDraft((prev) => ({
                            ...prev,
                            [field.id]: next,
                          }))
                        }
                        openHintCode={openHintCode}
                        onToggleHint={setOpenHintCode}
                        locale={locale}
                        disabled={canProposeChange}
                        onPropose={
                          canProposeChange
                            ? () =>
                                openPropose(
                                  "attribute",
                                  attrDraft[field.id] || "",
                                  field.id
                                )
                            : undefined
                        }
                      />
                      {proposeSection === "attribute" &&
                      proposeAttrId === field.id ? (
                        <ProposeInlineForm
                          sectionLabel={field.name}
                          proposedValue={proposedValue}
                          toelichting={proposeToelichting}
                          busy={proposeBusy}
                          onProposedValueChange={setProposedValue}
                          onToelichtingChange={setProposeToelichting}
                          onSubmit={(e) => void submitPropose(e)}
                          onCancel={() => setProposeSection(null)}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            )
          })}

          <SellerVariantsPanel
            productId={productId}
            product={product}
            suggestedAxes={suggestedAxes}
            allowedAxes={allowedVariantTypes}
            locale={locale}
            catalogEditable={canEditCatalog}
            onReload={load}
            onNotice={setNotice}
            onError={setError}
            onOpenOfferTab={(offer) => {
              selectOffer(offer)
              setTab("offer")
            }}
          />

          <div className="sticky bottom-0 z-10 -mx-1 border-t border-wf-300 bg-white/95 px-1 py-2 backdrop-blur">
            <div className="flex flex-wrap gap-2">
              {canEditCatalog || canGapFillTitle || canGapFillDescription ? (
                <Button size="sm" onClick={saveInformation} disabled={saving}>
                  {saving
                    ? t("pdpSaving", locale)
                    : canEditCatalog
                      ? t("commonSave", locale)
                      : "Ontbrekende velden aanvullen"}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setTab("offer")}
              >
                Volgende: verkoopinformatie
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "compliance" ? (
        <div className="space-y-4 pb-16">
          <section
            id="section-compliance"
            className="space-y-3 rounded border border-wf-300 bg-white p-3"
          >
            <h2 className="text-xs font-bold text-wf-900">
              {t("pdpMadeInEuropeCompliance", locale)}
            </h2>

            <label className="block text-[11px] font-semibold text-wf-700">
              {t("commonBrand", locale)}
              <select
                className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs disabled:bg-wf-50"
                value={selectedBrandId}
                disabled={canProposeChange}
                onChange={(e) => {
                  const id = e.target.value
                  setSelectedBrandId(id)
                  if (!brandIsNotManufacturer) {
                    const name =
                      brands.find((row) => row.id === id)?.name || ""
                    const match = manufacturers.find((m) =>
                      manufacturerNameMatchesBrand(m.name, name)
                    )
                    setManufacturerId(match?.id || "")
                  }
                }}
              >
                <option value="">{t("commonBrand", locale)}</option>
                {brands.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
                {selectedBrandId &&
                !brands.some((row) => row.id === selectedBrandId) ? (
                  <option value={selectedBrandId}>
                    {product.brand_name || selectedBrandId}
                  </option>
                ) : null}
              </select>
            </label>
            {canProposeChange && product.brand_id ? (
              <>
                <button
                  type="button"
                  className="text-[10px] font-semibold text-wf-700 underline"
                  onClick={() => openPropose("brand", product.brand_id || "")}
                >
                  Wijziging voorstellen (merk)
                </button>
                {proposeSection === "brand" ? (
                  <ProposeInlineForm
                    sectionLabel="Merk"
                    proposedValue={proposedValue}
                    toelichting={proposeToelichting}
                    busy={proposeBusy}
                    onProposedValueChange={setProposedValue}
                    onToelichtingChange={setProposeToelichting}
                    onSubmit={(e) => void submitPropose(e)}
                    onCancel={() => setProposeSection(null)}
                  />
                ) : null}
              </>
            ) : null}
            {canProposeChange && product.manufacturer_id ? (
              <>
                <button
                  type="button"
                  className="text-[10px] font-semibold text-wf-700 underline"
                  onClick={() =>
                    openPropose("manufacturer", product.manufacturer_id || "")
                  }
                >
                  Wijziging voorstellen (fabrikant)
                </button>
                {proposeSection === "manufacturer" ? (
                  <ProposeInlineForm
                    sectionLabel="Fabrikant"
                    proposedValue={proposedValue}
                    toelichting={proposeToelichting}
                    busy={proposeBusy}
                    onProposedValueChange={setProposedValue}
                    onToelichtingChange={setProposeToelichting}
                    onSubmit={(e) => void submitPropose(e)}
                    onCancel={() => setProposeSection(null)}
                  />
                ) : null}
              </>
            ) : null}
            <div className="space-y-2">
              <Button
                size="sm"
                type="button"
                variant="secondary"
                disabled={canProposeChange}
                onClick={() => setShowNewBrand((v) => !v)}
              >
                {t("pdpAddBrand", locale)}
              </Button>
              {showNewBrand ? (
                <div className="space-y-2 rounded border border-wf-300 p-2">
                  <Input
                    label={t("brandNamePlaceholder", locale)}
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                  />
                  <Button
                    size="sm"
                    type="button"
                    disabled={brandCreateBusy}
                    onClick={() => void handleCreateBrand()}
                  >
                    {t("commonSave", locale)}
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-wf-800">
                {t("pdpManufacturerResponsible", locale)}
              </p>
              <p className="text-[11px] text-wf-600">
                Merk, fabrikant, productielocatie en verantwoordelijke
                marktdeelnemer (EU verantwoordelijke fabrikant) zijn
                afzonderlijke gegevens. Het merk is niet automatisch dezelfde
                juridische entiteit als de fabrikant of de verantwoordelijke
                marktdeelnemer.
              </p>
              {manufacturerLines ? (
                <dl className="space-y-1 text-[11px] text-wf-800">
                  <div>
                    <dt className="text-wf-500">{t("formName", locale)}</dt>
                    <dd className="font-semibold">{manufacturerLines.name}</dd>
                  </div>
                  <div>
                    <dt className="text-wf-500">{t("pdpAddress", locale)}</dt>
                    <dd>{manufacturerLines.address}</dd>
                  </div>
                  <div>
                    <dt className="text-wf-500">{t("pdpCountry", locale)}</dt>
                    <dd>{manufacturerLines.country}</dd>
                  </div>
                  <div>
                    <dt className="text-wf-500">{t("pdpContact", locale)}</dt>
                    <dd>{manufacturerLines.contact}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-[11px] text-wf-600">
                  {t("pdpChooseBrandAtMie", locale)}
                </p>
              )}
              <label className="mt-1 flex items-start gap-2 text-[11px] text-wf-800">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={brandIsNotManufacturer}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setBrandIsNotManufacturer(checked)
                    if (!checked) {
                      const match = manufacturers.find((m) =>
                        manufacturerNameMatchesBrand(m.name, selectedBrandName)
                      )
                      if (match) setManufacturerId(match.id)
                    }
                  }}
                />
                <span>{t("pdpBrandIsNotManufacturer", locale)}</span>
              </label>
              {brandIsNotManufacturer ? (
                <div className="space-y-2 pt-1">
                  {manufacturers.length === 0 ? (
                    <p className="text-[11px] text-wf-700">
                      {t("pdpSelectManufacturer", locale)}
                    </p>
                  ) : (
                    <select
                      className="h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs"
                      value={manufacturerId}
                      onChange={(e) => setManufacturerId(e.target.value)}
                    >
                      <option value="">{t("pdpSelectManufacturer", locale)}</option>
                      {manufacturers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({(m.country_code || "").toUpperCase() || "??"})
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowEditManufacturer(false)
                        setShowNewManufacturer((v) => !v)
                        setManufacturerDraft({
                          name: "",
                          street: "",
                          house_number: "",
                          postal_code: "",
                          city: "",
                          country_code: "NL",
                          contact_email: "",
                          contact_phone: "",
                        })
                      }}
                    >
                      {t("pdpAddManufacturer", locale)}
                    </Button>
                    {manufacturerId ? (
                      <Button
                        size="sm"
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setShowNewManufacturer(false)
                          setShowEditManufacturer((v) => !v)
                        }}
                      >
                        {t("commonEdit", locale)}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : manufacturerLines &&
                (manufacturerLines.address === "—" ||
                  manufacturerLines.contact === "—" ||
                  manufacturerLines.country === "—") &&
                (brandManufacturer || manufacturerId) ? (
                <Button
                  size="sm"
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowNewManufacturer(false)
                    setShowEditManufacturer((v) => !v)
                  }}
                >
                  {t("commonEdit", locale)}
                </Button>
              ) : null}
              {showNewManufacturer || showEditManufacturer ? (
                <div className="grid gap-2 rounded border border-wf-300 p-2 tablet:grid-cols-2">
                  <Input
                    label={t("formName", locale)}
                    value={manufacturerDraft.name}
                    onChange={(e) =>
                      setManufacturerDraft((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label={t("formCountryIso", locale)}
                    value={manufacturerDraft.country_code}
                    onChange={(e) =>
                      setManufacturerDraft((prev) => ({
                        ...prev,
                        country_code: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                  <Input
                    label={t("formStreet", locale)}
                    value={manufacturerDraft.street}
                    onChange={(e) =>
                      setManufacturerDraft((prev) => ({
                        ...prev,
                        street: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label={t("formHouseNumber", locale)}
                    value={manufacturerDraft.house_number}
                    onChange={(e) =>
                      setManufacturerDraft((prev) => ({
                        ...prev,
                        house_number: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label={t("formPostalCode", locale)}
                    value={manufacturerDraft.postal_code}
                    onChange={(e) =>
                      setManufacturerDraft((prev) => ({
                        ...prev,
                        postal_code: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label={t("formCity", locale)}
                    value={manufacturerDraft.city}
                    onChange={(e) =>
                      setManufacturerDraft((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                  />
                  <div className="tablet:col-span-2">
                    <Input
                      label={t("formEmailContact", locale)}
                      value={manufacturerDraft.contact_email}
                      onChange={(e) =>
                        setManufacturerDraft((prev) => ({
                          ...prev,
                          contact_email: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <Input
                    label={t("formPhoneOptional", locale)}
                    value={manufacturerDraft.contact_phone}
                    onChange={(e) =>
                      setManufacturerDraft((prev) => ({
                        ...prev,
                        contact_phone: e.target.value,
                      }))
                    }
                  />
                  <div className="tablet:col-span-2 flex gap-2">
                    {showNewManufacturer ? (
                      <Button
                        size="sm"
                        type="button"
                        onClick={handleCreateManufacturer}
                      >
                        {t("commonSave", locale)}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        type="button"
                        onClick={handleUpdateManufacturer}
                      >
                        {t("commonSave", locale)}
                      </Button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <label className="block text-[11px] font-semibold text-wf-700">
              {t("pdpProductionLocation", locale)}
              <select
                className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs"
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                disabled={!selectedBrandId}
              >
                <option value="">
                  {selectedBrandId
                    ? t("pdpSelectLocation2", locale)
                    : t("pdpSelectBrandFirst", locale)}
                </option>
                {selectableFacilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                    {facility.country_code ? ` — ${facility.country_code}` : ""}
                    {facility.is_active === false ? ` (${t("pdpDeactivated", locale)})` : ""}
                  </option>
                ))}
              </select>
            </label>
            {!selectedBrandId ? (
              <p className="text-[11px] text-wf-600">{t("pdpSelectBrandFirst", locale)}</p>
            ) : activeFacilitiesForBrand.length === 0 ? (
              <p className="text-[11px] text-wf-600">
                {t("pdpNoBrandLocations", locale)}{" "}
                <Link
                  href="/seller/brands"
                  className="underline"
                  onClick={(e) => {
                    if (
                      informationDirty &&
                      !window.confirm(
                        t("pdpUnsavedConfirm", locale)
                      )
                    ) {
                      e.preventDefault()
                    }
                  }}
                >
                  {t("sellerNavBrands", locale)}
                </Link>
                .
              </p>
            ) : null}

            <dl className="space-y-1 text-[11px] text-wf-800">
              <div>
                <dt className="text-wf-500">{t("pdpMieStatusLabel", locale)}</dt>
                <dd>
                  {mie?.is_made_in_europe_score ? t("pdpQualifies", locale) : t("pdpQualifiesNot", locale)}
                  {" · "}
                  {t("pdpVerified", locale)} {mie?.is_made_in_europe_verified ? t("pdpYes", locale) : t("pdpNo", locale)}
                  {" · "}
                  Review {complianceReviewLabel(product.completeness, locale).label}
                </dd>
              </div>
              <div>
                <dt className="text-wf-500">{t("pdpScoreLabel", locale)}</dt>
                <dd className="font-semibold">
                  {typeof mie?.score?.score === "number" ? mie.score.score : "—"}
                </dd>
              </div>
            </dl>

            <div className="grid gap-3 tablet:grid-cols-2">
              {ceMarkingField ? (
                <AttributeFieldEditor
                  field={ceMarkingField}
                  value={attrDraft[ceMarkingField.id] || ""}
                  onChange={(next) =>
                    setAttrDraft((prev) => ({
                      ...prev,
                      [ceMarkingField.id]: next,
                    }))
                  }
                  openHintCode={openHintCode}
                  onToggleHint={setOpenHintCode}
                />
              ) : null}
            </div>

            <UnifiedComplianceEvidenceSection
              productId={productId}
              evidence={mie?.evidence}
              ceRequired={ceMarkingVisible}
              dataRequired={collectsDataYes}
              mieRequired
              locale={locale}
              onChanged={() => void refreshCompliance()}
              onError={setError}
              onNotice={setNotice}
              dataProcessingControl={
                collectsDataField ? (
                  <div className="mt-2">
                    <p className="text-[11px] text-wf-600">
                      {t("complianceDataHint", locale)}
                    </p>
                    <div className="mt-2 flex gap-2">
                      {(["Nee", "Ja"] as const).map((opt) => {
                        const selected =
                          (attrDraft[collectsDataField.id] || "").trim() === opt
                        return (
                          <button
                            key={opt}
                            type="button"
                            className={`h-8 rounded px-3 text-xs font-semibold ${
                              selected
                                ? "bg-wf-900 text-white"
                                : "border border-wf-400 bg-white text-wf-800"
                            }`}
                            onClick={() =>
                              setAttrDraft((prev) => ({
                                ...prev,
                                [collectsDataField.id]: opt,
                              }))
                            }
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null
              }
            />

            <div className="mt-4">
              <EuropeanOwnershipSection productId={productId} />
            </div>

            {extraComplianceFields.length > 0 ? (
              <div className="grid gap-2 tablet:grid-cols-2">
                {extraComplianceFields.map((field) => (
                  <AttributeFieldEditor
                    key={field.id}
                    field={field}
                    value={attrDraft[field.id] || ""}
                    onChange={(next) =>
                      setAttrDraft((prev) => ({
                        ...prev,
                        [field.id]: next,
                      }))
                    }
                    openHintCode={openHintCode}
                    onToggleHint={setOpenHintCode}
                  />
                ))}
              </div>
            ) : null}

            <Link href="/seller/gpsr" className="inline-block text-[11px] underline">
              {t("pdpGpsrLink", locale)}
            </Link>
          </section>

          <div className="sticky bottom-0 z-10 -mx-1 border-t border-wf-300 bg-white/95 px-1 py-2 backdrop-blur">
            <div className="flex flex-wrap gap-2">
              {canEditCatalog ? (
                <Button size="sm" onClick={saveInformation} disabled={saving}>
                  {saving ? t("pdpSaving", locale) : t("commonSave", locale)}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (canEditCatalog) void saveInformation()
                  setTab("translations")
                }}
              >
                Volgende: vertalingen
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="space-y-3">
          <p className="text-[11px] text-wf-600">
            {t("historyHint", locale)}
          </p>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["all", t("historyAll", locale)],
                ["compliance", "Compliance"],
                ["price", t("historyPrice", locale)],
                ["variants", t("historyVariants", locale)],
                ["media", "Media"],
                ["rest", t("historyRest", locale)],
              ] as Array<[HistoryFilter, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setHistoryFilter(key)
                  setSelectedChangeId(null)
                }}
                className={`rounded px-2 py-1 text-[11px] font-semibold ${
                  historyFilter === key
                    ? "bg-wf-900 text-white"
                    : "bg-wf-100 text-wf-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {filteredChanges.length === 0 ? (
            <p className="text-xs text-wf-600">Geen wijzigingen in dit filter.</p>
          ) : (
            <div className="grid gap-3 tablet:grid-cols-2">
              <div className="space-y-2">
                {filteredChanges.map((change) => (
                  <button
                    key={change.id}
                    type="button"
                    onClick={() => setSelectedChangeId(change.id)}
                    className={`w-full rounded border px-3 py-2 text-left text-xs ${
                      selectedChangeId === change.id
                        ? "border-wf-900 bg-wf-50"
                        : "border-wf-300 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">
                        {change.field_label || change.field_code}
                      </span>
                      <span className="text-[10px] text-wf-500">
                        {new Date(change.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-wf-500">
                      {historyCategory(change.field_code)}
                    </p>
                  </button>
                ))}
              </div>
              <div className="rounded border border-wf-300 bg-white px-3 py-2 text-xs">
                {selectedChange ? (
                  <>
                    <p className="font-semibold text-wf-900">
                      {selectedChange.field_label || selectedChange.field_code}
                    </p>
                    <p className="mt-1 text-[10px] text-wf-500">
                      {new Date(selectedChange.created_at).toLocaleString()} ·{" "}
                      {selectedChange.status}
                      {selectedChange.reason
                        ? ` · ${selectedChange.reason}`
                        : ""}
                    </p>
                    <p className="mt-2 text-wf-600">
                      Broncategorie:{" "}
                      <strong>{historyCategory(selectedChange.field_code)}</strong>
                    </p>
                    <p className="mt-2 text-wf-600">
                      Oud:{" "}
                      <span className="text-wf-800">
                        {selectedChange.old_value || "—"}
                      </span>
                    </p>
                    <p className="text-wf-600">
                      Nieuw:{" "}
                      <span className="text-wf-800">
                        {selectedChange.new_value || "—"}
                      </span>
                    </p>
                    <Button
                      size="sm"
                      className="mt-3"
                      variant="secondary"
                      onClick={() => {
                        const code = selectedChange.field_code
                        setTab(
                          tabForFieldCode(code),
                          code.startsWith("gpsr_") ? "compliance" : null
                        )
                      }}
                    >
                      Ga naar veld
                    </Button>
                  </>
                ) : (
                  <p className="text-wf-500">Selecteer een wijziging voor detail.</p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {tab === "offer" ? (
        <div className="space-y-3">
          <div className="rounded border border-wf-300 bg-white p-3 text-xs">
            <p className="font-semibold text-wf-900">
              {sales.label.toLowerCase().includes("geblokkeerd") ||
              product.completeness?.sale_presentation === "blocked"
                ? "Verkoop blokkeert publicatie"
                : "Verkoopstatus"}
            </p>
            <ul className="mt-2 space-y-1 text-[11px]">
              {(product.completeness?.sale_blocked_reasons || [])
                .filter(
                  (r) =>
                    !r.toLowerCase().includes("veiligheid") &&
                    !r.toLowerCase().includes("safety")
                )
                .map((reason) => (
                  <li key={reason} className="text-red-800">
                    ❌ {reason}
                    {reason.toLowerCase().includes("verzend") ? (
                      <button
                        type="button"
                        className="ml-2 underline"
                        onClick={() => setTab("shipping")}
                      >
                        Naar verzending
                      </button>
                    ) : null}
                    {reason.toLowerCase().includes("hoofdafbeelding") ||
                    reason.toLowerCase().includes("media") ? (
                      <button
                        type="button"
                        className="ml-2 underline"
                        onClick={() => setTab("media")}
                      >
                        Naar media
                      </button>
                    ) : null}
                  </li>
                ))}
              {(product.completeness?.sale_blocked_reasons || []).filter(
                (r) =>
                  !r.toLowerCase().includes("veiligheid") &&
                  !r.toLowerCase().includes("safety")
              ).length === 0 ? (
                <li className="text-emerald-800">✅ Verkoopvoorwaarden in orde</li>
              ) : null}
              {product.offer?.has_offer || (product.offers?.offer_count ?? 0) > 0 ? (
                <li className="text-emerald-800">✅ Verkoopaanbod aanwezig</li>
              ) : (
                <li className="text-red-800">❌ Verkoopaanbod ontbreekt</li>
              )}
            </ul>
          </div>

          <div className="rounded border border-wf-300 bg-white p-3 text-xs">
            <p className="font-semibold text-wf-900">
              Seller offer · gescheiden van cataloguspublicatie
            </p>
            <p className="mt-1 text-[11px] text-wf-600">
              Publicatie: <strong>{pub.label}</strong> · Verkoop:{" "}
              <strong>{sales.label}</strong>
            </p>
            {(product.offers?.offer_count ?? 0) > 1 ? (
              <p className="mt-1 text-[11px] text-wf-600">
                Dit product heeft {product.offers?.offer_count} offers. Selecteer
                een variant-offer hieronder of via Varianten.
              </p>
            ) : null}
          </div>

          {offersForSelectedIdentifier.length > 1 ||
          variantOfferRows.some((r) => r.offers.length > 0) ? (
            <div className="flex flex-wrap gap-2">
              {variantOfferRows
                .flatMap((r) =>
                  r.offers.map((o) => ({
                    key: o.offer_id || `${r.variantId}-${o.region_code}`,
                    label: `${r.variantLabel} · ${o.region_code || "?"}`,
                    offer: o,
                  }))
                )
                .map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => selectOffer(item.offer)}
                    className={`rounded border px-2 py-1 text-[11px] ${
                      selectedOfferId === item.offer.offer_id
                        ? "border-wf-900 bg-wf-900 text-white"
                        : "border-wf-400 bg-white text-wf-800"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
            </div>
          ) : null}

          {!offerDraft ? (
            <p className="text-xs text-wf-600">
              Geen identifier beschikbaar — maak eerst een variant/EAN aan.
            </p>
          ) : (
            <div className="rounded border border-wf-300 bg-white p-3">
              <div className="grid gap-3 tablet:grid-cols-2">
                <div>
                  <div className="mb-1 flex items-center gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                      {t("vpRegularPrice", locale)}
                    </span>
                    <button
                      type="button"
                      title={t("offerPriceHint", locale)}
                      aria-label={t("offerPriceExplain", locale)}
                      onClick={() =>
                        setOpenHintCode(
                          openHintCode === "price_regular" ? null : "price_regular"
                        )
                      }
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-wf-400 text-[9px] font-bold text-wf-600"
                    >
                      i
                    </button>
                  </div>
                  {openHintCode === "price_regular" ? (
                    <p className="mb-1 rounded border border-wf-300 bg-wf-50 p-2 text-[11px] text-wf-700">
                      {t("offerSinglePriceHint", locale)}
                    </p>
                  ) : null}
                  <Input
                    value={regularPriceDraft}
                    onChange={(e) => {
                      setRegularPriceDraft(e.target.value)
                      setOfferDraft({ ...offerDraft, base_price: e.target.value })
                    }}
                  />
                </div>

                <div>
                  <Input
                    label={t("offerPromoLabel", locale)}
                    value={offerDraft.promo_price}
                    disabled={offerDraft.clear_promo}
                    onChange={(e) =>
                      setOfferDraft({
                        ...offerDraft,
                        promo_price: e.target.value,
                        clear_promo: false,
                      })
                    }
                  />
                  <div className="mt-2 grid gap-2 tablet:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                        {t("vpPromoStart", locale)}
                      </label>
                      <input
                        type="datetime-local"
                        className="h-9 w-full rounded-[5px] border border-wf-400 bg-white px-2 text-xs text-wf-800 disabled:bg-wf-50"
                        value={offerDraft.promo_starts_at}
                        disabled={offerDraft.clear_promo}
                        onChange={(e) =>
                          setOfferDraft({
                            ...offerDraft,
                            promo_starts_at: e.target.value,
                            clear_promo: false,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                        {t("vpPromoEnd", locale)}
                      </label>
                      <input
                        type="datetime-local"
                        className="h-9 w-full rounded-[5px] border border-wf-400 bg-white px-2 text-xs text-wf-800 disabled:bg-wf-50"
                        value={offerDraft.promo_ends_at}
                        disabled={offerDraft.clear_promo}
                        onChange={(e) =>
                          setOfferDraft({
                            ...offerDraft,
                            promo_ends_at: e.target.value,
                            clear_promo: false,
                          })
                        }
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    type="button"
                    onClick={() =>
                      setOfferDraft({
                        ...offerDraft,
                        clear_promo: true,
                        promo_price: "",
                        promo_starts_at: "",
                        promo_ends_at: "",
                      })
                    }
                  >
                    {t("vpClearPromo", locale)}
                  </Button>
                </div>

                <div>
                  <Input
                    label="BTW (%)"
                    value={String(
                      Math.round(
                        resolveDestinationVatRate(offerDraft.region_code) * 100
                      )
                    )}
                    disabled
                  />
                  <p className="mt-0.5 text-[10px] text-wf-500">
                    {t("vatAutoByMarket", locale)} ({offerDraft.region_code})
                  </p>
                </div>
                <Input
                  label="Seller SKU"
                  value={offerDraft.seller_sku}
                  onChange={(e) =>
                    setOfferDraft({ ...offerDraft, seller_sku: e.target.value })
                  }
                />
                <div className="rounded border border-wf-200 bg-wf-50 p-2 text-[11px] text-wf-700 tablet:col-span-2">
                  <p>
                    {t("offerEffectivePrice", locale)}
                    <strong>
                      {pricingPreview?.customer != null
                        ? formatEuro(pricingPreview.customer)
                        : "—"}
                    </strong>
                    {pricingPreview?.promoActive ? t("offerPromoTag", locale) : t("offerRegularTag", locale)}
                  </p>
                  {pricingPreview?.promoActive &&
                  pricingPreview.discountAmount != null ? (
                    <p className="mt-1 font-semibold text-emerald-800">
                      {t("offerDiscount", locale)}{formatEuro(pricingPreview.discountAmount)}
                      {pricingPreview.discountPercent != null
                        ? ` (${pricingPreview.discountPercent.toFixed(0)}%)`
                        : ""}
                    </p>
                  ) : null}
                  <p className="mt-1">
                    {t("offerNetComponent", locale)}
                    <strong>
                      {pricingPreview?.productNet != null
                        ? formatEuro(pricingPreview.productNet)
                        : "—"}
                    </strong>
                  </p>
                  <p className="mt-1 text-[10px] text-wf-500">
                    {t("offerBuyBoxHint", locale)}
                  </p>
                </div>

                <div>
                  <Input
                    label={t("offerRegionMarket", locale)}
                    value={offerDraft.region_code}
                    disabled
                  />
                  <p className="mt-0.5 text-[10px] text-wf-500">
                    Markt is vastgelegd bij aanmaken van het offer en blijft
                    read-only.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded border border-wf-200 bg-wf-50 p-3">
                <h3 className="text-xs font-bold text-wf-900">Markten</h3>
                <p className="mt-1 text-[11px] text-wf-600">
                  Alle offers voor deze identifier (EAN) in verschillende
                  regio&apos;s.
                </p>
                {offersForSelectedIdentifier.length === 0 ? (
                  <p className="mt-2 text-[11px] text-wf-500">
                    Nog geen markten voor deze identifier.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1 text-[11px]">
                    {offersForSelectedIdentifier.map((mo) => (
                      <li key={mo.offer_id || mo.region_code || ""}>
                        <button
                          type="button"
                          className={`underline ${
                            selectedOfferId === mo.offer_id
                              ? "font-bold text-wf-900"
                              : "text-wf-700"
                          }`}
                          onClick={() => selectOffer(mo)}
                        >
                          {mo.region_code || "—"}
                          {mo.price != null ? ` · ${formatEuro(mo.price)}` : ""}
                          {mo.sales_status ? ` · ${mo.sales_status}` : ""}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-wf-700">
                      + Markt toevoegen
                    </label>
                    <select
                      className="h-9 rounded border border-wf-400 bg-white px-2 text-xs"
                      value={addMarketCode}
                      onChange={(e) => setAddMarketCode(e.target.value)}
                    >
                      <option value="">Kies land…</option>
                      {EU_MARKET_CODES.filter(
                        (code) =>
                          !offersForSelectedIdentifier.some(
                            (o) =>
                              (o.region_code || "").toUpperCase() === code
                          )
                      ).map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    size="sm"
                    disabled={marketBusy || !addMarketCode || !offerDraft.identifier_id}
                    onClick={() => void addMarketOffer()}
                  >
                    Toevoegen
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-wf-600">Verkoopstatus:</span>
                <select
                  className="h-8 rounded border border-wf-400 bg-white px-2 text-xs"
                  value={offerDraft.sales_status}
                  onChange={(e) =>
                    setOfferDraft({
                      ...offerDraft,
                      sales_status: e.target.value as "active" | "paused",
                    })
                  }
                >
                  <option value="active">{t("vpActiveForSale", locale)}</option>
                  <option value="paused">{t("statusPaused", locale)}</option>
                </select>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={saveOffer} disabled={offerSaving}>
                  {offerSaving ? `${t("commonSave", locale)}…` : t("offerSaveBtn", locale)}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setTab("shipping")}
                >
                  Volgende: voorraad & verzending
                </Button>
                {offerDraft.offer_id && offerDraft.sales_status === "active" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={offerSaving}
                    onClick={() => pauseOrResume("paused")}
                  >
                    {t("pdpPause", locale)}
                  </Button>
                ) : null}
                {offerDraft.offer_id && offerDraft.sales_status === "paused" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={offerSaving}
                    onClick={() => pauseOrResume("active")}
                  >
                    {t("pdpResume", locale)}
                  </Button>
                ) : null}
              </div>
              <p className="mt-2 text-[10px] text-wf-500">
                {t("offerPauseHint", locale)}
              </p>
            </div>
          )}
        </div>
      ) : null}

      {tab === "shipping" && product && product !== "loading" ? (
        <ProductShippingStep
          product={product}
          productId={productId}
          offerDraft={offerDraft}
          onQuantityChange={(value) =>
            setOfferDraft((prev) =>
              prev ? { ...prev, quantity_available: value } : prev
            )
          }
          onReload={load}
          onSaveStock={saveShipping}
          stockSaving={offerSaving}
        />
      ) : null}

      {tab === "media" ? (
        <div className="space-y-3">
          <div className="rounded border border-wf-200 bg-wf-50 p-3 text-[11px] text-wf-700">
            <p className="font-semibold text-wf-900">{t("mediaGuidelines", locale)}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>{t("mediaPrimaryHint", locale)}</li>
              <li>{t("mediaGalleryHint", locale)}</li>
              <li>{t("mediaMaxSize", locale)}</li>
              <li>{t("mediaVideoHint", locale)}</li>
            </ul>
          </div>

          {canProposeChange ? (
            <div className="rounded border border-wf-300 bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-xs font-bold text-wf-900">{t("pdpTabMedia", locale)}</h2>
                  <p className="mt-1 text-[11px] text-wf-600">
                    Live productmedia blijven ongewijzigd. Upload een
                    voorgestelde afbeelding; die wordt pas toegevoegd na
                    goedkeuring.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => openPropose("media", "")}
                >
                  Wijziging voorstellen
                </Button>
              </div>
              {proposeSection === "media" ? (
                <ProposeInlineForm
                  sectionLabel="Media"
                  proposedValue={proposedValue}
                  toelichting={proposeToelichting}
                  busy={proposeBusy}
                  onProposedValueChange={setProposedValue}
                  onToelichtingChange={setProposeToelichting}
                  onSubmit={(e) => void submitPropose(e)}
                  onCancel={() => {
                    setProposeSection(null)
                    setProposeMediaRefs([])
                  }}
                  mediaMode
                  onFileChange={(f) => void handleProposeMediaFile(f)}
                  stagedRefs={proposeMediaRefs}
                  stagedPreviewUrls={proposeMediaRefs.map((ref) =>
                    resolveSellerMediaUrl(ref)
                  )}
                  uploadBusy={proposeUploadBusy}
                />
              ) : null}
            </div>
          ) : (
            <>
          <div className="rounded border border-wf-300 bg-white p-3">
            <h2 className="text-xs font-bold text-wf-900">{t("mediaUploadFile", locale)}</h2>
            <div className="mt-2 grid gap-2 tablet:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                  {t("mediaUploadType", locale)}
                </label>
                <select
                  className="h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs"
                  value={uploadMediaType}
                  onChange={(e) =>
                    setUploadMediaType(
                      e.target.value as "Hoofdafbeelding" | "Overige afbeelding"
                    )
                  }
                >
                  <option value="Hoofdafbeelding">{t("pdpPrimaryImage", locale)}</option>
                  <option value="Overige afbeelding">{t("pdpOtherImage", locale)}</option>
                </select>
              </div>
              <div className="flex items-end">
                <p className="text-[10px] text-wf-600">{t("mediaAutoOptimize", locale)}</p>
              </div>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
              className="mt-2 block w-full text-xs"
              disabled={mediaBusy}
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                e.target.value = ""
                void handleMediaUpload(file)
              }}
            />
          </div>

          <div className="rounded border border-wf-300 bg-white p-3">
            <h2 className="text-xs font-bold text-wf-900">{t("mediaAddUrl", locale)}</h2>
            <div className="mt-2 grid gap-2 tablet:grid-cols-[1fr_auto_auto]">
              <Input
                label={t("mediaImageUrlLabel", locale)}
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://…"
              />
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                  {t("mediaImageTypeLabel", locale)}
                </label>
                <select
                  className="h-9 rounded border border-wf-400 bg-white px-2 text-xs"
                  value={uploadMediaType}
                  onChange={(e) =>
                    setUploadMediaType(
                      e.target.value as "Hoofdafbeelding" | "Overige afbeelding"
                    )
                  }
                >
                  <option value="Hoofdafbeelding">{t("pdpPrimaryImage", locale)}</option>
                  <option value="Overige afbeelding">{t("pdpOtherImage", locale)}</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  size="sm"
                  disabled={mediaBusy}
                  onClick={() => void handleImageUrlAdd()}
                >
                  {t("commonAdd", locale)}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded border border-wf-300 bg-white p-3">
            <h2 className="text-xs font-bold text-wf-900">{t("mediaAddVideo", locale)}</h2>
            <div className="mt-2 grid gap-2 tablet:grid-cols-[1fr_auto]">
              <Input
                label={t("mediaVideoUrlLabel", locale)}
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
              />
              <div className="flex items-end">
                <Button
                  size="sm"
                  disabled={mediaBusy}
                  onClick={() => void handleVideoUrlAdd()}
                >
                  {t("commonAdd", locale)}
                </Button>
              </div>
            </div>
            <p className="mt-1 text-[10px] text-wf-600">{t("mediaVideoHint", locale)}</p>
          </div>
            </>
          )}

          <p className="text-[10px] text-wf-600">{t("mediaThumbsHint", locale)}</p>
          <div className="grid max-w-xl grid-cols-5 gap-1 tablet:grid-cols-7 desktop:grid-cols-8">
            {sortedMedia.length === 0 ? (
              <p className="text-xs text-wf-600">{t("mediaNoMedia", locale)}</p>
            ) : (
              sortedMedia.map((m) => {
                const isPrimary =
                  m.media_type === "Hoofdafbeelding" ||
                  m.storage_reference === product.primary_image_url
                const video = isVideoMedia(
                  m.media_type,
                  m.storage_reference,
                  m.mime_type,
                  (m as { metadata?: Record<string, unknown> | null }).metadata
                )
                const embedUrl = videoEmbedUrl(
                  (m as { metadata?: Record<string, unknown> | null }).metadata
                )
                return (
                  <div
                    key={m.id}
                    draggable={canEditCatalog && !video}
                    onDragStart={() => {
                      if (canEditCatalog) setDragMediaId(m.id)
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (canEditCatalog && dragMediaId)
                        void handleMediaReorder(dragMediaId, m.id)
                    }}
                    className={`rounded border bg-white p-1 ${
                      isPrimary ? "border-em-green ring-1 ring-em-green/40" : "border-wf-300"
                    }`}
                  >
                    {video ? (
                      <div className="aspect-square w-full overflow-hidden rounded bg-wf-50">
                        {embedUrl ? (
                          <iframe
                            src={embedUrl}
                            title="Productvideo"
                            className="h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <video
                            src={resolveSellerMediaUrl(
                              m.storage_reference,
                              (m as { metadata?: Record<string, unknown> | null })
                                .metadata
                            )}
                            className="h-full w-full object-contain"
                            controls
                            muted
                          />
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="aspect-square w-full overflow-hidden rounded bg-wf-50"
                        onClick={() =>
                          window.open(
                            resolveSellerMediaUrl(
                              m.storage_reference,
                              (m as { metadata?: Record<string, unknown> | null })
                                .metadata
                            ),
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveSellerMediaUrl(
                            m.storage_reference,
                            (m as { metadata?: Record<string, unknown> | null })
                              .metadata
                          )}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      </button>
                    )}
                    <p className="mt-0.5 truncate text-[9px] text-wf-600">
                      {m.media_type === "Hoofdafbeelding"
                        ? t("pdpPrimaryImage", locale)
                        : m.media_type === "Overige afbeelding"
                          ? t("pdpOtherImage", locale)
                          : t("pdpVideo", locale)}
                      {isPrimary ? ` · ${t("mediaPrimaryBadge", locale)}` : ""}
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {canEditCatalog && !isPrimary && !video ? (
                        <button
                          type="button"
                          disabled={mediaBusy}
                          className="text-[9px] font-semibold underline disabled:opacity-50"
                          onClick={() => void handleMediaPrimary(m.id)}
                        >
                          {t("mediaMakePrimary", locale)}
                        </button>
                      ) : null}
                      {canEditCatalog ? (
                      <button
                        type="button"
                        disabled={mediaBusy}
                        className="text-[9px] font-semibold text-red-700 underline disabled:opacity-50"
                        onClick={() => void handleMediaDelete(m.id)}
                      >
                        {t("vpDelete", locale)}
                      </button>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
            {(product.documents || []).length > 0 ? (
              <section className="mt-4 rounded border border-wf-200 bg-wf-50 p-3">
                <h3 className="text-xs font-bold text-wf-900">
                  Compliance documenten (geen storefront-media)
                </h3>
                <div className="mt-2 grid gap-2 tablet:grid-cols-2">
                  {(product.documents || []).map((d) => (
                    <div
                      key={d.id}
                      className="rounded border border-wf-300 bg-white p-2 text-xs"
                    >
                      <p className="font-semibold">{d.document_type}</p>
                      <a
                        href={resolveSellerMediaUrl(d.storage_reference)}
                        className="text-[11px] underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Document openen
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setTab("compliance")}>
              Volgende: compliance
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "translations" ? (
        <div className="rounded border border-wf-300 bg-white p-3 text-xs">
          <div className="flex items-start gap-2">
            <p className="flex-1 text-wf-700">
              Vertalingen maken je product vindbaar in andere Europese markten.
              Vul per taal een titel en beschrijving in, of laat teksten
              automatisch vertalen zodra dat beschikbaar is.
            </p>
            <button
              type="button"
              title="Vertalingen worden per taal opgeslagen naast de Nederlandse brontekst. AI-vertaling vult lege velden aan; je kunt alles handmatig aanpassen."
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-wf-400 text-[10px] font-bold text-wf-600"
            >
              i
            </button>
          </div>
          <p className="mt-2 text-[11px] text-wf-500">
            Vertalingen worden beschikbaar zodra DeepL gekoppeld is.
          </p>
          <Link
            href={`/seller/products/${product.id}/translations`}
            className="mt-3 inline-flex h-8 items-center rounded-[5px] bg-wf-900 px-3 text-xs font-semibold text-white"
          >
            Vertalingen beheren
          </Link>
          <div className="mt-3">
            <Button size="sm" variant="secondary" onClick={() => setTab("publish")}>
              Volgende: publiceren
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "publish" ? (
        <div className="space-y-4">
          <PublicationReadinessCards
            product={product}
            onOpenStep={(step) => setTab(step)}
          />

          {product.completeness?.publishable ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
              Je product is compleet.
            </p>
          ) : null}

          {product.approval_rejection_reason ? (
            <p className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-900">
              {product.admin_review_outcome === "needs_info"
                ? "Aanvulling gevraagd: "
                : t("pubRejectedLabel", locale)}
              {product.approval_rejection_reason}
            </p>
          ) : null}

          {Array.isArray(product.section_reviews) &&
          product.section_reviews.some(
            (s) =>
              s.status === "needs_info" ||
              s.status === "rejected" ||
              (s.status === "unreviewed" && !!s.comment)
          ) ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="mb-2 font-semibold">Beoordeling per onderdeel</p>
              <ul className="space-y-2 text-xs">
                {product.section_reviews.map((s) => {
                  if (s.status === "ok") {
                    return (
                      <li key={s.section_key}>
                        ✓ {s.label_nl || s.section_key}
                      </li>
                    )
                  }
                  if (s.status === "needs_info") {
                    return (
                      <li key={s.section_key}>
                        ⚠ {s.label_nl || s.section_key} — Aanvulling gevraagd
                        {s.comment ? (
                          <span className="mt-0.5 block text-amber-900">
                            {s.comment}
                          </span>
                        ) : null}
                      </li>
                    )
                  }
                  if (s.status === "unreviewed" && s.comment) {
                    return (
                      <li key={s.section_key} className="text-blue-900">
                        ↻ {s.label_nl || s.section_key} — Aanvulling ingediend,
                        wacht op beoordeling
                        <span className="mt-0.5 block text-amber-900">
                          Eerdere opmerking: {s.comment}
                        </span>
                      </li>
                    )
                  }
                  if (s.status === "rejected") {
                    return (
                      <li key={s.section_key}>
                        ✕ {s.label_nl || s.section_key} — Afgewezen
                        {s.comment ? (
                          <span className="mt-0.5 block text-amber-900">
                            {s.comment}
                          </span>
                        ) : null}
                      </li>
                    )
                  }
                  return null
                })}
              </ul>
            </div>
          ) : null}

          {product.publication_status === "In review" ? (
            <p className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900">
              {t("pubAwaitingApproval", locale)}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {product.actions?.submit_for_approval && product.version_id ? (
              <Button
                size="sm"
                disabled={publishBusy || !product.completeness?.publishable}
                onClick={() => void handleSubmitForApproval()}
              >
                {publishBusy ? t("pubSubmitting", locale) : "Product publiceren"}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => router.push("/seller/products/new")}
            >
              Nog een product toevoegen
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => router.push("/seller/products")}
            >
              Terug naar productoverzicht
            </Button>
          </div>
        </div>
      ) : null}
    </SellerGate>
  )
}
