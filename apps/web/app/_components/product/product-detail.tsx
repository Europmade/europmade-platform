"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Badge, Button, Notice } from "@europmade/ui"
import {
  formatEuroFromCents,
  lowestOfferPriceLabel,
  type PdpDetail,
  type PdpOffer,
} from "../../_lib/pdp-seed"
import { findListingProduct, starsForRating } from "../../_lib/listing-products"
import { PublicStorefrontChrome } from "../marketplace/public-storefront-chrome"

type TabId =
  | "description"
  | "suitable"
  | "specs"
  | "downloads"
  | "product-reviews"
  | "seller-reviews"

/**
 * Productpagina + Buy Box — 1-op-1 sectiestructuur uit
 * sprint-1a/01-productpagina-buybox-{desktop,tablet,mobile}.html
 */
export function ProductDetailPage({ detail }: { detail: PdpDetail }) {
  const [activeThumb, setActiveThumb] = useState(0)
  const [colorId, setColorId] = useState(detail.selectedColorId)
  const [sizeId, setSizeId] = useState(detail.selectedSizeId)
  const [offers, setOffers] = useState<PdpOffer[]>(detail.offers)
  const [offersOpen, setOffersOpen] = useState(true)
  const [tab, setTab] = useState<TabId>("description")
  const [descExpanded, setDescExpanded] = useState(false)

  const selected = useMemo(
    () => offers.find((o) => o.selected) ?? offers[0],
    [offers]
  )

  function selectOffer(id: string) {
    setOffers((prev) => prev.map((o) => ({ ...o, selected: o.id === id })))
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "description", label: "Omschrijving" },
    { id: "suitable", label: "Geschikt voor" },
    { id: "specs", label: "Specificaties" },
    { id: "downloads", label: "Downloads" },
    {
      id: "product-reviews",
      label: `Productreviews (${detail.reviewCount})`,
    },
    {
      id: "seller-reviews",
      label: `Verkopersreviews (${selected.retailer} — ${detail.sellerReviewCount.toLocaleString("nl-NL")})`,
    },
  ]

  const related = detail.relatedSlugs
    .map((slug) => findListingProduct(slug))
    .filter(Boolean)

  return (
    <PublicStorefrontChrome>
      <nav
        className="px-4 pt-3.5 text-xs text-wf-500 tablet:px-8"
        aria-label="Breadcrumb"
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          {detail.breadcrumb.map((crumb, i) => (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 ? <span aria-hidden>&gt;</span> : null}
              {crumb.href && i < detail.breadcrumb.length - 1 ? (
                <Link href={crumb.href} className="hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={
                    i === detail.breadcrumb.length - 1
                      ? "font-semibold text-wf-800"
                      : undefined
                  }
                  aria-current={
                    i === detail.breadcrumb.length - 1 ? "page" : undefined
                  }
                >
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Hero grid: gallery | info | buybox */}
      <div className="grid gap-6 px-4 py-6 tablet:grid-cols-2 tablet:gap-7 tablet:px-8 tablet:pb-8 desktop:grid-cols-[1fr_1fr_380px] desktop:gap-8 desktop:pb-10">
        <div className="flex flex-col gap-2.5">
          <div
            className="flex h-[280px] items-center justify-center rounded-md border border-wf-300 bg-wf-100 text-xs text-wf-500 tablet:h-[320px] desktop:h-[380px]"
            role="img"
            aria-label={`Hoofdafbeelding ${detail.fullTitle}`}
          />
          <div className="hidden gap-2 tablet:flex">
            {Array.from({ length: detail.galleryCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveThumb(i)}
                className={`h-14 w-14 rounded border bg-wf-200 ${
                  activeThumb === i ? "border-wf-900" : "border-wf-300"
                }`}
                aria-label={`Miniatuur ${i + 1}`}
                aria-pressed={activeThumb === i}
              />
            ))}
          </div>
          <div className="flex justify-center gap-1.5 tablet:hidden" aria-hidden>
            {Array.from({ length: detail.galleryCount }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === activeThumb ? "bg-wf-800" : "bg-wf-300"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="m-0 text-[20px] font-bold leading-tight text-wf-900 tablet:text-[22px]">
            {detail.fullTitle}
          </h1>
          <p className="mt-1.5 text-xs text-wf-600">
            <span aria-hidden>{starsForRating(detail.listing.rating)} </span>
            {detail.listing.rating.toFixed(1).replace(".", ",")} —{" "}
            <strong className="text-wf-800">
              {detail.reviewCount} productreviews
            </strong>
            <span className="hidden tablet:inline">
              {" "}
              (beoordeling van het product, los van de aanbieder)
            </span>
          </p>
          <a
            href="#aanbieders"
            className="mt-3.5 inline-block rounded bg-wf-100 px-2.5 py-1.5 text-[13px] font-semibold text-wf-800"
          >
            Vanaf {lowestOfferPriceLabel(detail)} · {offers.length} aanbieders
            vergelijken ↓
          </a>

          <div className="mt-3.5 flex flex-wrap gap-2">
            {detail.listing.verified ? (
              <span className="inline-flex items-center rounded-full border border-wf-900 bg-wf-900 px-2.5 py-1 text-[11px] font-bold text-white">
                ✓ Verified™
              </span>
            ) : null}
            <Badge variant="link">
              Gemaakt in {detail.listing.countryLabel}
            </Badge>
            <Badge variant="link">Producent: {detail.manufacturer} ›</Badge>
            <Badge variant="outline">
              EU-eigendom: {detail.euOwnershipPercent}%{" "}
              <span
                className="ml-1 inline-flex h-[15px] w-[15px] items-center justify-center rounded-full border border-wf-500 text-[9.5px] text-wf-600"
                title="EU-eigendom geeft aan in welke mate de producent in Europese handen is — dit zegt niets over waar het product gemaakt is (zie 'Gemaakt in')."
              >
                ⓘ
              </span>
            </Badge>
            <Badge variant="outline">Merk: {detail.listing.brand}</Badge>
          </div>

          {detail.colorVariants.length > 0 ? (
            <div className="mt-4">
              <p className="mb-1.5 text-[11px] font-semibold text-wf-600">Kleur</p>
              <div className="flex flex-wrap gap-2">
                {detail.colorVariants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    disabled={v.disabled}
                    onClick={() => setColorId(v.id)}
                    className={`flex h-[34px] min-w-[38px] items-center justify-center rounded-[5px] border-[1.5px] px-2.5 disabled:border-wf-200 disabled:opacity-50 ${
                      colorId === v.id
                        ? "border-2 border-wf-900"
                        : "border-wf-400"
                    }`}
                    aria-pressed={colorId === v.id}
                    aria-label={`Kleur ${v.id}`}
                  >
                    <span
                      className="h-[26px] w-[26px] rounded-full border-[1.5px] border-wf-400"
                      style={{ background: v.color }}
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {detail.sizeVariants.length > 0 ? (
            <div className="mt-4">
              <p className="mb-1.5 text-[11px] font-semibold text-wf-600">
                Werkgebied
              </p>
              <div className="flex flex-wrap gap-2">
                {detail.sizeVariants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSizeId(v.id)}
                    className={`flex h-[34px] min-w-[38px] items-center justify-center rounded-[5px] px-2.5 text-xs ${
                      sizeId === v.id
                        ? "border-2 border-wf-900 font-bold text-wf-900"
                        : "border-[1.5px] border-wf-400 text-wf-700"
                    }`}
                    aria-pressed={sizeId === v.id}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <p className="mt-4 text-[13.5px] leading-relaxed text-wf-700">
            {detail.intro}
          </p>

          <div className="mt-4 border-t border-wf-200 pt-4">
            <p className="mb-2 text-[11px] uppercase tracking-wide text-wf-500">
              Kenmerken
            </p>
            <ul className="space-y-1.5">
              {detail.highlights.map((h) => (
                <li
                  key={h}
                  className="flex items-center gap-2 text-[13px] text-wf-700"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-wf-500" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Buy Box — desktop/tablet kolom; mobiel onder info */}
        <div className="desktop:sticky desktop:top-5 desktop:self-start">
          <BuyBox
            selected={selected}
            offerCount={offers.length}
            notice={detail.buyBoxNotice}
            onToggleOffers={() => {
              setOffersOpen(true)
              document
                .getElementById("aanbieders")
                ?.scrollIntoView({ behavior: "smooth" })
            }}
          />
        </div>
      </div>

      {/* Past goed bij */}
      <section className="px-4 pt-5 tablet:px-8">
        <h2 className="mb-3 text-sm font-bold text-wf-800">Past goed bij</h2>
        <ul className="grid grid-cols-1 gap-3.5 tablet:grid-cols-2 desktop:grid-cols-4">
          {detail.pairsWellWith.map((item) => (
            <li key={item.slug + item.title}>
              <Link
                href={`/product/${item.slug}`}
                className="flex items-center gap-2.5 rounded-lg border border-wf-300 p-2.5 hover:border-wf-500"
              >
                <span className="h-[52px] w-[52px] shrink-0 rounded-[5px] bg-wf-100" />
                <span>
                  <span className="block text-[11.5px] font-semibold text-wf-800">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] font-bold text-wf-900">
                    {formatEuroFromCents(item.priceCents)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Alle aanbieders */}
      <section id="aanbieders" className="px-4 py-5 tablet:px-8 tablet:pb-10">
        <h2 className="mb-3.5 border-b border-wf-200 pb-2.5 text-[17px] font-bold text-wf-900">
          Alle aanbieders ({offers.length})
        </h2>

        {/* Desktop/tablet table */}
        <div className="hidden overflow-x-auto tablet:block">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {[
                  "Aanbieder",
                  "Prijs",
                  "Levertijd",
                  "Verzending",
                  "Retour",
                  "Beoordeling",
                  "Voorraad",
                  "",
                ].map((h) => (
                  <th
                    key={h || "actie"}
                    className="border-b border-wf-400 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-wf-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr
                  key={o.id}
                  className={o.selected ? "bg-wf-100 font-semibold" : undefined}
                >
                  <td className="border-b border-wf-200 px-3 py-3 align-middle">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-[18px] w-[18px] rounded-full bg-wf-300" />
                      {o.retailer}
                      {o.selected ? (
                        <Badge variant="solid" className="ml-1 text-[10px]">
                          Geselecteerd
                        </Badge>
                      ) : null}
                    </span>
                  </td>
                  <td className="border-b border-wf-200 px-3 py-3">
                    {formatEuroFromCents(o.priceCents)}
                  </td>
                  <td className="border-b border-wf-200 px-3 py-3">
                    {o.delivery}
                  </td>
                  <td className="border-b border-wf-200 px-3 py-3">
                    {o.shipping}
                  </td>
                  <td className="border-b border-wf-200 px-3 py-3">
                    {o.returns}
                  </td>
                  <td className="border-b border-wf-200 px-3 py-3">
                    ★ {o.rating.toFixed(1).replace(".", ",")}
                  </td>
                  <td className="border-b border-wf-200 px-3 py-3">{o.stock}</td>
                  <td className="border-b border-wf-200 px-3 py-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => selectOffer(o.id)}
                    >
                      Deze aanbieder tonen
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile offer cards */}
        <ul className="space-y-2.5 tablet:hidden">
          {offers.map((o) => (
            <li
              key={o.id}
              className={`rounded-lg border p-3 ${
                o.selected ? "border-wf-800 bg-wf-100" : "border-wf-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs">
                  <span className="inline-block h-[18px] w-[18px] rounded-full bg-wf-300" />
                  {o.retailer}
                </span>
                {o.selected ? (
                  <Badge variant="solid" className="text-[10px]">
                    Geselecteerd
                  </Badge>
                ) : null}
              </div>
              <p className="mt-2 text-lg font-bold text-wf-900">
                {formatEuroFromCents(o.priceCents)}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline">{o.delivery}</Badge>
                <Badge variant="outline">{o.shipping}</Badge>
                <Badge variant="outline">{o.returns}</Badge>
                <Badge variant="outline">
                  ★ {o.rating.toFixed(1).replace(".", ",")}
                </Badge>
              </div>
              {!o.selected ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3 w-full"
                  onClick={() => selectOffer(o.id)}
                >
                  Deze aanbieder tonen
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {offersOpen ? null : null}
      </section>

      {/* Tabs */}
      <section className="px-4 pb-8 tablet:px-8 tablet:pb-10">
        <div
          className="mb-5 flex gap-0 overflow-x-auto border-b border-wf-300 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Productinformatie"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`shrink-0 snap-start px-[18px] py-2.5 text-[13px] ${
                tab === t.id
                  ? "border-b-2 border-wf-900 font-bold text-wf-900"
                  : "border-b-2 border-transparent text-wf-500"
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "description" ? (
          <div>
            <div
              className={`max-w-[760px] space-y-3.5 text-[13.5px] leading-relaxed text-wf-700 ${
                descExpanded ? "" : "relative max-h-[15.5em] overflow-hidden"
              }`}
            >
              {detail.descriptionParagraphs.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
            <button
              type="button"
              className="mt-3.5 rounded border border-wf-700 bg-white px-[18px] py-2 text-[12.5px] font-semibold text-wf-800"
              onClick={() => setDescExpanded((v) => !v)}
            >
              {descExpanded ? "Minder tonen ▴" : "Meer tonen ▾"}
            </button>
          </div>
        ) : null}

        {tab === "suitable" ? (
          <ul className="space-y-2">
            {detail.suitableFor.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-[13px] text-wf-700"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-wf-500" />
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        {tab === "specs" ? (
          <div>
            <table className="w-full max-w-[640px] border-collapse text-[13px]">
              <tbody>
                {detail.specs.map((row) => (
                  <tr key={row.label}>
                    <td className="w-[220px] border-b border-wf-200 py-2.5 text-wf-500">
                      {row.label}
                    </td>
                    <td className="border-b border-wf-200 py-2.5 text-wf-800">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link
              href="/klantenservice"
              className="mt-4 inline-block text-xs text-wf-700 underline decoration-dotted"
            >
              ⚑ Onjuistheid in deze productinformatie melden
            </Link>
          </div>
        ) : null}

        {tab === "downloads" ? (
          <ul className="max-w-[480px] space-y-2">
            {detail.downloads.map((d) => (
              <li key={d.filename}>
                <a
                  href={`#${d.filename}`}
                  className="flex items-center justify-between rounded border border-wf-300 px-3 py-2.5 text-[13px] text-wf-800 hover:border-wf-500"
                >
                  <span>{d.label}</span>
                  <span className="text-[11px] text-wf-500">{d.filename}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        {tab === "product-reviews" ? (
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <h3 className="m-0 text-sm font-bold">Productreviews</h3>
              <button
                type="button"
                className="rounded border border-wf-700 bg-white px-3.5 py-1.5 text-xs font-semibold text-wf-800"
              >
                + Review toevoegen
              </button>
            </div>
            <p className="mb-3 text-xs text-wf-600">
              {starsForRating(detail.listing.rating)}{" "}
              {detail.listing.rating.toFixed(1).replace(".", ",")} gemiddeld —{" "}
              {detail.reviewCount} reviews, over het product zelf
            </p>
            <ul>
              {detail.productReviews.map((r, i) => (
                <li
                  key={i}
                  className="border-t border-wf-200 py-2.5 text-xs text-wf-700"
                >
                  {starsForRating(r.stars)} &ldquo;{r.excerpt}&rdquo;{" "}
                  {r.verified ? (
                    <span className="ml-1.5 inline-block rounded-lg border border-wf-400 bg-wf-100 px-1.5 py-0.5 text-[10px] font-semibold text-wf-700">
                      ✓ Geverifieerde aankoop
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tab === "seller-reviews" ? (
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <h3 className="m-0 text-sm font-bold">
                Verkopersreviews — {selected.retailer}
              </h3>
              <button
                type="button"
                className="rounded border border-wf-700 bg-white px-3.5 py-1.5 text-xs font-semibold text-wf-800"
              >
                + Review toevoegen
              </button>
            </div>
            <p className="mb-3 text-xs text-wf-600">
              {starsForRating(detail.sellerReviewAvg)}{" "}
              {detail.sellerReviewAvg.toFixed(1).replace(".", ",")} gemiddeld —{" "}
              {detail.sellerReviewCount.toLocaleString("nl-NL")} reviews, over
              levering/service van deze aanbieder
            </p>
            <ul>
              {detail.sellerReviews.map((r, i) => (
                <li
                  key={i}
                  className="border-t border-wf-200 py-2.5 text-xs text-wf-700"
                >
                  {starsForRating(r.stars)} &ldquo;{r.excerpt}&rdquo;{" "}
                  {r.verified ? (
                    <span className="ml-1.5 inline-block rounded-lg border border-wf-400 bg-wf-100 px-1.5 py-0.5 text-[10px] font-semibold text-wf-700">
                      ✓ Geverifieerde aankoop
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {/* FAQ */}
      <section className="px-4 pb-8 tablet:px-8 tablet:pb-10">
        <h2 className="mb-3.5 border-b border-wf-200 pb-2.5 text-[17px] font-bold text-wf-900">
          Veelgestelde vragen
        </h2>
        <div className="max-w-[760px]">
          {detail.faqs.map((f) => (
            <div key={f.q} className="border-b border-wf-200 py-3 last:border-b-0">
              <p className="mb-1 text-[13.5px] font-bold text-wf-800">{f.q}</p>
              <p className="text-[13px] leading-relaxed text-wf-700">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Gerelateerde producten */}
      <section className="px-4 pb-10 tablet:px-8">
        <h2 className="mb-3.5 border-b border-wf-200 pb-2.5 text-[17px] font-bold text-wf-900">
          Gerelateerde producten
        </h2>
        <ul className="flex gap-4 overflow-x-auto pb-1 tablet:grid tablet:grid-cols-3 tablet:overflow-visible desktop:grid-cols-5 desktop:gap-4">
          {related.map((p) =>
            p ? (
              <li
                key={p.slug}
                className="w-[160px] flex-none tablet:w-auto"
              >
                <Link
                  href={`/product/${p.slug}`}
                  className="block rounded-md border border-wf-300 p-3 hover:border-wf-500"
                >
                  <span className="mb-2 block aspect-square rounded bg-wf-100" />
                  <span className="line-clamp-2 block text-[12.5px] font-semibold text-wf-800">
                    {p.title}
                  </span>
                  <span className="mt-1 block text-[13px] font-bold text-wf-900">
                    {formatEuroFromCents(p.priceCents)}
                  </span>
                </Link>
              </li>
            ) : null
          )}
        </ul>
      </section>

      {/* Sticky bottom bar — mobiel (CMP-028) */}
      <div className="sticky bottom-0 z-30 flex items-center gap-2.5 border-t border-wf-400 bg-white px-3.5 py-2.5 shadow-[0_-2px_6px_rgba(0,0,0,0.06)] tablet:hidden">
        <div className="shrink-0">
          <p className="text-base font-bold text-wf-900">
            {formatEuroFromCents(selected.priceCents)}
          </p>
          <p className="text-[9.5px] text-wf-600">
            {selected.retailer} · {selected.delivery.toLowerCase()}
          </p>
        </div>
        <Link href="/cart" className="min-w-0 flex-1">
          <Button type="button" variant="primary" className="w-full py-2.5 text-[12.5px]">
            In winkelwagen
          </Button>
        </Link>
      </div>
    </PublicStorefrontChrome>
  )
}

function BuyBox({
  selected,
  offerCount,
  notice,
  onToggleOffers,
}: {
  selected: PdpOffer
  offerCount: number
  notice: string
  onToggleOffers: () => void
}) {
  return (
    <aside
      className="rounded-lg border-2 border-wf-800 bg-white px-[22px] py-5"
      aria-label="Buy Box"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-wf-600">
          Automatisch geselecteerde aanbieding
        </span>
        <span
          className="inline-flex h-[15px] w-[15px] items-center justify-center rounded-full border border-wf-500 text-[9.5px] text-wf-600"
          title="Waarom deze aanbieder?"
        >
          ⓘ
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-wf-700">
        <span className="inline-block h-[18px] w-[18px] rounded-full bg-wf-300" />
        {selected.retailer}
        <span className="text-wf-500">
          ★ {selected.rating.toFixed(1).replace(".", ",")}
        </span>
      </div>
      <p className="mt-1.5 text-[30px] font-bold leading-none text-wf-900">
        {formatEuroFromCents(selected.priceCents)}
      </p>
      <div className="my-3.5 flex flex-wrap gap-1.5">
        <Badge variant="solid">{selected.delivery}</Badge>
        <Badge variant="outline">
          {selected.shipping === "Gratis"
            ? "Gratis verzending"
            : `Verzending ${selected.shipping}`}
        </Badge>
        <Badge variant="outline">{selected.stock}</Badge>
        <Badge variant="outline">{selected.returns} retour</Badge>
      </div>
      <Link href="/cart">
        <Button
          type="button"
          variant="primary"
          className="w-full py-3.5 text-sm"
        >
          In winkelwagen
        </Button>
      </Link>
      <Notice variant="info" className="mt-3 text-[11px]">
        ⓘ {notice}{" "}
        <Link href="/verified" className="text-wf-800 underline">
          Meer uitleg
        </Link>
      </Notice>
      <button
        type="button"
        className="mt-3.5 w-full border-t border-dashed border-wf-300 pt-3 text-center text-xs text-wf-700"
        onClick={onToggleOffers}
      >
        Alle {offerCount} aanbieders bekijken ▾
      </button>
      <div className="mt-4 flex flex-wrap gap-3.5 border-t border-wf-200 pt-3.5 text-[11px] text-wf-600">
        {["Veilig betalen", "30 dagen retour", "Verkocht via EuropMade"].map(
          (t) => (
            <div key={t} className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-wf-600" />
              {t}
            </div>
          )
        )}
      </div>
    </aside>
  )
}
