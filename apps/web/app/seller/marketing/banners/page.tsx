"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AdCampaignLandingPreview,
  AD_CAMPAIGN_DESIGNS,
  Badge,
  Button,
  Input,
  Notice,
} from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { DashboardSection } from "../../_components/dashboard-section"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../../_lib/i18n/locales"
import { t, type StorefrontLocale } from "../../../_lib/i18n/messages"
import { statusLabel as campaignStatusLabel } from "../../../_lib/i18n/status-labels"
import { medusaBackendUrl } from "../../../_lib/medusa-backend-url"
import {
  listOwnProducts,
  type CatalogProduct,
} from "../../_lib/product-cloud-api"

type Placement = "homepage" | "category" | "search"
type WeekSlot = {
  week_start: string
  week_end: string
  markets: Record<string, { available: boolean; price: number }>
}
type Category = { id: string; name: string; slug: string | null }
type Campaign = {
  id: string
  name: string
  placement: string
  target_type: string
  target_value: string | null
  markets: string[]
  status: string
  total_price: number
  destination_url: string
  image_url: string | null
  headline: string | null
  subline: string | null
  cta_key: string
  design_key: string
  product_ids: string[]
  campaign_slug: string | null
  seller_public_slug: string | null
  admin_note: string | null
  weeks: Array<{
    market_code: string
    week_start: string
    week_end: string
    week_price: number
  }>
  created_at: string
}
type Brand = { id: string; name: string; logo_url: string | null }

const PLACEMENTS: Placement[] = ["homepage", "category", "search"]

const MARKET_OPTIONS = [
  { code: "NL", label: "Nederland" },
  { code: "BE", label: "België" },
  { code: "DE", label: "Duitsland" },
  { code: "FR", label: "Frankrijk" },
  { code: "AT", label: "Österreich" },
]

const CTA_OPTIONS = [
  { key: "view_product", nl: "Bekijk product", en: "View product", de: "Produkt ansehen", fr: "Voir le produit" },
  { key: "more_info", nl: "Meer informatie", en: "More information", de: "Mehr erfahren", fr: "En savoir plus" },
  { key: "discover", nl: "Ontdek het product", en: "Discover the product", de: "Produkt entdecken", fr: "Découvrir le produit" },
  { key: "view_now", nl: "Nu bekijken", en: "View now", de: "Jetzt ansehen", fr: "Voir maintenant" },
  { key: "view_offer", nl: "Bekijk aanbieding", en: "View offer", de: "Angebot ansehen", fr: "Voir l'offre" },
]

const BANNER_RATIO = "4:1"
const BANNER_REC_W = 2400
const BANNER_REC_H = 600

function placementLabel(p: string, locale: StorefrontLocale): string {
  if (p === "homepage") return t("adPlacementHomepage", locale)
  if (p === "category") return t("adPlacementCategory", locale)
  if (p === "search") return t("adPlacementSearch", locale)
  return p
}

function ctaLabel(key: string, locale: StorefrontLocale): string {
  const opt = CTA_OPTIONS.find((c) => c.key === key)
  if (!opt) return key
  if (locale === "de") return opt.de
  if (locale === "fr") return opt.fr
  if (locale === "en") return opt.en
  return opt.nl
}

function formatWeekRange(ws: string, we: string, intl: string): string {
  const s = new Date(ws)
  const e = new Date(we)
  return `${s.toLocaleDateString(intl, { day: "numeric", month: "short" })} – ${e.toLocaleDateString(intl, { day: "numeric", month: "short", year: "numeric" })}`
}

function weekKey(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  return d.toISOString().slice(0, 10)
}

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

async function apiFetch(path: string, opts?: RequestInit) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
    ...(opts?.headers as Record<string, string> | undefined),
  }
  return fetch(`${medusaBackendUrl()}${path}`, { ...opts, headers, credentials: "include" })
}

async function apiUpload(path: string, formData: FormData) {
  const headers: Record<string, string> = {
    ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
  }
  return fetch(`${medusaBackendUrl()}${path}`, {
    method: "POST",
    body: formData,
    headers,
    credentials: "include",
  })
}

export default function SellerBannerCampaignsPage() {
  const locale = useStorefrontLocale()
  const intl = storefrontIntlLocale(locale)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [weekSlots, setWeekSlots] = useState<WeekSlot[]>([])
  const [brands, setBrands] = useState<Brand[]>([])

  const [name, setName] = useState("")
  const [placement, setPlacement] = useState<Placement>("homepage")
  const [targetValue, setTargetValue] = useState("")
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([])
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>([])
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [headline, setHeadline] = useState("")
  const [subline, setSubline] = useState("")
  const [ctaKey, setCtaKey] = useState("view_product")
  const [designKey, setDesignKey] = useState("design_1")
  const [useBrandLogo, setUseBrandLogo] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [formNote, setFormNote] = useState<{ type: "info" | "error"; msg: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRejectionNote, setEditRejectionNote] = useState<string | null>(null)
  const skipPlacementResetRef = useRef(false)
  const pendingWeekKeysRef = useRef<string[] | null>(null)

  const [productQuery, setProductQuery] = useState("")
  const [productHits, setProductHits] = useState<CatalogProduct[]>([])
  const [productSearchBusy, setProductSearchBusy] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<CatalogProduct[]>([])

  const activeBrandLogo = useMemo(() => {
    if (!useBrandLogo) return null
    const withLogo = brands.find((b) => b.logo_url)
    return withLogo?.logo_url ?? null
  }, [brands, useBrandLogo])

  const selectedProductIds = useMemo(
    () => selectedProducts.map((p) => p.id),
    [selectedProducts]
  )

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await apiFetch("/store/advertising/campaigns")
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const [catRes, brandRes] = await Promise.all([
          apiFetch("/store/product-cloud/categories"),
          apiFetch("/store/brands"),
        ])
        if (catRes.ok) {
          const data = await catRes.json()
          setCategories(data.categories || [])
        }
        if (brandRes.ok) {
          const data = await brandRes.json()
          setBrands(
            (data.brands || []).map((b: Record<string, unknown>) => ({
              id: b.id as string,
              name: (b.name as string) || "",
              logo_url: (b.logo_url as string) || null,
            }))
          )
        }
      } catch { /* noop */ }
    }
    load()
    loadCampaigns()
  }, [loadCampaigns])

  useEffect(() => {
    async function loadAvailability() {
      if (selectedMarkets.length === 0) {
        setWeekSlots([])
        return
      }
      const tv = placement === "category" || placement === "search" ? targetValue : ""
      const params = new URLSearchParams({
        placement,
        target_type: placement,
        target_value: tv,
        markets: selectedMarkets.join(","),
        weeks: "12",
      })
      try {
        const res = await apiFetch(`/store/advertising/availability?${params}`)
        if (res.ok) {
          const data = await res.json()
          setWeekSlots(data.weeks || [])
        }
      } catch { /* noop */ }
    }
    loadAvailability()
  }, [placement, targetValue, selectedMarkets])

  useEffect(() => {
    if (skipPlacementResetRef.current) {
      skipPlacementResetRef.current = false
      return
    }
    setTargetValue("")
    setSelectedWeeks([])
  }, [placement])

  useEffect(() => {
    const wanted = pendingWeekKeysRef.current
    if (!wanted?.length || weekSlots.length === 0) return
    const matched = weekSlots
      .filter((s) => wanted.includes(weekKey(s.week_start)))
      .map((s) => s.week_start)
    setSelectedWeeks(matched)
    pendingWeekKeysRef.current = null
  }, [weekSlots])

  useEffect(() => {
    let cancelled = false
    const handle = window.setTimeout(async () => {
      setProductSearchBusy(true)
      try {
        const res = await listOwnProducts({
          q: productQuery.trim() || undefined,
        })
        if (!cancelled) setProductHits(res.products || [])
      } catch {
        if (!cancelled) setProductHits([])
      } finally {
        if (!cancelled) setProductSearchBusy(false)
      }
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [productQuery])

  function resetFormFields() {
    setName("")
    setTargetValue("")
    setSelectedMarkets([])
    setSelectedWeeks([])
    setImageUrl(null)
    setHeadline("")
    setSubline("")
    setCtaKey("view_product")
    setDesignKey("design_1")
    setShowPreview(false)
    setEditingId(null)
    setEditRejectionNote(null)
    setSelectedProducts([])
    setProductQuery("")
    pendingWeekKeysRef.current = null
  }

  async function startEdit(c: Campaign) {
    skipPlacementResetRef.current = true
    setEditingId(c.id)
    setEditRejectionNote(
      typeof c.admin_note === "string" && c.admin_note.trim()
        ? c.admin_note.trim()
        : null
    )
    setName(c.name || "")
    setPlacement(
      (["homepage", "category", "search"].includes(c.placement)
        ? c.placement
        : "homepage") as Placement
    )
    setTargetValue(c.target_value || "")
    setSelectedMarkets(Array.isArray(c.markets) ? [...c.markets] : [])
    pendingWeekKeysRef.current = Array.from(
      new Set((c.weeks || []).map((w) => weekKey(w.week_start)))
    )
    setSelectedWeeks([])
    setImageUrl(c.image_url || null)
    setHeadline(c.headline || "")
    setSubline(c.subline || "")
    setCtaKey(c.cta_key || "view_product")
    setDesignKey(c.design_key || "design_1")
    setShowPreview(false)
    setFormNote(null)

    const ids = Array.isArray(c.product_ids) ? c.product_ids : []
    if (ids.length) {
      try {
        const res = await listOwnProducts()
        const map = new Map((res.products || []).map((p) => [p.id, p]))
        setSelectedProducts(
          ids.map((id) => map.get(id)).filter(Boolean) as CatalogProduct[]
        )
      } catch {
        setSelectedProducts([])
      }
    } else {
      setSelectedProducts([])
    }

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function toggleMarket(code: string) {
    setSelectedMarkets((prev) =>
      prev.includes(code) ? prev.filter((m) => m !== code) : [...prev, code]
    )
    setSelectedWeeks([])
  }

  function toggleWeek(ws: string) {
    setSelectedWeeks((prev) =>
      prev.includes(ws) ? prev.filter((w) => w !== ws) : [...prev, ws]
    )
  }

  function toggleProduct(p: CatalogProduct) {
    setSelectedProducts((prev) => {
      if (prev.some((x) => x.id === p.id)) {
        return prev.filter((x) => x.id !== p.id)
      }
      return [...prev, p]
    })
  }

  function weekFullyAvailable(slot: WeekSlot): boolean {
    return selectedMarkets.every((m) => slot.markets[m]?.available !== false)
  }

  const totalPrice = useMemo(() => {
    let total = 0
    for (const ws of selectedWeeks) {
      const slot = weekSlots.find((s) => s.week_start === ws)
      if (!slot) continue
      for (const m of selectedMarkets) {
        total += slot.markets[m]?.price ?? 0
      }
    }
    return total
  }, [selectedWeeks, weekSlots, selectedMarkets])

  const landingProducts = useMemo(
    () =>
      selectedProducts.map((p) => ({
        id: p.id,
        title: p.title,
        image_url: p.primary_image_url ?? null,
        href: null,
      })),
    [selectedProducts]
  )

  async function handleFileUpload(file: File) {
    setUploading(true)
    setFormNote(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await apiUpload("/store/advertising/media", fd)
      if (res.ok) {
        const data = await res.json()
        setImageUrl(data.url)
      } else {
        const err = await res.json().catch(() => ({}))
        setFormNote({
          type: "error",
          msg: (err as { message?: string }).message || t("adUploadFailed", locale),
        })
      }
    } catch {
      setFormNote({ type: "error", msg: t("adUploadFailed", locale) })
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit() {
    if (!name.trim()) { setFormNote({ type: "error", msg: t("adNameRequired", locale) }); return }
    if (selectedMarkets.length === 0) { setFormNote({ type: "error", msg: t("adMarketRequired", locale) }); return }
    if (placement === "category" && !targetValue) { setFormNote({ type: "error", msg: t("adCategoryRequired", locale) }); return }
    if (placement === "search" && !targetValue.trim()) { setFormNote({ type: "error", msg: t("adKeywordRequired", locale) }); return }
    if (selectedWeeks.length === 0) { setFormNote({ type: "error", msg: t("adWeekRequired", locale) }); return }
    if (selectedProductIds.length === 0) {
      setFormNote({ type: "error", msg: t("adProductsRequired", locale) })
      return
    }
    setFormNote(null)
    setShowPreview(true)
  }

  async function confirmSubmit() {
    setSubmitting(true)
    setFormNote(null)
    const payload = {
      name: name.trim(),
      placement,
      target_value: placement === "homepage" ? undefined : targetValue.trim(),
      markets: selectedMarkets,
      week_starts: selectedWeeks,
      image_url: imageUrl || undefined,
      headline: headline.trim() || undefined,
      subline: subline.trim() || undefined,
      cta_key: ctaKey,
      design_key: designKey,
      product_ids: selectedProductIds,
    }
    try {
      const res = editingId
        ? await apiFetch(
            `/store/advertising/campaigns/${encodeURIComponent(editingId)}`,
            { method: "PATCH", body: JSON.stringify(payload) }
          )
        : await apiFetch("/store/advertising/campaigns", {
            method: "POST",
            body: JSON.stringify(payload),
          })
      if (res.ok) {
        setFormNote({
          type: "info",
          msg: editingId
            ? t("adCampaignResubmitted", locale)
            : t("adCampaignCreated", locale),
        })
        resetFormFields()
        setPlacement("homepage")
        loadCampaigns()
      } else {
        const err = await res.json().catch(() => ({}))
        setFormNote({
          type: "error",
          msg:
            (err as { message?: string }).message ||
            t("adCampaignFailed", locale),
        })
      }
    } catch {
      setFormNote({ type: "error", msg: t("adCampaignFailed", locale) })
    } finally {
      setSubmitting(false)
    }
  }

  const selectClass = "h-9 w-full rounded-[5px] border border-wf-400 bg-white px-3 text-xs text-wf-800"
  const sellerPreviewName = t("adPreviewSellerName", locale)

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavMarketing", locale), href: "/seller/marketing" },
        { label: t("adBannerCampaigns", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">{t("adBannerCampaigns", locale)}</h1>
      <p className="mt-1.5 text-xs text-wf-600">{t("adBannerIntro", locale)}</p>

      <DashboardSection
        title={
          editingId
            ? t("adEditingRejected", locale)
            : t("adNewCampaign", locale)
        }
        wrapChildren={false}
      >
        <div className="mt-2 rounded-lg border border-wf-300 bg-white px-5 py-5 space-y-5">
          {editingId && editRejectionNote && (
            <Notice variant="destructive">
              <div className="font-semibold">{t("adRejectedByEuropmade", locale)}</div>
              <div className="mt-1">
                {t("adRejectionReason", locale)}: {editRejectionNote}
              </div>
            </Notice>
          )}
          {editingId && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  resetFormFields()
                  setPlacement("homepage")
                  setFormNote(null)
                }}
              >
                {t("adCancelEdit", locale)}
              </Button>
            </div>
          )}

          <Input
            label={t("adCampaignName", locale)}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("adCampaignNamePlaceholder", locale)}
            required
          />

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">{t("adSelectCountries", locale)}</label>
            <div className="flex flex-wrap gap-2">
              {MARKET_OPTIONS.map((m) => (
                <button key={m.code} type="button" onClick={() => toggleMarket(m.code)}
                  className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${selectedMarkets.includes(m.code) ? "border-wf-700 bg-wf-800 text-white" : "border-wf-300 bg-white text-wf-700 hover:border-wf-500"}`}>
                  {m.code} — {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">{t("adPlacement", locale)}</label>
            <div className="flex gap-3">
              {PLACEMENTS.map((p) => (
                <label key={p} className="flex items-center gap-1.5 text-xs text-wf-800">
                  <input type="radio" name="placement" value={p} checked={placement === p} onChange={() => setPlacement(p)} className="accent-wf-800" />
                  {placementLabel(p, locale)}
                </label>
              ))}
            </div>
          </div>

          {placement === "category" && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">{t("adSelectCategory", locale)}</label>
              <select className={selectClass} value={targetValue} onChange={(e) => setTargetValue(e.target.value)}>
                <option value="">{t("adChooseCategory", locale)}</option>
                {categories.map((c) => (<option key={c.id} value={c.slug || c.id}>{c.name}</option>))}
              </select>
            </div>
          )}
          {placement === "search" && (
            <Input label={t("adSearchKeyword", locale)} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder={t("adSearchKeywordPlaceholder", locale)} />
          )}

          <div className="rounded-md border border-wf-200 bg-wf-50 p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500 mb-4">{t("adBannerContent", locale)}</h3>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">{t("adBannerImage", locale)}</label>
              <p className="text-[10px] text-wf-500 mb-1">{t("adImageHint", locale)}</p>
              <p className="text-[10px] text-wf-400 mb-2">{t("adBannerFormat", locale)}: {BANNER_REC_W}×{BANNER_REC_H} px ({BANNER_RATIO})</p>
              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  {uploading ? t("adUploading", locale) : t("adUploadImage", locale)}
                </Button>
                {imageUrl && (
                  <div className="h-16 w-24 overflow-hidden rounded border border-wf-300 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="" className="h-full w-full object-contain" />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-2 text-xs text-wf-800">
                <input type="checkbox" checked={useBrandLogo} onChange={(e) => setUseBrandLogo(e.target.checked)} className="accent-wf-800" />
                {t("adUseBrandLogo", locale)}
              </label>
              {useBrandLogo && !activeBrandLogo && (
                <p className="mt-1 text-[10px] text-wf-400">{t("adNoLogoAvailable", locale)}</p>
              )}
              {useBrandLogo && activeBrandLogo && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-8 w-16 overflow-hidden rounded border border-wf-200 bg-white p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activeBrandLogo} alt="" className="h-full w-full object-contain" />
                  </div>
                  <span className="text-[10px] text-wf-500">{t("adLogoFromBrand", locale)}</span>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 tablet:grid-cols-2">
              <Input label={t("adHeadline", locale)} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder={t("adHeadlinePlaceholder", locale)} />
              <Input label={t("adSubline", locale)} value={subline} onChange={(e) => setSubline(e.target.value)} placeholder={t("adSublinePlaceholder", locale)} />
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">{t("adCtaLabel", locale)}</label>
              <select className={selectClass} value={ctaKey} onChange={(e) => setCtaKey(e.target.value)}>
                {CTA_OPTIONS.map((c) => (<option key={c.key} value={c.key}>{ctaLabel(c.key, locale)}</option>))}
              </select>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">{t("adDesign", locale)}</label>
              <div className="grid grid-cols-5 gap-2">
                {AD_CAMPAIGN_DESIGNS.map((d) => (
                  <button key={d.key} type="button" onClick={() => setDesignKey(d.key)}
                    className={`rounded-lg border-2 p-2 text-[10px] font-medium transition-all ${designKey === d.key ? "border-wf-800 ring-2 ring-wf-300" : "border-transparent hover:border-wf-300"}`}>
                    <div className="h-10 rounded-md" style={{ background: d.bgStyle }} />
                    <div className="mt-1.5 text-wf-700">{d.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-wf-200 bg-white p-5">
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
              {t("adCampaignProducts", locale)}
            </h3>
            <p className="mb-3 text-[10px] text-wf-500">{t("adCampaignProductsHint", locale)}</p>
            <Input
              label={t("adProductSearch", locale)}
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder={t("adProductSearchPlaceholder", locale)}
            />
            {productSearchBusy && (
              <p className="mt-2 text-[10px] text-wf-400">{t("adProductSearching", locale)}</p>
            )}
            <div className="mt-3 max-h-56 overflow-y-auto rounded border border-wf-200">
              {productHits.length === 0 ? (
                <p className="px-3 py-4 text-xs text-wf-500">{t("adNoProductsFound", locale)}</p>
              ) : (
                productHits.map((p) => {
                  const selected = selectedProductIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProduct(p)}
                      className={`flex w-full items-center gap-3 border-b border-wf-100 px-3 py-2 text-left last:border-b-0 ${selected ? "bg-wf-100" : "hover:bg-wf-50"}`}
                    >
                      <input type="checkbox" readOnly checked={selected} className="accent-wf-800" />
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-wf-200 bg-wf-50">
                        {p.primary_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.primary_image_url} alt="" className="h-full w-full object-contain" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-wf-900">
                          {p.title || p.id}
                        </div>
                        <div className="truncate text-[10px] text-wf-500">
                          {[p.sku_hint, p.identifier_value].filter(Boolean).join(" · ") || p.id}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
            {selectedProducts.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 text-[11px] font-semibold text-wf-700">
                  {t("adSelectedProducts", locale)} ({selectedProducts.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProduct(p)}
                      className="rounded-full border border-wf-300 bg-wf-50 px-2.5 py-1 text-[10px] text-wf-800 hover:border-wf-500"
                    >
                      {p.title || p.id} ×
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">{t("adLivePreview", locale)}</label>
            <AdCampaignLandingPreview
              banner={{
                designKey,
                headline,
                subline,
                ctaLabel: ctaLabel(ctaKey, locale),
                imageUrl,
                logoUrl: activeBrandLogo,
                headlineFallback: t("adPreviewHeadline", locale),
                sublineFallback: t("adPreviewSubline", locale),
              }}
              sellerName={sellerPreviewName}
              products={landingProducts}
              discoverHeading={t("adDiscoverProducts", locale)}
              moreProductsLabel={t("adMoreSellerProducts", locale)}
              linkProducts={false}
            />
          </div>

          {selectedMarkets.length > 0 && (
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">{t("adSelectWeeks", locale)}</label>
              {weekSlots.length === 0 ? (
                <p className="text-xs text-wf-500">{t("adLoadingWeeks", locale)}</p>
              ) : (
                <div className="rounded-md border border-wf-300 bg-white">
                  {weekSlots.map((slot) => {
                    const fullyAvailable = weekFullyAvailable(slot)
                    const blocked = selectedMarkets.filter((m) => slot.markets[m]?.available === false)
                    const selected = selectedWeeks.includes(slot.week_start)
                    return (
                      <div key={slot.week_start} className={`border-b border-wf-200 px-4 py-2.5 last:border-b-0 ${!fullyAvailable ? "opacity-60" : ""}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" checked={selected} disabled={!fullyAvailable} onChange={() => toggleWeek(slot.week_start)} className="accent-wf-800" />
                            <span className="text-xs font-medium text-wf-800">{formatWeekRange(slot.week_start, slot.week_end, intl)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {fullyAvailable ? (
                              <Badge variant="outline">{t("adAvailable", locale)}</Badge>
                            ) : blocked.length === selectedMarkets.length ? (
                              <Badge variant="solid">{t("adBooked", locale)}</Badge>
                            ) : (
                              <Badge variant="outline">{t("adPartiallyBooked", locale)}</Badge>
                            )}
                            {fullyAvailable && (
                              <span className="text-[10px] text-wf-500">{formatEuro(selectedMarkets.reduce((sum, m) => sum + (slot.markets[m]?.price ?? 0), 0))}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {selectedWeeks.length > 0 && (
            <div className="rounded-[5px] border border-wf-200 bg-wf-50 px-4 py-3 text-[11.5px] text-wf-700">
              <div className="font-semibold text-wf-800">{t("adPriceSummary", locale)}</div>
              <div className="mt-1">{t("adWeeksSelected", locale)}: {selectedWeeks.length}</div>
              <div className="mt-0.5">{t("adCountries", locale)}: {selectedMarkets.join(", ")}</div>
              <div className="mt-0.5 text-[16px] font-bold text-wf-900">{t("commonTotal", locale)}: {formatEuro(totalPrice)}</div>
            </div>
          )}

          {formNote && <Notice variant={formNote.type === "error" ? "destructive" : "info"}>{formNote.msg}</Notice>}

          {showPreview && (
            <div className="rounded-lg border-2 border-wf-600 bg-wf-50 p-5">
              <h3 className="text-sm font-bold text-wf-900">{t("adPreviewTitle", locale)}</h3>
              <div className="mt-3">
                <AdCampaignLandingPreview
                  banner={{
                    designKey,
                    headline,
                    subline,
                    ctaLabel: ctaLabel(ctaKey, locale),
                    imageUrl,
                    logoUrl: activeBrandLogo,
                    headlineFallback: t("adPreviewHeadline", locale),
                    sublineFallback: t("adPreviewSubline", locale),
                  }}
                  sellerName={sellerPreviewName}
                  products={landingProducts}
                  discoverHeading={t("adDiscoverProducts", locale)}
                  moreProductsLabel={t("adMoreSellerProducts", locale)}
                  linkProducts={false}
                />
              </div>
              <div className="mt-4 space-y-1.5 text-xs text-wf-800">
                <div><strong>{t("adCampaignName", locale)}:</strong> {name}</div>
                <div><strong>{t("adPlacement", locale)}:</strong> {placementLabel(placement, locale)}</div>
                {targetValue && (
                  <div><strong>{placement === "category" ? t("commonCategory", locale) : t("adSearchKeyword", locale)}:</strong> {targetValue}</div>
                )}
                <div><strong>{t("adCountries", locale)}:</strong> {selectedMarkets.join(", ")}</div>
                <div>
                  <strong>{t("adPeriod", locale)}:</strong>{" "}
                  {selectedWeeks.map((ws) => { const slot = weekSlots.find((s) => s.week_start === ws); return slot ? formatWeekRange(slot.week_start, slot.week_end, intl) : ws }).join("; ")}
                </div>
                <div><strong>{t("adSelectedProducts", locale)}:</strong> {selectedProducts.map((p) => p.title || p.id).join(", ")}</div>
                <div className="text-[16px] font-bold text-wf-900"><strong>{t("commonTotal", locale)}:</strong> {formatEuro(totalPrice)}</div>
              </div>
              <div className="mt-4 flex gap-3">
                <Button onClick={confirmSubmit} disabled={submitting}>
                  {submitting
                    ? t("adSubmitting", locale)
                    : editingId
                      ? t("adResubmitCampaign", locale)
                      : t("adSubmitCampaign", locale)}
                </Button>
                <Button variant="outline" onClick={() => setShowPreview(false)}>{t("commonCancel", locale)}</Button>
              </div>
            </div>
          )}

          {!showPreview && (
            <div>
              <Button onClick={handleSubmit}>{t("adReviewCampaign", locale)}</Button>
            </div>
          )}
        </div>
      </DashboardSection>

      {campaigns.length === 0 ? (
        <EmptyState title={t("adNoCampaigns", locale)} description={t("adNoCampaignsDesc", locale)} />
      ) : (
        <section className="mb-8">
          <h2 className="mb-2.5 text-[12px] uppercase tracking-[0.04em] text-wf-500">{t("adYourCampaigns", locale)}</h2>
          <div className="overflow-hidden rounded-lg border border-wf-300 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {[
                    t("commonStatus", locale),
                    t("adCampaignName", locale),
                    t("adPlacement", locale),
                    t("adCountries", locale),
                    t("adPeriod", locale),
                    t("commonTotal", locale),
                    t("adActions", locale),
                  ].map((h) => (
                    <th key={h} className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-wf-200 last:border-b-0">
                    <td className="px-4 py-2.5">
                      <Badge
                        variant={
                          c.status === "rejected" || c.status === "pending_review"
                            ? "solid"
                            : "outline"
                        }
                      >
                        {campaignStatusLabel(c.status, locale)}
                      </Badge>
                      {c.status === "rejected" &&
                        typeof c.admin_note === "string" &&
                        c.admin_note.trim() && (
                          <div className="mt-1.5 max-w-[220px] text-[10px] text-red-700">
                            <div className="font-semibold">
                              {t("adRejectedByEuropmade", locale)}
                            </div>
                            <div>
                              {t("adRejectionReason", locale)}: {c.admin_note.trim()}
                            </div>
                          </div>
                        )}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-wf-800">{c.name}</td>
                    <td className="px-4 py-2.5 text-wf-700">{placementLabel(c.placement, locale)}{c.target_value ? ` · ${c.target_value}` : ""}</td>
                    <td className="px-4 py-2.5 text-wf-700">{c.markets.join(", ")}</td>
                    <td className="px-4 py-2.5 text-wf-700">{c.weeks.length > 0 ? formatWeekRange(c.weeks[0].week_start, c.weeks[c.weeks.length - 1].week_end, intl) : "—"}</td>
                    <td className="px-4 py-2.5 font-medium text-wf-800">{formatEuro(c.total_price)}</td>
                    <td className="px-4 py-2.5">
                      {c.status === "rejected" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(c)}
                        >
                          {t("adEditResubmit", locale)}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </SellerGate>
  )
}
