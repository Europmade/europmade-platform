"use client"

import { useCallback, useEffect, useState } from "react"
import { Button, Notice } from "@europmade/ui"
import { AffiliateGate } from "../../_components/affiliate-gate"
import { AffiliateProductLabel } from "../../_components/affiliate-product-label"
import {
  AffiliateApiError,
  buildAffiliateShareUrl,
  createAffiliateCoupon,
  listAffiliateCoupons,
  listAffiliateLinks,
  type AffiliateCoupon,
  type AffiliateLink,
} from "../../../_lib/affiliate-api"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { storefrontIntlLocale } from "../../../_lib/i18n/locales"
import { t } from "../../../_lib/i18n/messages"
import {
  resolveAffiliateProductTitles,
  titleForAffiliateTarget,
} from "../../../_lib/affiliate-product-label"

function CopyButton({
  text,
  copyLabel,
  copiedLabel,
}: {
  text: string
  copyLabel: string
  copiedLabel: string
}) {
  const [copied, setCopied] = useState(false)
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }
  return (
    <Button type="button" size="sm" variant="secondary" onClick={() => void onCopy()}>
      {copied ? copiedLabel : copyLabel}
    </Button>
  )
}

export default function AffiliateLinksPage() {
  const locale = useStorefrontLocale()
  const [links, setLinks] = useState<AffiliateLink[]>([])
  const [titles, setTitles] = useState<Map<string, string>>(new Map())
  const [coupons, setCoupons] = useState<AffiliateCoupon[]>([])
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [l, c] = await Promise.all([
      listAffiliateLinks(),
      listAffiliateCoupons(),
    ])
    let nextTitles = new Map<string, string>()
    try {
      nextTitles = await resolveAffiliateProductTitles(
        l.links.map((link) => link.target_url)
      )
    } catch {
      nextTitles = new Map()
    }
    setTitles(nextTitles)
    setLinks(l.links)
    setCoupons(c.coupons)
  }, [])

  useEffect(() => {
    let cancelled = false
    reload().catch((err: unknown) => {
      if (cancelled) return
      setError(
        err instanceof AffiliateApiError
          ? err.message
          : t("affLinksLoadFailed", locale)
      )
    })
    return () => {
      cancelled = true
    }
  }, [reload, locale])

  async function ensureCoupon() {
    setError(null)
    try {
      if (coupons.length === 0) {
        await createAffiliateCoupon()
        await reload()
      }
    } catch (err: unknown) {
      setError(
        err instanceof AffiliateApiError
          ? err.message
          : t("affCouponCreateFailed", locale)
      )
    }
  }

  const primaryCoupon = coupons[0] ?? null

  return (
    <AffiliateGate
      breadcrumb={[
        { label: t("affiliateNavDashboard", locale), href: "/affiliate/dashboard" },
        { label: t("affiliateNavLinks", locale) },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        {t("affiliateNavLinks", locale)}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        {t("affLinksIntro", locale)}
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-md border border-wf-300">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-wf-100 text-wf-700">
            <tr>
              <th className="px-3 py-2 font-semibold">
                {t("affProductCol", locale)}
              </th>
              <th className="px-3 py-2 font-semibold">
                {t("affCreated", locale)}
              </th>
              <th className="px-3 py-2 font-semibold">
                {t("affActions", locale)}
              </th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-wf-600">
                  {t("affLinksEmpty", locale)}
                </td>
              </tr>
            ) : (
              links.map((link) => {
                const share = buildAffiliateShareUrl(
                  link.target_url,
                  link.tracking_param
                )
                return (
                  <tr key={link.id} className="border-t border-wf-200">
                    <td className="px-3 py-2.5">
                      <AffiliateProductLabel
                        targetUrl={link.target_url}
                        title={titleForAffiliateTarget(
                          link.target_url,
                          titles,
                          t("affUnknownProduct", locale)
                        )}
                        trackingParam={link.tracking_param}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {new Date(link.created_at).toLocaleDateString(
                        storefrontIntlLocale(locale),
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <CopyButton
                        text={share}
                        copyLabel={t("affCopyLink", locale)}
                        copiedLabel={t("affProductCopied", locale)}
                      />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-sm font-bold text-wf-900">
        {t("affCouponHeading", locale)}
      </h2>
      {primaryCoupon ? (
        <div className="mt-3 max-w-md rounded-md border border-wf-300 px-4 py-3 text-xs">
          <div className="flex justify-between gap-3 border-b border-wf-200 py-2">
            <span className="text-wf-600">{t("affCouponCode", locale)}</span>
            <span className="font-semibold text-wf-900">
              {primaryCoupon.code}
            </span>
          </div>
          <div className="flex justify-between gap-3 py-2">
            <span className="text-wf-600">{t("affCouponPurpose", locale)}</span>
            <span className="text-right text-wf-900">
              {t("affCouponPurposeValue", locale)}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <Button type="button" size="sm" onClick={() => void ensureCoupon()}>
            {t("affCouponCreate", locale)}
          </Button>
        </div>
      )}
    </AffiliateGate>
  )
}
