"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Badge, Button, Notice } from "@europmade/ui"
import { formatAffiliateCommissionPercent } from "@europmade/utils"
import { AffiliateGate } from "../../../_components/affiliate-gate"
import { AffiliateProductImage } from "../../../_components/affiliate-product-image"
import {
  AffiliateApiError,
  buildAffiliateShareUrl,
  createAffiliateLink,
  getAffiliateCommissionSettings,
  productAffiliateTargetPath,
  type CommissionSettings,
} from "../../../../_lib/affiliate-api"
import {
  CatalogApiError,
  getCatalogProduct,
  type CatalogOffer,
  type CatalogProductDetail,
} from "../../../../_lib/catalog-api"
import { formatEuro } from "../../../../_components/storefront-shell"
import { useStorefrontLocale } from "../../../../_lib/i18n/use-storefront-locale"
import { localizeCategoryNames } from "../../../../_lib/localize-category-names"
import { t, tFormat } from "../../../../_lib/i18n/messages"

function AffiliateProductDetailInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = useStorefrontLocale()
  const productId = typeof params.id === "string" ? params.id : ""
  const autoPromote = searchParams.get("promote") === "1"

  const [detail, setDetail] = useState<CatalogProductDetail | null>(null)
  const [settings, setSettings] = useState<CommissionSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [promotingOfferId, setPromotingOfferId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!productId) return
    setError(null)
    try {
      const [product, commission] = await Promise.all([
        getCatalogProduct(productId, "NL"),
        getAffiliateCommissionSettings(),
      ])
      setDetail(product)
      setSettings(commission)
    } catch (err: unknown) {
      setDetail(null)
      setError(
        err instanceof AffiliateApiError || err instanceof CatalogApiError
          ? err.message
          : t("affProductLoadFailed", locale)
      )
    }
  }, [productId, locale])

  useEffect(() => {
    void load()
  }, [load])

  const p = detail?.product
  const offers = useMemo(
    () =>
      (detail?.offers || []).filter(
        (offer) => Number(offer.quantity_available) > 0
      ),
    [detail]
  )
  const best = useMemo(() => {
    if (offers.length === 0) return null
    return [...offers].sort(
      (a, b) =>
        (b.affiliate_commission_percent ?? 0) -
          (a.affiliate_commission_percent ?? 0) ||
        (b.affiliate_earnings ?? 0) - (a.affiliate_earnings ?? 0)
    )[0]
  }, [offers])
  const sellable = best != null
  const unitPrice = best?.base_price != null ? Number(best.base_price) : null
  const commissionLabel =
    best?.affiliate_commission_percent != null
      ? offers.length > 1
        ? `Tot ${formatAffiliateCommissionPercent(best.affiliate_commission_percent)}`
        : formatAffiliateCommissionPercent(best.affiliate_commission_percent)
      : null
  const earnings = best?.affiliate_earnings ?? null

  const promote = useCallback(
    async (offer: CatalogOffer) => {
      if (!productId || !offer.offer_id || !offer.seller_id) return
      setPromotingOfferId(offer.offer_id)
      setError(null)
      setInfo(null)
      try {
        const target = productAffiliateTargetPath(productId, offer.offer_id)
        const res = await createAffiliateLink({
          target_url: target,
          product_id: productId,
          offer_id: offer.offer_id,
          seller_id: offer.seller_id,
        })
        const url = buildAffiliateShareUrl(
          res.link.target_url,
          res.link.tracking_param
        )
        setShareUrl(url)
        setInfo(t("affProductLinkCreated", locale))
      } catch (err: unknown) {
        setError(
          err instanceof AffiliateApiError
            ? err.message
            : t("affProductLinkFailed", locale)
        )
      } finally {
        setPromotingOfferId(null)
      }
    },
    [productId, locale]
  )

  useEffect(() => {
    if (autoPromote && best && !shareUrl && !promotingOfferId) {
      void promote(best)
    }
  }, [autoPromote, best, shareUrl, promotingOfferId, promote])

  async function copyLink() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      setError(t("affProductCopyFailed", locale))
    }
  }

  const attributionLabel = useMemo(() => {
    if (!settings) return "…"
    return tFormat("affProductAttributionDays", locale, {
      days: settings.attribution_days,
    })
  }, [settings, locale])

  return (
    <AffiliateGate
      breadcrumb={[
        { label: t("affiliateNavDashboard", locale), href: "/affiliate/dashboard" },
        { label: t("affiliateNavProducts", locale), href: "/affiliate/dashboard/products" },
        { label: p?.title || t("affProductFallbackTitle", locale) },
      ]}
    >
      <Link
        href="/affiliate/dashboard/products"
        className="text-xs text-wf-600 hover:underline"
      >
        {t("affProductBack", locale)}
      </Link>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}
      {info ? (
        <Notice variant="info" className="mt-4">
          {info}
        </Notice>
      ) : null}

      {!p ? (
        <p className="mt-6 text-sm text-wf-600">{t("loading", locale)}</p>
      ) : (
        <div
          className="mt-4 grid gap-6 tablet:grid-cols-[260px_1fr]"
          data-testid="affiliate-product-detail"
        >
          <AffiliateProductImage
            src={p.image_url}
            alt={p.title}
            className="aspect-square w-full rounded-md border border-wf-200 bg-wf-50 object-cover"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[19px] font-bold text-wf-900">{p.title}</h1>
              <Badge variant={sellable ? "solid" : "outline"}>
                {sellable
                  ? t("affProductSellable", locale)
                  : t("affProductUnavailable", locale)}
              </Badge>
            </div>

            <p className="mt-2 text-lg font-semibold text-wf-900">
              {unitPrice != null ? formatEuro(unitPrice) : "—"}
            </p>

            {p.brand_name ? (
              <p className="mt-1 text-xs text-wf-600">
                {t("affProductBrand", locale)}: {p.brand_name}
              </p>
            ) : null}
            {best?.seller_name ? (
              <p className="mt-0.5 text-xs text-wf-600">
                {t("affProductSeller", locale)}: {best.seller_name}
              </p>
            ) : null}
            {p.category_names?.length ? (
              <p className="mt-0.5 text-xs text-wf-500">
                {localizeCategoryNames(p.category_names, locale)}
              </p>
            ) : null}
            <p className="mt-2 font-mono text-[11px] text-wf-400">
              {t("affProductId", locale)}: {p.id}
            </p>
            {p.identifier_value ? (
              <p className="font-mono text-[11px] text-wf-400">
                {p.identifier_type || "EAN"}: {p.identifier_value}
              </p>
            ) : null}
            {p.description ? (
              <p className="mt-4 max-w-2xl text-xs leading-relaxed text-wf-700 line-clamp-6">
                {p.description}
              </p>
            ) : null}

            <div className="mt-5 max-w-md rounded-md border border-wf-300 bg-wf-50 p-4">
              <div className="flex justify-between gap-3 border-b border-wf-200 py-2 text-sm">
                <span className="text-wf-600">
                  {t("affProductPriceLabel", locale)}
                </span>
                <span className="font-semibold text-wf-900">
                  {unitPrice != null ? formatEuro(unitPrice) : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3 border-b border-wf-200 py-2 text-sm">
                <span className="text-wf-600">
                  {t("affProductCommissionLabel", locale)}
                </span>
                <span
                  className="font-semibold text-wf-900"
                  data-testid="affiliate-commission-rate"
                >
                  {commissionLabel ?? "…"}
                </span>
              </div>
              <div className="flex justify-between gap-3 py-2 text-sm">
                <span className="text-wf-600">
                  {t("affProductYouEarn", locale)}
                </span>
                <span
                  className="font-bold text-wf-900"
                  data-testid="affiliate-commission-amount"
                >
                  {earnings != null ? formatEuro(earnings) : "—"}
                </span>
              </div>
              <p
                className="mt-2 text-[11px] text-wf-500"
                data-testid="affiliate-attribution-days"
              >
                {attributionLabel}
              </p>
            </div>

            {offers.length > 0 ? (
              <div className="mt-5 overflow-x-auto">
                <p className="mb-2 text-xs text-wf-600">
                  {t("affOfferChoice", locale)}
                </p>
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-wf-300 text-[11px] uppercase tracking-wide text-wf-500">
                      <th className="py-2 pr-3 font-semibold">
                        {t("affProductSeller", locale)}
                      </th>
                      <th className="py-2 pr-3 font-semibold">
                        {t("affProductPriceLabel", locale)}
                      </th>
                      <th className="py-2 pr-3 font-semibold">
                        {t("affProductCommissionLabel", locale)}
                      </th>
                      <th className="py-2 pr-3 font-semibold">
                        {t("affProductYouEarn", locale)}
                      </th>
                      <th className="py-2 font-semibold">
                        {t("affActions", locale)}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((offer) => (
                      <tr
                        key={offer.offer_id}
                        className="border-b border-wf-200"
                        data-testid="affiliate-offer-row"
                        data-offer-id={offer.offer_id}
                        data-seller-id={offer.seller_id}
                        data-commission={offer.affiliate_commission_percent ?? ""}
                      >
                        <td className="py-2 pr-3 text-wf-900">
                          {offer.seller_name}
                        </td>
                        <td className="py-2 pr-3 font-medium text-wf-900">
                          {formatEuro(Number(offer.base_price))}
                        </td>
                        <td className="py-2 pr-3 text-wf-800">
                          {offer.affiliate_commission_percent != null
                            ? formatAffiliateCommissionPercent(
                                offer.affiliate_commission_percent
                              )
                            : "—"}
                        </td>
                        <td className="py-2 pr-3 text-wf-800">
                          {offer.affiliate_earnings != null
                            ? formatEuro(offer.affiliate_earnings)
                            : "—"}
                        </td>
                        <td className="py-2">
                          <Button
                            type="button"
                            disabled={promotingOfferId != null}
                            onClick={() => void promote(offer)}
                            data-testid="affiliate-promote-offer"
                          >
                            {promotingOfferId === offer.offer_id
                              ? t("affProductPromoting", locale)
                              : t("affPromoteOffer", locale)}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/affiliate/dashboard/links"
                className="inline-flex h-10 items-center rounded-md border border-wf-400 px-3 text-sm font-semibold text-wf-800"
              >
                {t("affiliateNavLinks", locale)}
              </Link>
            </div>

            {shareUrl ? (
              <div className="mt-5 rounded-md border border-wf-300 bg-white p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                  {t("affProductShareHeading", locale)}
                </div>
                <p
                  className="mt-2 break-all font-mono text-xs text-wf-900"
                  data-testid="affiliate-share-url"
                >
                  {shareUrl}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void copyLink()}
                    data-testid="affiliate-copy-link"
                  >
                    {copied
                      ? t("affProductCopied", locale)
                      : t("affProductCopy", locale)}
                  </Button>
                  {copied ? (
                    <Notice variant="info" className="!py-1.5">
                      {t("affProductCopied", locale)}
                    </Notice>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </AffiliateGate>
  )
}

function AffiliateProductDetailFallback() {
  const locale = useStorefrontLocale()
  return (
    <div className="flex min-h-screen items-center justify-center bg-wf-100 text-sm text-wf-600">
      {t("loading", locale)}
    </div>
  )
}

export default function AffiliateProductDetailPage() {
  return (
    <Suspense fallback={<AffiliateProductDetailFallback />}>
      <AffiliateProductDetailInner />
    </Suspense>
  )
}
