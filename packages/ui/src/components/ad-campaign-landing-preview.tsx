import * as React from "react"
import { cn } from "@europmade/utils"
import {
  AdCampaignBanner,
  type AdCampaignBannerProps,
} from "./ad-campaign-banner"

export type AdCampaignLandingProduct = {
  id: string
  title: string | null
  image_url?: string | null
  href?: string | null
}

export type AdCampaignLandingPreviewProps = {
  banner: AdCampaignBannerProps
  sellerName: string
  products: AdCampaignLandingProduct[]
  discoverHeading?: string
  moreProductsLabel?: string
  moreProductsHref?: string | null
  className?: string
  /** When false, product tiles are non-interactive (preview). */
  linkProducts?: boolean
}

/**
 * Full campaign landing preview: banner → seller → selected products → more link.
 */
export function AdCampaignLandingPreview({
  banner,
  sellerName,
  products,
  discoverHeading = "Ontdek onze producten",
  moreProductsLabel = "Bekijk meer producten van deze verkoper →",
  moreProductsHref,
  className,
  linkProducts = true,
}: AdCampaignLandingPreviewProps) {
  return (
    <div className={cn("space-y-8", className)}>
      <AdCampaignBanner {...banner} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          {sellerName}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">{discoverHeading}</p>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-neutral-500">Geen producten geselecteerd.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => {
            const inner = (
              <>
                <div className="aspect-square overflow-hidden bg-neutral-100">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt=""
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                      —
                    </div>
                  )}
                </div>
                <div className="p-2.5 text-sm font-medium text-neutral-900 line-clamp-2">
                  {p.title || p.id}
                </div>
              </>
            )
            const tileClass =
              "overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:border-neutral-400"
            if (linkProducts && p.href) {
              return (
                <a key={p.id} href={p.href} className={tileClass}>
                  {inner}
                </a>
              )
            }
            return (
              <div key={p.id} className={tileClass}>
                {inner}
              </div>
            )
          })}
        </div>
      )}

      {moreProductsHref ? (
        <div>
          <a
            href={moreProductsHref}
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            {moreProductsLabel}
          </a>
        </div>
      ) : (
        <p className="text-sm font-semibold text-neutral-700">
          {moreProductsLabel}
        </p>
      )}
    </div>
  )
}
