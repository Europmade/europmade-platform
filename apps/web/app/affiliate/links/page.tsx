"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Button, Input, Notice } from "@europmade/ui"
import { AffiliateGate } from "../_components/affiliate-gate"
import {
  AffiliateApiError,
  createAffiliateCoupon,
  createAffiliateLink,
  listAffiliateCoupons,
  listAffiliateLinks,
  type AffiliateCoupon,
  type AffiliateLink,
} from "../../_lib/affiliate-api"

/**
 * Referral Links & Coupons — affiliate-05 (S3-07-05).
 */
export default function AffiliateLinksPage() {
  const [links, setLinks] = useState<AffiliateLink[]>([])
  const [coupons, setCoupons] = useState<AffiliateCoupon[]>([])
  const [targetUrl, setTargetUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const reload = useCallback(async () => {
    const [l, c] = await Promise.all([
      listAffiliateLinks(),
      listAffiliateCoupons(),
    ])
    setLinks(l.links)
    setCoupons(c.coupons)
  }, [])

  useEffect(() => {
    let cancelled = false
    reload()
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof AffiliateApiError
            ? err.message
            : "Links laden mislukt."
        )
      })
    return () => {
      cancelled = true
    }
  }, [reload])

  async function handleCreateLink(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setCreating(true)
    try {
      await createAffiliateLink(targetUrl.trim())
      setTargetUrl("")
      await reload()
    } catch (err: unknown) {
      setError(
        err instanceof AffiliateApiError
          ? err.message
          : "Link genereren mislukt."
      )
    } finally {
      setCreating(false)
    }
  }

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
          : "Coupon aanmaken mislukt."
      )
    }
  }

  const primaryCoupon = coupons[0] ?? null

  return (
    <AffiliateGate
      breadcrumb={[
        { label: "Affiliate Dashboard", href: "/affiliate" },
        { label: "Referral Links & Coupons" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">
        Referral Links & Coupons
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Beheer je trackinglinks en coupon-codes.
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      <h2 className="mt-6 text-sm font-bold text-wf-900">
        Nieuwe trackinglink
      </h2>
      <form
        onSubmit={(e) => void handleCreateLink(e)}
        className="mt-3 max-w-lg space-y-3"
      >
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-wf-700">
            Doel-URL
          </label>
          <Input
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://europmade.eu/product/..."
            required
          />
        </div>
        <Button type="submit" size="sm" disabled={creating}>
          {creating ? "Genereren…" : "Link genereren"}
        </Button>
      </form>

      <h2 className="mt-8 text-sm font-bold text-wf-900">Jouw links</h2>
      <div className="mt-3 overflow-x-auto rounded-md border border-wf-300">
        <table className="w-full min-w-[480px] border-collapse text-left text-xs">
          <thead className="bg-wf-100 text-wf-700">
            <tr>
              <th className="px-3 py-2 font-semibold">Link</th>
              <th className="px-3 py-2 font-semibold">Aangemaakt</th>
              <th className="px-3 py-2 font-semibold">Param</th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-wf-600">
                  Nog geen links.
                </td>
              </tr>
            ) : (
              links.map((link) => (
                <tr key={link.id} className="border-t border-wf-200">
                  <td className="px-3 py-2.5">
                    {link.target_url}
                    {link.target_url.includes("?") ? "&" : "?"}
                    ref={link.tracking_param}
                  </td>
                  <td className="px-3 py-2.5">
                    {new Date(link.created_at).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px]">
                    {link.tracking_param}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-sm font-bold text-wf-900">Jouw coupon-code</h2>
      {primaryCoupon ? (
        <div className="mt-3 max-w-md rounded-md border border-wf-300 px-4 py-3 text-xs">
          <div className="flex justify-between gap-3 border-b border-wf-200 py-2">
            <span className="text-wf-600">Code</span>
            <span className="font-semibold text-wf-900">
              {primaryCoupon.code}
            </span>
          </div>
          <div className="flex justify-between gap-3 py-2">
            <span className="text-wf-600">Doel</span>
            <span className="text-right text-wf-900">
              Attributie zonder cookie
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <Button type="button" size="sm" onClick={() => void ensureCoupon()}>
            Coupon-code aanmaken
          </Button>
        </div>
      )}
    </AffiliateGate>
  )
}
