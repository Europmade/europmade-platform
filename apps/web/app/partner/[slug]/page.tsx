import type { Metadata } from "next"
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
import { resolveListingProducts, resolveSellerPage } from "../../_lib/storefront-catalog"
import { countryDisplayLabel } from "../../_lib/i18n/messages"

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
  const live = await resolveSellerPage(slug)
  if (live) {
    return {
      title: `${live.seller.name} — EuropMade`,
      description: `Informatie over ${live.seller.name}`,
      alternates: { canonical: `/partner/${live.seller.slug}` },
    }
  }
  const partner = findPartnerProfile(slug)
  if (!partner) return { title: "Seller niet gevonden — EuropMade" }
  return {
    title: `${partner.name} — Marketplace Partner — EuropMade`,
    description: partner.description,
    alternates: { canonical: `/partner/${partner.slug}` },
  }
}

export default async function PartnerPage({ params }: PartnerPageProps) {
  const { slug } = await params
  const locale = await getStorefrontLocaleFromCookies()
  const live = await resolveSellerPage(slug, locale)

  if (live) {
    const products = live.products
    const newest = [...products].slice(0, 8)
    return (
      <PublicStorefrontChrome locale={locale}>
        <div className="relative">
          {live.seller.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={live.seller.banner_url}
              alt=""
              className="h-40 w-full object-cover tablet:h-52 desktop:h-60"
            />
          ) : (
            <div
              className="h-40 w-full tablet:h-52 desktop:h-60"
              style={partnerCoverStyle(live.seller.slug)}
              role="img"
              aria-label={`Cover van ${live.seller.name}`}
            />
          )}
          <div className="mx-auto max-w-[1160px] px-4 tablet:px-8">
            <div className="-mt-12 flex flex-col gap-4 tablet:-mt-14 tablet:flex-row tablet:items-end">
              <div
                className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg tablet:h-28 tablet:w-28"
                style={live.seller.logo_url ? undefined : partnerLogoStyle(live.seller.slug)}
                role="img"
                aria-label={`Logo ${live.seller.name}`}
              >
                {live.seller.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={live.seller.logo_url}
                    alt=""
                    className="h-full w-full object-contain p-2"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <h1 className="text-[26px] font-bold tracking-tight text-wf-900 tablet:text-[30px]">
                  {live.seller.name}
                </h1>
                <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-wf-700">
                  Goedgekeurde seller op EuropMade.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 tablet:grid-cols-2 desktop:grid-cols-4">
              {[
                {
                  label: "Bedrijfsnaam",
                  value: live.seller.name,
                },
                {
                  label: "Land",
                  value: live.seller.country_code
                    ? countryDisplayLabel(live.seller.country_code, locale)
                    : "—",
                },
                {
                  label: "Contact",
                  value: live.seller.contact_email || "—",
                },
                {
                  label: "Producten",
                  value: String(live.seller.product_count),
                },
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
              {live.seller.website_url ? (
                <div className="rounded-xl border border-wf-200 bg-white px-3.5 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-wf-500">
                    Website
                  </p>
                  <a
                    href={live.seller.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm font-semibold text-wf-900 underline-offset-2 hover:underline"
                  >
                    Bezoek website ›
                  </a>
                </div>
              ) : null}
            </div>

            <ProductRails title="Producten van deze seller" products={newest} />

            <section className="mt-10 pb-12">
              <div className="mb-4 flex items-end justify-between gap-3 border-b border-wf-200 pb-2.5">
                <h2 className="text-lg font-bold text-wf-900">
                  Alle producten van {live.seller.name}
                </h2>
                <Badge variant="outline">{products.length} producten</Badge>
              </div>
              {products.length === 0 ? (
                <p className="text-sm text-wf-600">
                  Deze seller heeft momenteel geen zichtbare producten.
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

  const partner = findPartnerProfile(slug)
  if (!partner) notFound()

  const { products: catalog } = await resolveListingProducts({ locale })
  const products = productsForPartner(partner, catalog)
  const newest = [...products].slice(0, 8)

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
              <h1 className="text-[26px] font-bold tracking-tight text-wf-900 tablet:text-[30px]">
                {partner.name}
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-wf-700">
                {partner.description}
              </p>
            </div>
          </div>
          <ProductRails title="Producten" products={newest} />
        </div>
      </div>
    </PublicStorefrontChrome>
  )
}
