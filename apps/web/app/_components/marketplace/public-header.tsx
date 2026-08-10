"use client"

import Link from "next/link"
import { useId, useState } from "react"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { categoryNavLabel, t } from "../../_lib/i18n/messages"
import { MARKETPLACE_CATEGORIES } from "../../_lib/marketplace-categories"
import { SearchForm } from "../homepage/search-form"
import { AccountMenu } from "./account-menu"
import { BrandLogo } from "./brand-logo"
import { CartLink } from "./cart-link"
import { LocaleCurrencySwitcher } from "./locale-currency-switcher"

type PublicHeaderProps = {
  searchQuery?: string
  alwaysShowSearch?: boolean
  locale?: StorefrontLocale
}

/**
 * CMP-001 Header — locale-aware UI chrome (storefront localization).
 */
export function PublicHeader({
  searchQuery = "",
  alwaysShowSearch = true,
  locale = DEFAULT_STOREFRONT_LOCALE,
}: PublicHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [megaOpen, setMegaOpen] = useState(false)
  const megaId = useId()
  const mobileNavId = useId()

  const navItems: Array<{ key: string; href: string; label: string }> = [
    { key: "categories", href: "/categorie", label: t("navCategories", locale) },
    {
      key: "tuin",
      href: "/categorie/tuin",
      label: categoryNavLabel("tuin", "Tuin", locale),
    },
    {
      key: "elektronica",
      href: "/categorie/elektronica",
      label: categoryNavLabel("elektronica", "Elektronica", locale),
    },
    {
      key: "mode",
      href: "/categorie/mode",
      label: categoryNavLabel("mode", "Mode", locale),
    },
    { key: "about", href: "/over", label: t("navAbout", locale) },
  ]

  return (
    <>
      <header
        role="banner"
        className="flex items-center gap-3 border-b border-wf-300 px-4 py-3.5 tablet:gap-5 tablet:px-8"
      >
        <BrandLogo />

        <div
          className={`min-w-0 flex-1 ${alwaysShowSearch ? "" : "hidden tablet:block"}`}
        >
          <SearchForm
            variant="header"
            placeholder={t("searchPlaceholder", locale)}
            initialQuery={searchQuery}
            locale={locale}
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2.5 text-xs text-wf-600 tablet:gap-4">
          <LocaleCurrencySwitcher />
          <AccountMenu locale={locale} />
          <CartLink locale={locale} />
          <button
            type="button"
            className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-wf-400 text-[10px] font-bold text-wf-700 tablet:hidden"
            aria-label={t("menu", locale)}
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
        aria-label={t("navMain", locale)}
        onMouseLeave={() => setMegaOpen(false)}
      >
        {navItems.map((item) => {
          if (item.key === "categories") {
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
                  {t("navCategoriesMenu", locale)}
                </button>
                {megaOpen ? (
                  <div
                    id={megaId}
                    className="absolute left-0 top-full z-20 mt-2 w-[min(720px,70vw)] rounded-lg border border-wf-300 bg-white p-4 shadow-sm"
                    role="region"
                    aria-label={t("navAllCategories", locale)}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-bold text-wf-900">
                        {t("navMainCategories", locale)}
                      </p>
                      <Link
                        href="/categorie"
                        className="text-[11px] font-semibold text-wf-700 hover:underline"
                        onClick={() => setMegaOpen(false)}
                      >
                        {t("navAllCategories", locale)}
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
                            {categoryNavLabel(cat.slug, cat.label, locale)}
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
          aria-label={t("menu", locale)}
        >
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-wf-500">
            {t("navCategories", locale)}
          </p>
          <ul className="mb-3 grid grid-cols-2 gap-1.5">
            {MARKETPLACE_CATEGORIES.map((cat) => (
              <li key={cat.slug}>
                <Link
                  href={`/categorie/${cat.slug}`}
                  className="block rounded border border-wf-200 px-2 py-1.5 text-[11.5px] text-wf-800"
                  onClick={() => setMenuOpen(false)}
                >
                  {categoryNavLabel(cat.slug, cat.label, locale)}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/categorie"
            className="block text-[12px] font-semibold text-wf-800 underline"
            onClick={() => setMenuOpen(false)}
          >
            {t("navAllCategories", locale)}
          </Link>
          <Link
            href="/over"
            className="mt-2 block text-[12px] text-wf-700"
            onClick={() => setMenuOpen(false)}
          >
            {t("navAbout", locale)}
          </Link>
        </nav>
      ) : null}
    </>
  )
}
