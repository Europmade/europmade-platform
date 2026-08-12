import Link from "next/link"
import {
  findPartnerProfile,
  partnerCoverStyle,
  partnerLogoStyle,
} from "../../_lib/partner-profiles"
import { HOMEPAGE_RETAILERS } from "../../_lib/homepage-content"
import { starsForRating } from "../../_lib/listing-products"

export function PartnerCard({
  slug,
  name,
  country,
  rating,
  productCount,
  viewLabel = "Bekijk producent",
  productsSuffix = "producten",
}: {
  slug: string
  name: string
  country: string
  rating: number
  productCount: number
  viewLabel?: string
  productsSuffix?: string
}) {
  const profile = findPartnerProfile(slug)
  const resolvedCountry = country || profile?.productionCountry || "Europa"
  const resolvedRating = rating || profile?.rating || 4.5
  const count = productCount || profile?.productCountHint || 12

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-wf-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-wf-300 hover:shadow-md">
      <div
        className="relative h-16 w-full tablet:h-[4.75rem]"
        style={partnerCoverStyle(slug)}
        role="img"
        aria-label={`Cover ${name}`}
      >
        <div
          className="absolute -bottom-3 left-2.5 h-9 w-9 rounded-lg border-2 border-white shadow-md"
          style={partnerLogoStyle(slug)}
          role="img"
          aria-label={`Logo ${name}`}
        />
      </div>
          <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-[18px]">
        <h3 className="text-[13px] font-bold leading-tight text-wf-900">
          {name}
        </h3>
        <p className="mt-0.5 text-[10.5px] text-wf-600">{resolvedCountry}</p>
        <p className="mt-1 text-[10.5px] text-wf-700">
          <span className="tracking-tighter text-wf-800" aria-hidden>
            {starsForRating(resolvedRating)}
          </span>{" "}
          <span className="font-semibold">
            {resolvedRating.toFixed(1).replace(".", ",")}
          </span>
          <span className="text-wf-500">
            {" "}
            · {count} {productsSuffix}
          </span>
        </p>
        <Link
          href={`/merk/${slug}`}
          className="mt-2 inline-flex h-7 items-center justify-center rounded-lg border border-wf-300 bg-white px-2 text-[11.5px] font-semibold text-wf-800 transition group-hover:border-wf-900 group-hover:bg-wf-900 group-hover:text-white"
        >
          {viewLabel}
        </Link>
      </div>
    </article>
  )
}

export function HomepageProducerGrid({
  partners,
  viewLabel,
  productsSuffix,
}: {
  partners?: Array<{
    slug: string
    name: string
    country: string
    rating: number
    productCount: number
  }>
  viewLabel?: string
  productsSuffix?: string
}) {
  const list = partners?.length
    ? partners
    : HOMEPAGE_RETAILERS.map((r) => ({
        slug: r.slug,
        name: r.name,
        country: r.country,
        rating: r.rating,
        productCount: r.productCount,
      }))

  return (
    <ul className="grid grid-cols-1 gap-2.5 tablet:grid-cols-2 desktop:grid-cols-3 desktop:gap-3">
      {list.map((r) => (
        <li key={r.slug}>
          <PartnerCard
            slug={r.slug}
            name={r.name}
            country={r.country}
            rating={r.rating}
            productCount={r.productCount}
            viewLabel={viewLabel}
            productsSuffix={productsSuffix}
          />
        </li>
      ))}
    </ul>
  )
}
