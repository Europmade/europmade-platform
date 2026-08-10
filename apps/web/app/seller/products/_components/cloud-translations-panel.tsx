"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Badge, Notice } from "@europmade/ui"
import {
  listOwnProducts,
  ProductCloudApiError,
  type CatalogProduct,
} from "../../_lib/product-cloud-api"
import { useStorefrontLocale } from "../../../_lib/i18n/use-storefront-locale"
import { t } from "../../../_lib/i18n/messages"

/**
 * Live Product Cloud products — link to translation status / source language.
 */
export function SellerCloudTranslationsPanel() {
  const locale = useStorefrontLocale()
  const [products, setProducts] = useState<CatalogProduct[] | "loading">(
    "loading"
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listOwnProducts()
      .then((res) => {
        if (!cancelled) setProducts(res.products)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof ProductCloudApiError
            ? err.message
            : t("sellerTranslationsLoadError", locale)
        )
        setProducts([])
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  return (
    <section className="mb-5 rounded-lg border border-wf-300 bg-white px-5 py-4">
      <h2 className="text-xs font-semibold text-wf-900">
        {t("sellerTranslationsCloudHeading", locale)}
      </h2>
      <p className="mt-1 text-[11px] text-wf-600">
        {t("sellerTranslationsIntro", locale)}
      </p>

      {error ? (
        <Notice variant="warning" className="mt-3">
          {error}
        </Notice>
      ) : null}

      {products === "loading" ? (
        <p className="mt-3 text-[11px] text-wf-600">…</p>
      ) : products.length === 0 ? (
        <p className="mt-3 text-[11px] text-wf-600">
          {t("sellerTranslationsNoProducts", locale)}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-wf-200">
          {products.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
            >
              <div>
                <span className="font-semibold text-wf-900">
                  {p.title ?? p.id}
                </span>
                <Badge variant="outline" className="ml-2">
                  {p.lifecycle_status}
                </Badge>
              </div>
              <Link
                href={`/seller/products/${p.id}/translations`}
                className="font-semibold text-wf-900 underline"
              >
                {t("sellerTranslationsOpen", locale)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
