import Link from "next/link"
import { Badge } from "@europmade/ui"
import {
  HOMEPAGE_CATEGORIES,
  HOMEPAGE_FEATURED_PRODUCTS,
  HOMEPAGE_FOOTER_LINKS,
  HOMEPAGE_NAV_LINKS,
  HOMEPAGE_RETAILERS,
  HOMEPAGE_STORY_LINKS,
  HOMEPAGE_TRUST_ITEMS,
} from "../../_lib/homepage-content"
import { AdSlot } from "./ad-slot"
import { NewsletterForm } from "./newsletter-form"
import { SearchForm } from "./search-form"

/**
 * Homepage — 1-op-1 sectiestructuur uit sprint-1a/03-homepage-*.html + homepage/spec.md.
 */
export function Homepage() {
  return (
    <div className="min-h-screen bg-wf-100 text-wf-800">
      <div className="mx-auto max-w-[1160px] border border-wf-400 bg-white">
        {/* 1 — Header (CMP-001) */}
        <header className="flex items-center gap-3 border-b border-wf-300 px-4 py-3.5 tablet:gap-5 tablet:px-8">
          <Link href="/" className="shrink-0" aria-label="EuropMade home">
            <div
              className="h-[26px] w-[110px] rounded-sm bg-wf-300 tablet:w-[130px]"
              role="img"
              aria-label="EuropMade logo"
            />
          </Link>
          <div className="hidden min-w-0 flex-1 tablet:block">
            <SearchForm
              variant="header"
              placeholder="Zoek naar producten, merken, categorieën…"
            />
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs text-wf-600 tablet:gap-4">
            <span aria-label="Taal en valuta">NL · €</span>
            <Link
              href="/account"
              className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-wf-200"
              aria-label="Account"
              title="Account"
            />
            <Link
              href="/cart"
              className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-wf-200"
              aria-label="Winkelwagen"
              title="Winkelwagen"
            />
          </div>
        </header>
        <nav
          className="hidden gap-[22px] border-b border-wf-200 px-8 pb-3 text-[13px] text-wf-700 tablet:flex"
          aria-label="Hoofdnavigatie"
        >
          {HOMEPAGE_NAV_LINKS.map((item) => {
            const catalogPending =
              item.href === "/categorie" || item.href.startsWith("/categorie/")
            if (catalogPending) {
              return (
                <span
                  key={item.href}
                  className="cursor-not-allowed text-wf-400"
                  title="Binnenkort beschikbaar"
                  aria-disabled="true"
                >
                  {item.label}
                  {item.label === "Categorieën" ? " ▾" : ""}
                </span>
              )
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-wf-900 hover:underline"
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* 2 — Hero */}
        <section className="bg-wf-100 px-4 py-10 text-center tablet:px-8 tablet:py-14">
          <h1 className="mx-auto max-w-[680px] text-[26px] font-bold leading-tight text-wf-900 tablet:text-[34px]">
            Europese producten, rechtstreeks van de makers
          </h1>
          <p className="mx-auto mt-3 max-w-[560px] text-sm text-wf-700 tablet:text-[15px]">
            <span className="tablet:hidden">
              Weet precies wie iets maakt en bij wie je koopt.
            </span>
            <span className="hidden tablet:inline">
              EuropMade is de marketplace waar je precies weet wie iets maakt,
              waar het vandaan komt, en bij wie je koopt — vergelijk aanbieders,
              koop veilig.
            </span>
          </p>
          <div className="mt-6">
            <SearchForm
              variant="hero"
              placeholder="Zoek naar producten, merken, categorieën…"
            />
          </div>
          <div className="flex flex-wrap justify-center gap-2.5">
            <Badge variant="solid">100% Europese productie</Badge>
            <Badge variant="outline" className="tablet:hidden">
              Verified™
            </Badge>
            <Badge variant="outline" className="hidden tablet:inline-flex">
              Verified™ productinformatie
            </Badge>
            <Badge variant="outline" className="hidden tablet:inline-flex">
              Veilig betalen
            </Badge>
          </div>
        </section>

        {/* 3 — Trust Bar */}
        <section
          className="flex flex-col items-start justify-center gap-3 border-b border-wf-200 px-4 py-5 tablet:flex-row tablet:flex-wrap tablet:items-center tablet:gap-7 tablet:px-8"
          aria-label="Vertrouwenssignalen"
        >
          {HOMEPAGE_TRUST_ITEMS.map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 text-[12.5px] text-wf-700"
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full bg-wf-700"
                aria-hidden
              />
              <span>
                {item.includes("Veilig betalen") ? (
                  <>
                    <span className="tablet:hidden">Veilig betalen</span>
                    <span className="hidden tablet:inline">{item}</span>
                  </>
                ) : (
                  item
                )}
              </span>
            </div>
          ))}
        </section>

        {/* 4 — Categorieën (CMP-032) — Catalog/Search nog niet live */}
        <section className="px-4 py-8 tablet:px-8 tablet:py-10">
          <h2 className="mb-5 text-lg font-bold text-wf-900 tablet:text-xl">
            Populaire categorieën
          </h2>
          <ul className="flex gap-3 overflow-x-auto pb-1 tablet:grid tablet:grid-cols-4 tablet:gap-3 tablet:overflow-visible desktop:grid-cols-6 desktop:gap-4">
            {HOMEPAGE_CATEGORIES.map((cat) => (
              <li
                key={cat.slug}
                className="min-w-[110px] flex-none tablet:min-w-0"
              >
                <div
                  className="cursor-not-allowed rounded-lg border border-wf-300 bg-wf-100 px-2.5 py-4 text-center opacity-80"
                  aria-disabled="true"
                  title="Binnenkort beschikbaar"
                >
                  <span
                    className="mx-auto mb-2.5 block h-11 w-11 rounded-full bg-wf-200"
                    aria-hidden
                  />
                  <span className="block text-xs font-semibold text-wf-800">
                    {cat.label}
                  </span>
                  <span className="mt-1.5 block text-[10px] font-medium text-wf-500">
                    Binnenkort beschikbaar
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 5 — Uitgelichte producten (CMP-017) */}
        <section className="px-4 py-8 tablet:px-8 tablet:py-10">
          <h2 className="mb-1 text-lg font-bold text-wf-900 tablet:text-xl">
            Uitgelicht deze week
          </h2>
          <p className="mb-5 text-[13px] text-wf-600">
            <span className="tablet:hidden">Nooit gesponsord</span>
            <span className="hidden tablet:inline">
              Bestverkocht en hoogst beoordeeld — nooit gesponsord
            </span>
          </p>
          <ul className="flex gap-4 overflow-x-auto pb-1 tablet:grid tablet:grid-cols-3 tablet:gap-3.5 tablet:overflow-visible desktop:grid-cols-4 desktop:gap-5">
            {HOMEPAGE_FEATURED_PRODUCTS.map((product) => (
              <li
                key={product.title}
                className="w-[200px] flex-none rounded-lg border border-wf-300 p-3.5 tablet:w-auto"
              >
                {/* Geen product-URL tot Catalog/Search product-IDs levert */}
                <div
                  className="mb-2.5 h-[140px] rounded-md bg-wf-100"
                  aria-hidden
                />
                <div className="mb-2 flex flex-wrap gap-1">
                  {product.verified ? (
                    <Badge variant="solid">Verified™</Badge>
                  ) : null}
                </div>
                <p className="mb-1 text-[13px] font-semibold text-wf-800">
                  {product.title}
                </p>
                <p className="text-[15px] font-bold text-wf-900">
                  {product.priceLabel}
                </p>
                <p className="mt-1 text-[11px] text-wf-600">
                  {product.ratingLabel}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* 6 — Ad positie 1 */}
        <div className="py-6 tablet:py-8">
          <AdSlot position={1} />
        </div>

        {/* 7 — Retailers (CMP-015) */}
        <section className="px-4 py-8 tablet:px-8 tablet:py-10">
          <h2 className="mb-1 text-lg font-bold text-wf-900 tablet:text-xl">
            <span className="tablet:hidden">Europese makers</span>
            <span className="hidden tablet:inline">
              Europese makers om te ontdekken
            </span>
          </h2>
          <p className="mb-5 text-[13px] text-wf-600">
            <span className="tablet:hidden">Roterende selectie</span>
            <span className="hidden tablet:inline">
              Roterende selectie — nooit een vaste lijst, zelfde
              eerlijkheidsprincipe als de Buy Box
            </span>
          </p>
          <ul className="flex flex-col gap-3 tablet:grid tablet:grid-cols-2 tablet:gap-3.5 desktop:grid-cols-3 desktop:gap-5">
            {HOMEPAGE_RETAILERS.map((retailer) => (
              <li
                key={retailer.name}
                className="rounded-lg border border-wf-300 p-[18px]"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-10 w-10 shrink-0 rounded-full bg-wf-300"
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-bold text-wf-900">
                      {retailer.name}
                    </p>
                    <p className="text-[11.5px] text-wf-600">{retailer.meta}</p>
                  </div>
                </div>
                <p className="mt-2.5 text-xs text-wf-700">
                  {retailer.description}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* 8 — Ad positie 2 */}
        <div className="py-6 tablet:py-8">
          <AdSlot position={2} />
        </div>

        {/* 9 — Made in Europe / SEO */}
        <section className="px-4 py-8 tablet:px-8 tablet:py-10">
          <div className="grid items-center gap-6 tablet:grid-cols-2 tablet:gap-8">
            <div
              className="h-[180px] rounded-lg border border-wf-300 bg-wf-100 tablet:h-[220px]"
              role="img"
              aria-label="Made in Europe"
            />
            <div>
              <h2 className="mb-3 text-lg font-bold text-wf-900 tablet:text-xl">
                Waarom EuropMade
              </h2>
              <p className="text-[13px] leading-relaxed text-wf-700">
                <span className="tablet:hidden">
                  Uitsluitend producten die daadwerkelijk in Europa zijn
                  geproduceerd, met gecontroleerde herkomstinformatie.
                </span>
                <span className="hidden tablet:inline">
                  EuropMade toont uitsluitend producten die daadwerkelijk in
                  Europa zijn geproduceerd. Elke productpagina bevat gecontroleerde
                  informatie over herkomst, producent en materiaal — geen verborgen
                  import, geen misleidende claims.
                </span>
              </p>
              <ul className="mt-4 flex flex-wrap gap-2.5">
                {HOMEPAGE_STORY_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-block rounded-lg border border-wf-300 px-3.5 py-2 text-xs font-semibold text-wf-800 hover:border-wf-500"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 10 — Nieuwsbrief */}
        <section className="bg-wf-900 px-4 py-10 text-center text-white tablet:px-8">
          <h2 className="mb-2 text-lg font-bold text-white tablet:text-xl">
            Blijf op de hoogte
          </h2>
          <p className="mb-[18px] text-[13px] text-wf-300">
            <span className="tablet:hidden">
              Nieuwe Europese merken, direct in je inbox.
            </span>
            <span className="hidden tablet:inline">
              Nieuwe Europese merken en producten, direct in je inbox.
            </span>
          </p>
          <NewsletterForm />
        </section>

        {/* 11 — Footer (CMP-002) */}
        <footer className="flex flex-wrap gap-4 border-t border-wf-300 px-4 py-6 text-[11px] text-wf-500 tablet:gap-8 tablet:px-8">
          {HOMEPAGE_FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-wf-700 hover:underline"
            >
              {link.label}
            </Link>
          ))}
          <span className="hidden tablet:inline" aria-label="Taal en valuta">
            NL · €
          </span>
        </footer>
      </div>
    </div>
  )
}
