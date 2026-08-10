import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge } from "@europmade/ui"
import { PublicStorefrontChrome } from "../../_components/marketplace/public-storefront-chrome"
import { ProductCard } from "../../_components/marketplace/product-card"
import { ProductRails } from "../../_components/cart/product-rails"
import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"
import {
  findPartnerProfile,
  listPartnerProfiles,
  partnerCoverStyle,
  partnerLogoStyle,
  productsForPartner,
} from "../../_lib/partner-profiles"
import { resolveListingProducts } from "../../_lib/storefront-catalog"
import { starsForRating } from "../../_lib/listing-products"

type PartnerPageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return listPartnerProfiles().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: PartnerPageProps): Promise<Metadata> {
  const { slug } = await params
  const partner = findPartnerProfile(slug)
  if (!partner) return { title: "Partner niet gevonden — EuropMade" }
  return {
    title: `${partner.name} — Marketplace Partner — EuropMade`,
    description: partner.description,
    alternates: { canonical: `/partner/${partner.slug}` },
  }
}

export default async function PartnerPage({ params }: PartnerPageProps) {
  const { slug } = await params
  const partner = findPartnerProfile(slug)
  if (!partner) notFound()

  const locale = await getStorefrontLocaleFromCookies()
  const { products: catalog } = await resolveListingProducts({ locale })
  let products = productsForPartner(partner, catalog)
  if (products.length === 0) {
    products = catalog.slice(0, 12)
  }

  const newest = [...products].slice(0, 8)
  const bestSold = [...products]
    .sort((a, b) => b.offerCount - a.offerCount || b.rating - a.rating)
    .slice(0, 8)
  const deals = products
    .filter((p) => p.originalPriceCents && p.originalPriceCents > p.priceCents)
    .slice(0, 8)

  return (
    <PublicStorefrontChrome locale={locale}>
      <div className="relative">
        <div
          className="h-40 w-full tablet:h-52 desktop:h-60"
          style={partnerCoverStyle(partner.slug)}
          role="img"
          aria-label={`Cover van ${partner.name}`}
        />
        <div className="mx-auto max-w-[1160px] px-4 tablet:px-8">
          <div className="-mt-12 flex flex-col gap-4 tablet:-mt-14 tablet:flex-row tablet:items-end">
            <div
              className="h-24 w-24 shrink-0 rounded-2xl border-4 border-white shadow-lg tablet:h-28 tablet:w-28"
              style={partnerLogoStyle(partner.slug)}
              role="img"
              aria-label={`Logo ${partner.name}`}
            />
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[26px] font-bold tracking-tight text-wf-900 tablet:text-[30px]">
                  {partner.name}
                </h1>
                {partner.verified ? (
                  <Link href="/verified">
                    <span className="inline-flex items-center rounded-full border border-wf-900 bg-wf-900 px-2.5 py-1 text-[11px] font-bold text-white">
                      EU Verified Partner
                    </span>
                  </Link>
                ) : null}
              </div>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-wf-700">
                {partner.description}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 tablet:grid-cols-2 desktop:grid-cols-4">
            {[
              { label: "Productieland", value: partner.productionCountry },
              { label: "Vestigingsland", value: partner.hqCountry },
              { label: "Opgericht", value: String(partner.foundedYear) },
              {
                label: "Producten",
                value: String(products.length || partner.productCountHint || "—"),
              },
              {
                label: "Beoordeling",
                value: `${starsForRating(partner.rating)} ${partner.rating
                  .toFixed(1)
                  .replace(".", ",")} (${partner.reviewCount})`,
              },
              { label: "Levertijd", value: partner.avgDelivery },
              { label: "Retour", value: partner.returnsPolicy },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-wf-200 bg-white px-3.5 py-3 shadow-sm"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-wf-500">
                  {row.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-wf-900">{row.value}</p>
              </div>
            ))}
            {partner.website ? (
              <div className="rounded-xl border border-wf-200 bg-white px-3.5 py-3 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-wf-500">
                  Website
                </p>
                <a
                  href={partner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm font-semibold text-wf-900 underline-offset-2 hover:underline"
                >
                  Bezoek website ›
                </a>
              </div>
            ) : null}
          </div>

          {partner.social?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {partner.social.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-wf-300 px-3 py-1 text-xs font-semibold text-wf-700 hover:border-wf-700"
                >
                  {s.label}
                </a>
              ))}
            </div>
          ) : null}

          <ProductRails title="Nieuw binnen" products={newest} />
          <ProductRails title="Best verkocht" products={bestSold} />
          {deals.length ? (
            <ProductRails title="Aanbiedingen" products={deals} />
          ) : null}

          <section className="mt-10 pb-12">
            <div className="mb-4 flex items-end justify-between gap-3 border-b border-wf-200 pb-2.5">
              <h2 className="text-lg font-bold text-wf-900">
                Alle producten van {partner.name}
              </h2>
              <Badge variant="outline">{products.length} producten</Badge>
            </div>
            {products.length === 0 ? (
              <p className="text-sm text-wf-600">
                Deze partner heeft momenteel geen zichtbare producten.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 tablet:grid-cols-3 desktop:grid-cols-4 desktop:gap-4">
                {products.map((p) => (
                  <li key={p.slug} className="min-h-0">
                    <ProductCard product={p} layout="grid" locale={locale} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </PublicStorefrontChrome>
  )
}
