"use client"

import { useEffect, useMemo, useState } from "react"
import { Button, Input } from "@europmade/ui"
import { formatEuro } from "../../../../_components/storefront-shell"
import {
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  ProductCloudApiError,
  type ProductManagerDetail,
  type SellerOfferSummary,
} from "../../../_lib/product-cloud-api"
import {
  patchOffer,
  upsertOffer,
  CommerceCloudApiError,
} from "../../../_lib/commerce-cloud-api"
import { salePresentationLabel } from "../../../_lib/product-status-labels"
import { t } from "../../../../_lib/i18n/messages"
import type { StorefrontLocale } from "../../../../_lib/i18n/locales"

const AXIS_KEYS = [
  "vpAxisColor",
  "vpAxisSize",
  "vpAxisContent",
  "vpAxisPower",
  "vpAxisVoltage",
  "vpAxisMaterial",
  "vpAxisVariant",
  "vpAxisBundle",
] as const

type AxisKey = (typeof AXIS_KEYS)[number]

type VariantRow = {
  variantId: string
  variantType: string
  variantValue: string
  variantLabel: string
  identifierId: string | null
  ean: string | null
  offers: SellerOfferSummary[]
  primaryOffer: SellerOfferSummary | null
}

type OfferEditor = {
  identifier_id: string
  offer_id: string | null
  region_code: string
  seller_sku: string
  customer_price: string
  promo_customer_price: string
  promo_starts_at: string
  promo_ends_at: string
  clear_promo: boolean
  shipping_cost: string
  stock: string
  delivery_days_max: string
  sales_status: "active" | "paused"
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

function customerPrice(o: SellerOfferSummary | null | undefined): number | null {
  if (!o || o.price == null) return null
  const ship = o.shipping_cost ?? 0
  if (o.promo_active && o.promo_price != null) {
    return Number(o.promo_price) + Number(ship)
  }
  return Number(o.price) + Number(ship)
}

function regularCustomerPrice(
  o: SellerOfferSummary | null | undefined
): number | null {
  if (!o || o.price == null) return null
  return Number(o.price) + Number(o.shipping_cost ?? 0)
}

function promoCustomerPrice(
  o: SellerOfferSummary | null | undefined
): number | null {
  if (!o || o.promo_price == null) return null
  return Number(o.promo_price) + Number(o.shipping_cost ?? 0)
}

function offerStatusLabel(o: SellerOfferSummary | null | undefined, locale: StorefrontLocale) {
  if (!o?.has_offer) return { label: t("vpNoOffer", locale), className: "text-wf-500" }
  if (o.sales_status === "paused")
    return { label: t("statusPaused", locale), className: "text-amber-800" }
  return { label: t("statusActive", locale), className: "text-wf-700" }
}

function variantSaleLabel(
  product: ProductManagerDetail,
  o: SellerOfferSummary | null | undefined,
  locale: StorefrontLocale
) {
  return salePresentationLabel(product.completeness, {
    has_offer: o?.has_offer,
    sales_status: o?.sales_status,
  }, locale)
}

function draftFromOffer(
  o: SellerOfferSummary,
  identifierId: string
): OfferEditor {
  const ship = Number(o.shipping_cost ?? 0)
  const base = Number(o.price ?? 0)
  const promo = o.promo_price != null ? Number(o.promo_price) : null
  return {
    identifier_id: identifierId,
    offer_id: o.offer_id,
    region_code: o.region_code || "NL",
    seller_sku: o.seller_sku || "",
    customer_price: Number.isFinite(base) ? String(base + ship) : "",
    promo_customer_price:
      promo != null && Number.isFinite(promo) ? String(promo + ship) : "",
    promo_starts_at: toDatetimeLocal(o.promo_starts_at),
    promo_ends_at: toDatetimeLocal(o.promo_ends_at),
    clear_promo: false,
    shipping_cost: String(ship || ""),
    stock: o.stock != null ? String(o.stock) : "",
    delivery_days_max:
      o.delivery_days_max != null ? String(o.delivery_days_max) : "",
    sales_status: o.sales_status === "paused" ? "paused" : "active",
  }
}

function emptyOfferDraft(identifierId: string): OfferEditor {
  return {
    identifier_id: identifierId,
    offer_id: null,
    region_code: "NL",
    seller_sku: "",
    customer_price: "",
    promo_customer_price: "",
    promo_starts_at: "",
    promo_ends_at: "",
    clear_promo: false,
    shipping_cost: "0",
    stock: "0",
    delivery_days_max: "3",
    sales_status: "active",
  }
}

type Props = {
  productId: string
  product: ProductManagerDetail
  suggestedAxes: string[]
  allowedAxes: string[]
  locale: StorefrontLocale
  onReload: () => void
  onNotice: (msg: string | null) => void
  onError: (msg: string | null) => void
  onOpenOfferTab: (offer: SellerOfferSummary) => void
}

export function SellerVariantsPanel({
  productId,
  product,
  suggestedAxes,
  allowedAxes,
  locale,
  onReload,
  onNotice,
  onError,
  onOpenOfferTab,
}: Props) {
  const axesCatalog = useMemo(() => {
    const axisLabels = AXIS_KEYS.map((k) => t(k, locale))
    const set = new Set<string>([
      ...suggestedAxes,
      ...allowedAxes,
      ...axisLabels,
    ])
    return [...set].filter((a) => axisLabels.includes(a))
  }, [suggestedAxes, allowedAxes, locale])

  const [selectedAxes, setSelectedAxes] = useState<string[]>([])
  const [axisValues, setAxisValues] = useState<Record<string, string>>({})
  const [ean, setEan] = useState("")
  const [duplicateFrom, setDuplicateFrom] = useState("")
  const [busy, setBusy] = useState(false)
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editEan, setEditEan] = useState("")
  const [offerEditorId, setOfferEditorId] = useState<string | null>(null)
  const [offerDraft, setOfferDraft] = useState<OfferEditor | null>(null)

  const defaultAxis = t("vpAxisVariant", locale)

  useEffect(() => {
    if (selectedAxes.length > 0) return
    const axisLabels = AXIS_KEYS.map((k) => t(k, locale))
    const initial = (suggestedAxes.length
      ? suggestedAxes
      : [defaultAxis]
    ).filter((a) => axisLabels.includes(a))
    setSelectedAxes(initial.length ? initial.slice(0, 2) : [defaultAxis])
  }, [suggestedAxes, selectedAxes.length, locale, defaultAxis])

  const rows: VariantRow[] = useMemo(() => {
    const out: VariantRow[] = []
    for (const v of product.variants || []) {
      const ids = v.identifiers || []
      const offers = (v.offers || []).filter((o) => o.has_offer)
      if (!ids.length) {
        out.push({
          variantId: v.id,
          variantType: v.variant_type,
          variantValue: v.variant_value,
          variantLabel: v.variant_value || `${v.variant_type}: ${v.variant_value}`,
          identifierId: null,
          ean: null,
          offers: [],
          primaryOffer: null,
        })
        continue
      }
      for (const iden of ids) {
        const idOffers = offers.filter((o) => o.identifier_id === iden.id)
        const primary =
          idOffers.find((o) => (o.region_code || "").toUpperCase() === "NL") ||
          idOffers.find((o) => o.sales_status === "active") ||
          idOffers[0] ||
          null
        out.push({
          variantId: v.id,
          variantType: v.variant_type,
          variantValue: v.variant_value,
          variantLabel: v.variant_value.includes("/")
            ? v.variant_value
            : `${v.variant_type}: ${v.variant_value}`,
          identifierId: iden.id,
          ean: iden.identifier_value,
          offers: idOffers,
          primaryOffer: primary,
        })
      }
    }
    return out
  }, [product.variants])

  function toggleAxis(axis: string) {
    setSelectedAxes((prev) => {
      if (prev.includes(axis)) {
        if (prev.length === 1) return prev
        return prev.filter((a) => a !== axis)
      }
      return [...prev, axis]
    })
  }

  async function createVariant() {
    const axes = selectedAxes
      .map((axis) => ({ axis, value: (axisValues[axis] || "").trim() }))
      .filter((a) => a.value)
    if (!axes.length) {
      onError(t("vpFillAxis", locale))
      return
    }
    if (!ean.trim()) {
      onError(t("vpEanRequired", locale))
      return
    }
    setBusy(true)
    onError(null)
    onNotice(null)
    try {
      await createProductVariant(productId, {
        axes,
        identifier_value: ean.trim(),
        identifier_type: "GTIN",
        duplicate_from_variant_id: duplicateFrom || undefined,
      })
      setAxisValues({})
      setEan("")
      setDuplicateFrom("")
      onNotice(t("vpCreated", locale))
      onReload()
    } catch (err: unknown) {
      onError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("vpCreateFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit(variantId: string) {
    setBusy(true)
    onError(null)
    onNotice(null)
    try {
      await updateProductVariant(productId, variantId, {
        variant_value: editValue.trim() || undefined,
        identifier_value: editEan.trim() || undefined,
      })
      setEditingVariantId(null)
      onNotice(t("vpUpdated", locale))
      onReload()
    } catch (err: unknown) {
      onError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("vpUpdateFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  async function removeVariant(variantId: string, hasOffers: boolean) {
    const msg = hasOffers
      ? t("vpDeleteConfirmOffer", locale)
      : t("vpDeleteConfirm", locale)
    if (!window.confirm(msg)) return
    setBusy(true)
    onError(null)
    onNotice(null)
    try {
      await deleteProductVariant(productId, variantId, {
        withdraw_offers: true,
      })
      onNotice(t("vpDeleted", locale))
      onReload()
    } catch (err: unknown) {
      onError(
        err instanceof ProductCloudApiError
          ? err.message
          : t("vpDeleteFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  async function saveOfferEditor() {
    if (!offerDraft) return
    const shipping = Number(offerDraft.shipping_cost)
    const customer = Number(offerDraft.customer_price)
    if (!Number.isFinite(shipping) || shipping < 0) {
      onError(t("vpShippingInvalid", locale))
      return
    }
    if (!Number.isFinite(customer) || customer < shipping) {
      onError(t("vpPriceGteShipping", locale))
      return
    }
    const unit = Math.round((customer - shipping) * 100) / 100
    let promoUnit: number | null = null
    if (!offerDraft.clear_promo && offerDraft.promo_customer_price.trim()) {
      const promoCustomer = Number(offerDraft.promo_customer_price)
      if (!Number.isFinite(promoCustomer) || promoCustomer < shipping) {
        onError(t("vpPromoGteShipping", locale))
        return
      }
      if (promoCustomer >= customer) {
        onError(t("vpPromoLtRegular", locale))
        return
      }
      promoUnit = Math.round((promoCustomer - shipping) * 100) / 100
    }

    setBusy(true)
    onError(null)
    onNotice(null)
    try {
      if (offerDraft.offer_id) {
        await patchOffer(offerDraft.offer_id, {
          base_price: unit,
          shipping_cost: shipping,
          quantity_available: Number(offerDraft.stock) || 0,
          delivery_days_max: offerDraft.delivery_days_max
            ? Number(offerDraft.delivery_days_max)
            : null,
          seller_sku: offerDraft.seller_sku.trim() || null,
          sales_status: offerDraft.sales_status,
          promo_price: offerDraft.clear_promo ? null : promoUnit,
          promo_starts_at: offerDraft.clear_promo
            ? null
            : fromDatetimeLocal(offerDraft.promo_starts_at),
          promo_ends_at: offerDraft.clear_promo
            ? null
            : fromDatetimeLocal(offerDraft.promo_ends_at),
          clear_promo: offerDraft.clear_promo || undefined,
        })
      } else {
        await upsertOffer({
          identifier_id: offerDraft.identifier_id,
          region_code: offerDraft.region_code || "NL",
          base_price: unit,
          shipping_cost: shipping,
          quantity_available: Number(offerDraft.stock) || 0,
          delivery_days_max: offerDraft.delivery_days_max
            ? Number(offerDraft.delivery_days_max)
            : 3,
          seller_sku: offerDraft.seller_sku.trim() || undefined,
          sales_status: offerDraft.sales_status,
          promo_price: promoUnit,
          promo_starts_at: fromDatetimeLocal(offerDraft.promo_starts_at),
          promo_ends_at: fromDatetimeLocal(offerDraft.promo_ends_at),
        })
      }
      setOfferEditorId(null)
      setOfferDraft(null)
      onNotice(t("vpOfferSaved", locale))
      onReload()
    } catch (err: unknown) {
      onError(
        err instanceof CommerceCloudApiError || err instanceof Error
          ? err.message
          : t("vpOfferSaveFailed", locale)
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-wf-600">
        {t("vpStructureHint", locale)}
        {suggestedAxes.length ? suggestedAxes.join(", ") : "—"}.
      </p>

      <div className="rounded border border-wf-300 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-bold text-wf-900">{t("vpAddVariant", locale)}</h2>
        </div>

        <p className="mt-2 text-[11px] font-semibold text-wf-700">
          {t("vpAxes", locale)}
        </p>
        <div className="mt-1 flex flex-wrap gap-3">
          {axesCatalog.map((axis) => (
            <label
              key={axis}
              className="inline-flex items-center gap-1.5 text-[11px] text-wf-800"
            >
              <input
                type="checkbox"
                checked={selectedAxes.includes(axis)}
                onChange={() => toggleAxis(axis)}
              />
              {axis}
            </label>
          ))}
        </div>

        <div className="mt-3 grid gap-2 tablet:grid-cols-2">
          {selectedAxes.map((axis) => (
            <Input
              key={axis}
              label={axis}
              value={axisValues[axis] || ""}
              placeholder={`${t("vpValueFor", locale)} ${axis.toLowerCase()}`}
              onChange={(e) =>
                setAxisValues((prev) => ({ ...prev, [axis]: e.target.value }))
              }
            />
          ))}
          <Input
            label="EAN / GTIN"
            value={ean}
            onChange={(e) => setEan(e.target.value)}
          />
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
              {t("vpDuplicateFrom", locale)}
            </label>
            <select
              className="h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs"
              value={duplicateFrom}
              onChange={(e) => setDuplicateFrom(e.target.value)}
            >
              <option value="">—</option>
              {(product.variants || []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.variant_value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button
          size="sm"
          className="mt-3"
          disabled={busy}
          onClick={() => void createVariant()}
        >
          {t("vpAddVariantBtn", locale)}
        </Button>
      </div>

      <div className="overflow-x-auto rounded border border-wf-300 bg-white">
        <table className="min-w-full text-left text-[11px]">
          <thead className="border-b border-wf-200 bg-wf-50 text-wf-600">
            <tr>
              <th className="px-2 py-2 font-semibold">{t("vpVariant", locale)}</th>
              <th className="px-2 py-2 font-semibold">EAN/GTIN</th>
              <th className="px-2 py-2 font-semibold">SKU</th>
              <th className="px-2 py-2 font-semibold">{t("plHeaderPrice", locale)}</th>
              <th className="px-2 py-2 font-semibold">{t("vpPromoPrice", locale)}</th>
              <th className="px-2 py-2 font-semibold">{t("offerStock", locale)}</th>
              <th className="px-2 py-2 font-semibold">{t("vpDeliveryTime", locale)}</th>
              <th className="px-2 py-2 font-semibold">Status</th>
              <th className="px-2 py-2 font-semibold">{t("commonActions", locale)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-2 py-4 text-wf-500">
                  {t("vpNoVariants", locale)}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const o = row.primaryOffer
                const offerSt = offerStatusLabel(o, locale)
                const saleSt = variantSaleLabel(product, o, locale)
                const editing = editingVariantId === row.variantId
                const offerOpen = offerEditorId === row.variantId
                return (
                  <tr
                    key={`${row.variantId}-${row.identifierId || "x"}`}
                    className="border-b border-wf-100 align-top"
                  >
                    <td className="px-2 py-2 font-semibold text-wf-900">
                      {editing ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                        />
                      ) : (
                        row.variantLabel
                      )}
                    </td>
                    <td className="px-2 py-2 font-mono text-wf-700">
                      {editing ? (
                        <Input
                          value={editEan}
                          onChange={(e) => setEditEan(e.target.value)}
                        />
                      ) : (
                        row.ean || "—"
                      )}
                    </td>
                    <td className="px-2 py-2">{o?.seller_sku || "—"}</td>
                    <td className="px-2 py-2">
                      {regularCustomerPrice(o) != null
                        ? formatEuro(regularCustomerPrice(o)!)
                        : "—"}
                    </td>
                    <td className="px-2 py-2">
                      {o?.promo_active && promoCustomerPrice(o) != null
                        ? formatEuro(promoCustomerPrice(o)!)
                        : promoCustomerPrice(o) != null
                          ? `${formatEuro(promoCustomerPrice(o)!)} ${t("vpNotActive", locale)}`
                          : "—"}
                    </td>
                    <td className="px-2 py-2">{o?.stock ?? "—"}</td>
                    <td className="px-2 py-2">
                      {o?.delivery_days_max != null
                        ? `${o.delivery_days_max} d`
                        : "—"}
                    </td>
                    <td className="px-2 py-2">
                      <p className={`text-[11px] ${offerSt.className}`}>
                        {t("vpOfferPrefix", locale)}{offerSt.label}
                      </p>
                      <p className={`text-[11px] font-semibold ${saleSt.className}`}>
                        {t("vpSalePrefix", locale)}{saleSt.label}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-col gap-1">
                        {editing ? (
                          <>
                            <button
                              type="button"
                              className="text-left font-semibold underline"
                              disabled={busy}
                              onClick={() => void saveEdit(row.variantId)}
                            >
                              {t("commonSave", locale)}
                            </button>
                            <button
                              type="button"
                              className="text-left underline"
                              onClick={() => setEditingVariantId(null)}
                            >
                              {t("commonCancel", locale)}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="text-left font-semibold underline"
                              onClick={() => {
                                setEditingVariantId(row.variantId)
                                setEditValue(row.variantValue)
                                setEditEan(row.ean || "")
                              }}
                            >
                              {t("commonEdit", locale)}
                            </button>
                            {row.identifierId ? (
                              <button
                                type="button"
                                className="text-left font-semibold underline"
                                onClick={() => {
                                  setOfferEditorId(row.variantId)
                                  setOfferDraft(
                                    o?.has_offer
                                      ? draftFromOffer(o, row.identifierId!)
                                      : emptyOfferDraft(row.identifierId!)
                                  )
                                }}
                              >
                                {t("vpEditOffer", locale)}
                              </button>
                            ) : null}
                            {o?.has_offer ? (
                              <button
                                type="button"
                                className="text-left underline"
                                onClick={() => onOpenOfferTab(o)}
                              >
                                {t("vpGoToOffer", locale)}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="text-left font-semibold text-red-700 underline"
                              disabled={busy}
                              onClick={() =>
                                void removeVariant(
                                  row.variantId,
                                  row.offers.length > 0
                                )
                              }
                            >
                              {t("vpDelete", locale)}
                            </button>
                          </>
                        )}
                      </div>
                      {offerOpen && offerDraft ? (
                        <div className="mt-2 min-w-[240px] rounded border border-wf-300 bg-wf-50 p-2">
                          <p className="mb-2 text-[10px] font-semibold uppercase text-wf-500">
                            {t("vpOfferLabel", locale)}
                          </p>
                          <div className="grid gap-2">
                            <Input
                              label="Seller SKU"
                              value={offerDraft.seller_sku}
                              onChange={(e) =>
                                setOfferDraft({
                                  ...offerDraft,
                                  seller_sku: e.target.value,
                                })
                              }
                            />
                            <Input
                              label={t("vpRegularPrice", locale)}
                              value={offerDraft.customer_price}
                              onChange={(e) =>
                                setOfferDraft({
                                  ...offerDraft,
                                  customer_price: e.target.value,
                                })
                              }
                            />
                            <Input
                              label={t("vpPromoPriceLabel", locale)}
                              value={offerDraft.promo_customer_price}
                              disabled={offerDraft.clear_promo}
                              onChange={(e) =>
                                setOfferDraft({
                                  ...offerDraft,
                                  promo_customer_price: e.target.value,
                                  clear_promo: false,
                                })
                              }
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="mb-1 block text-[10px] font-semibold text-wf-500">
                                  {t("vpPromoStart", locale)}
                                </label>
                                <input
                                  type="datetime-local"
                                  className="h-8 w-full rounded border border-wf-400 px-1 text-[11px]"
                                  value={offerDraft.promo_starts_at}
                                  disabled={offerDraft.clear_promo}
                                  onChange={(e) =>
                                    setOfferDraft({
                                      ...offerDraft,
                                      promo_starts_at: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] font-semibold text-wf-500">
                                  {t("vpPromoEnd", locale)}
                                </label>
                                <input
                                  type="datetime-local"
                                  className="h-8 w-full rounded border border-wf-400 px-1 text-[11px]"
                                  value={offerDraft.promo_ends_at}
                                  disabled={offerDraft.clear_promo}
                                  onChange={(e) =>
                                    setOfferDraft({
                                      ...offerDraft,
                                      promo_ends_at: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <label className="inline-flex items-center gap-1 text-[11px]">
                              <input
                                type="checkbox"
                                checked={offerDraft.clear_promo}
                                onChange={(e) =>
                                  setOfferDraft({
                                    ...offerDraft,
                                    clear_promo: e.target.checked,
                                  })
                                }
                              />
                              {t("vpClearPromo", locale)}
                            </label>
                            <Input
                              label={t("vpShippingCosts", locale)}
                              value={offerDraft.shipping_cost}
                              onChange={(e) =>
                                setOfferDraft({
                                  ...offerDraft,
                                  shipping_cost: e.target.value,
                                })
                              }
                            />
                            <Input
                              label={t("offerStock", locale)}
                              value={offerDraft.stock}
                              onChange={(e) =>
                                setOfferDraft({
                                  ...offerDraft,
                                  stock: e.target.value,
                                })
                              }
                            />
                            <Input
                              label={t("offerDeliveryDays", locale)}
                              value={offerDraft.delivery_days_max}
                              onChange={(e) =>
                                setOfferDraft({
                                  ...offerDraft,
                                  delivery_days_max: e.target.value,
                                })
                              }
                            />
                            <div>
                              <label className="mb-1 block text-[10px] font-semibold text-wf-500">
                                {t("vpSaleStatus", locale)}
                              </label>
                              <select
                                className="h-8 w-full rounded border border-wf-400 bg-white px-2 text-[11px]"
                                value={offerDraft.sales_status}
                                onChange={(e) =>
                                  setOfferDraft({
                                    ...offerDraft,
                                    sales_status: e.target.value as
                                      | "active"
                                      | "paused",
                                  })
                                }
                              >
                                <option value="active">{t("vpActiveForSale", locale)}</option>
                                <option value="paused">{t("statusPaused", locale)}</option>
                              </select>
                            </div>
                            <p className="text-[10px] text-wf-500">
                              {t("vpMarket", locale)}{offerDraft.region_code}{" "}
                              {t("vpEffectivePrice", locale)}
                              {offerDraft.clear_promo ||
                              !offerDraft.promo_customer_price
                                ? offerDraft.customer_price || "—"
                                : offerDraft.promo_customer_price}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() => void saveOfferEditor()}
                              >
                                {t("commonSave", locale)}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setOfferEditorId(null)
                                  setOfferDraft(null)
                                }}
                              >
                                {t("vpClose", locale)}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
