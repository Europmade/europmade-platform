"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { SellerShell } from "../_components/seller-shell"
import {
  listSellerBrands,
  type ManageableBrand,
  BrandApiError,
} from "../_lib/brands-api"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t } from "../../_lib/i18n/messages"

export default function SellerBrandsPage() {
  const locale = useStorefrontLocale()
  const [brands, setBrands] = useState<ManageableBrand[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await listSellerBrands()
        if (!cancelled) setBrands(res.brands)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof BrandApiError ? err.message : t("sellerBrandsEmpty", locale)
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

  return (
    <SellerGate>
      <SellerShell>
        <div className="mx-auto max-w-4xl px-4 py-6">
          <h1 className="text-xl font-bold text-wf-900">
            {t("sellerBrandsTitle", locale)}
          </h1>
          {loading ? (
            <p className="mt-4 text-sm text-wf-600">…</p>
          ) : error ? (
            <p className="mt-4 text-sm text-red-700">{error}</p>
          ) : brands.length === 0 ? (
            <p className="mt-4 text-sm text-wf-600">
              {t("sellerBrandsEmpty", locale)}
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {brands.map((brand) => (
                <li
                  key={brand.id}
                  className="flex items-center justify-between rounded-lg border border-wf-200 bg-white px-3 py-2.5"
                >
                  <div>
                    <p className="font-semibold text-wf-900">{brand.name}</p>
                    <p className="text-[11px] text-wf-500">
                      {brand.access_level} · /merk/{brand.slug}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/merk/${brand.slug}`}>
                      <Button type="button" variant="outline" size="sm">
                        {t("viewProductCta", locale)}
                      </Button>
                    </Link>
                    <Link href={`/seller/brands/${encodeURIComponent(brand.id)}`}>
                      <Button type="button" size="sm">
                        {t("sellerNavBrands", locale)}
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SellerShell>
    </SellerGate>
  )
}
