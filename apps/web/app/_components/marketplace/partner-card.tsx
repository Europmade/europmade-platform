import Link from "next/link"
import {
  findPartnerProfile,
  partnerCoverStyle,
  partnerLogoStyle,
} from "../../_lib/partner-profiles"
import { HOMEPAGE_RETAILERS } from "../../_lib/homepage-content"
import { starsForRating } from "../../_lib/listing-products"

/**
 * CMP-015 Partner / producentkaart — ~20% compacter, premium uitstraling.
 */
export function PartnerCard({
  slug,
  name,
  country,
  rating,
  productCount,
}: {
  slug: string
  name: string
  country: string
  rating: number
  productCount: number
}) {
  const profile = findPartnerProfile(slug)
  const resolvedCountry = country || profile?.productionCountry || "Europa"
  const resolvedRating = rating || profile?.rating || 4.5
  const count = productCount || profile?.productCountHint || 12

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-wf-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-wf-300 hover:shadow-md">
      <div
        className="relative h-20 w-full tablet:h-24"
        style={partnerCoverStyle(slug)}
        role="img"
        aria-label={`Cover ${name}`}
      >
        <div
          className="absolute -bottom-4 left-3 h-11 w-11 rounded-lg border-2 border-white shadow-md"
          style={partnerLogoStyle(slug)}
          role="img"
          aria-label={`Logo ${name}`}
        />
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-6">
        <h3 className="text-[13.5px] font-bold text-wf-900">{name}</h3>
        <p className="mt-0.5 text-[11px] text-wf-600">{resolvedCountry}</p>
        <p className="mt-1.5 text-[11px] text-wf-700">
          <span className="tracking-tighter text-wf-800" aria-hidden>
            {starsForRating(resolvedRating)}
          </span>{" "}
          <span className="font-semibold">
            {resolvedRating.toFixed(1).replace(".", ",")}
          </span>
          <span className="text-wf-500">
            {" "}
            · {count} product{count === 1 ? "" : "en"}
          </span>
        </p>
        <Link
          href={`/partner/${slug}`}
          className="mt-2.5 inline-flex h-8 items-center justify-center rounded-lg border border-wf-300 bg-white px-2.5 text-[12px] font-semibold text-wf-800 transition group-hover:border-wf-900 group-hover:bg-wf-900 group-hover:text-white"
        >
          Bekijk producent
        </Link>
      </div>
    </article>
  )
}

export function HomepageProducerGrid() {
  return (
    <ul className="grid grid-cols-1 gap-3 tablet:grid-cols-2 desktop:grid-cols-3 desktop:gap-4">
      {HOMEPAGE_RETAILERS.map((r) => (
        <li key={r.slug}>
          <PartnerCard
            slug={r.slug}
            name={r.name}
            country={r.country}
            rating={r.rating}
            productCount={r.productCount}
          />
        </li>
      ))}
    </ul>
  )
}
