"use client"

import Link from "next/link"
import { useId, useState } from "react"
import {
  HOMEPAGE_NAV_LINKS,
} from "../../_lib/homepage-content"
import { MARKETPLACE_CATEGORIES } from "../../_lib/marketplace-categories"
import { SearchForm } from "../homepage/search-form"

type PublicHeaderProps = {
  searchQuery?: string
  /** Homepage toont hero-zoek al; header-zoek blijft op tablet+ (wireframe desktop). */
  alwaysShowSearch?: boolean
}

/**
 * CMP-001 Header (Publiek) — homepage-desktop wireframe + ux-architecture §4.1.
 * Inclusief categorie-navigatierij en mega-menu (30 hoofdcategorieën).
 */
export function PublicHeader({
  searchQuery = "",
  alwaysShowSearch = true,
}: PublicHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [megaOpen, setMegaOpen] = useState(false)
  const megaId = useId()
  const mobileNavId = useId()

  return (
    <>
      <header
        role="banner"
        className="flex items-center gap-3 border-b border-wf-300 px-4 py-3.5 tablet:gap-5 tablet:px-8"
      >
        <Link href="/" className="shrink-0" aria-label="EuropMade home">
          <div
            className="h-4 w-[70px] rounded-sm bg-wf-300 tablet:h-6 tablet:w-[120px]"
            role="img"
            aria-label="EuropMade logo"
          />
        </Link>

        <div
          className={`min-w-0 flex-1 ${alwaysShowSearch ? "" : "hidden tablet:block"}`}
        >
          <SearchForm
            variant="header"
            placeholder="Zoek naar producten, merken, categorieën…"
            initialQuery={searchQuery}
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2.5 text-xs text-wf-600 tablet:gap-4">
          <span className="hidden tablet:inline" aria-label="Taal en valuta">
            NL · €
          </span>
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
          <button
            type="button"
            className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-wf-400 text-[10px] font-bold text-wf-700 tablet:hidden"
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls={mobileNavId}
            onClick={() => setMenuOpen((v) => !v)}
          >
            ☰
          </button>
        </div>
      </header>

      <nav
        className="relative hidden items-center gap-[22px] border-b border-wf-200 px-8 pb-3 text-[13px] text-wf-700 tablet:flex"
        aria-label="Hoofdnavigatie"
        onMouseLeave={() => setMegaOpen(false)}
      >
        {HOMEPAGE_NAV_LINKS.map((item) => {
          if (item.label === "Categorieën") {
            return (
              <div key={item.href} className="relative">
                <button
                  type="button"
                  className="hover:text-wf-900 hover:underline"
                  aria-expanded={megaOpen}
                  aria-controls={megaId}
                  onClick={() => setMegaOpen((v) => !v)}
                  onMouseEnter={() => setMegaOpen(true)}
                >
                  Categorieën ▾
                </button>
                {megaOpen ? (
                  <div
                    id={megaId}
                    className="absolute left-0 top-full z-20 mt-2 w-[min(720px,70vw)] rounded-lg border border-wf-300 bg-white p-4 shadow-sm"
                    role="region"
                    aria-label="Alle categorieën"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-bold text-wf-900">
                        Hoofdcategorieën
                      </p>
                      <Link
                        href="/categorie"
                        className="text-[11px] font-semibold text-wf-700 hover:underline"
                        onClick={() => setMegaOpen(false)}
                      >
                        Alle categorieën
                      </Link>
                    </div>
                    <ul className="grid grid-cols-3 gap-x-4 gap-y-1.5 desktop:grid-cols-4">
                      {MARKETPLACE_CATEGORIES.map((cat) => (
                        <li key={cat.slug}>
                          <Link
                            href={`/categorie/${cat.slug}`}
                            className="block rounded px-1 py-1 text-xs text-wf-700 hover:bg-wf-100 hover:text-wf-900"
                            onClick={() => setMegaOpen(false)}
                          >
                            {cat.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
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

      {menuOpen ? (
        <nav
          id={mobileNavId}
          className="border-b border-wf-200 px-4 py-3 tablet:hidden"
          aria-label="Mobiel menu"
        >
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-wf-500">
            Categorieën
          </p>
          <ul className="mb-3 grid grid-cols-2 gap-1.5">
            {MARKETPLACE_CATEGORIES.map((cat) => (
              <li key={cat.slug}>
                <Link
                  href={`/categorie/${cat.slug}`}
                  className="block rounded border border-wf-200 px-2 py-1.5 text-[11.5px] text-wf-800"
                  onClick={() => setMenuOpen(false)}
                >
                  {cat.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/categorie"
            className="block text-[12px] font-semibold text-wf-800 underline"
            onClick={() => setMenuOpen(false)}
          >
            Alle categorieën
          </Link>
          <Link
            href="/over"
            className="mt-2 block text-[12px] text-wf-700"
            onClick={() => setMenuOpen(false)}
          >
            Over EuropMade
          </Link>
        </nav>
      ) : null}
    </>
  )
}
