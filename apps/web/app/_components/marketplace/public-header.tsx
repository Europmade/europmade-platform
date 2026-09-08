"use client"

import Link from "next/link"
import { useEffect, useId, useState } from "react"
import {
  DEFAULT_CMS_HEADER,
  parseCmsTheme,
  resolveMediaUrl,
} from "@europmade/utils"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { categoryNavLabel, t } from "../../_lib/i18n/messages"
import { MARKETPLACE_CATEGORIES } from "../../_lib/marketplace-categories"
import { medusaBackendUrl } from "../../_lib/medusa-backend-url"
import { SearchForm } from "../homepage/search-form"
import { AccountMenu } from "./account-menu"
import { BrandLogo } from "./brand-logo"
import { CartLink } from "./cart-link"
import { LocaleCurrencySwitcher } from "./locale-currency-switcher"

type PublicHeaderProps = {
  searchQuery?: string
  alwaysShowSearch?: boolean
  locale?: StorefrontLocale
  /** CMS theme header logo (absolute or storage ref). */
  logoSrc?: string | null
  /** CMS theme header background (hex). */
  backgroundColor?: string | null
  /**
   * When true (default), load published theme header if logo/bg props omitted.
   * Preview/homepage can pass explicit props and set this to false.
   */
  loadThemeChrome?: boolean
}

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

type HeaderChrome = {
  logoSrc: string | null
  backgroundColor: string
}

async function fetchPublishedHeaderChrome(): Promise<HeaderChrome> {
  try {
    const res = await fetch(`${medusaBackendUrl()}/store/cms/theme`, {
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        ...(PUBLISHABLE_KEY
          ? { "x-publishable-api-key": PUBLISHABLE_KEY }
          : {}),
      },
    })
    if (!res.ok) {
      return {
        logoSrc: null,
        backgroundColor: DEFAULT_CMS_HEADER.backgroundColor,
      }
    }
    const body = (await res.json()) as {
      theme?: { document?: unknown; published?: boolean } | null
    }
    if (!body.theme?.published || !body.theme.document) {
      return {
        logoSrc: null,
        backgroundColor: DEFAULT_CMS_HEADER.backgroundColor,
      }
    }
    const theme = parseCmsTheme(body.theme.document)
    return {
      logoSrc: resolveMediaUrl(theme.header.logo, medusaBackendUrl()),
      backgroundColor: theme.header.backgroundColor,
    }
  } catch {
    return {
      logoSrc: null,
      backgroundColor: DEFAULT_CMS_HEADER.backgroundColor,
    }
  }
}

/**
 * CMP-001 Header — locale-aware UI chrome (storefront localization).
 * Mega-menu gebruikt de 30-slug compatibility mapping; 404/bestaan komt uit pc_category.
 */
export function PublicHeader({
  searchQuery = "",
  alwaysShowSearch = true,
  locale = DEFAULT_STOREFRONT_LOCALE,
  logoSrc: logoSrcProp,
  backgroundColor: backgroundColorProp,
  loadThemeChrome = true,
}: PublicHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [megaOpen, setMegaOpen] = useState(false)
  const megaId = useId()
  const mobileNavId = useId()
  const [remoteChrome, setRemoteChrome] = useState<HeaderChrome | null>(null)

  const propsProvided =
    logoSrcProp !== undefined || backgroundColorProp !== undefined

  useEffect(() => {
    if (!loadThemeChrome || propsProvided) return
    let cancelled = false
    fetchPublishedHeaderChrome().then((chrome) => {
      if (!cancelled) setRemoteChrome(chrome)
    })
    return () => {
      cancelled = true
    }
  }, [loadThemeChrome, propsProvided])

  const logoSrc =
    logoSrcProp !== undefined
      ? resolveMediaUrl(logoSrcProp, medusaBackendUrl())
      : (remoteChrome?.logoSrc ?? null)
  const backgroundColor =
    backgroundColorProp &&
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(backgroundColorProp)
      ? backgroundColorProp
      : (remoteChrome?.backgroundColor ?? DEFAULT_CMS_HEADER.backgroundColor)

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
        data-em-header="chrome"
        className="flex items-center gap-3 border-b border-wf-300 px-4 py-3.5 tablet:gap-5 tablet:px-8"
        style={{ backgroundColor }}
      >
        <BrandLogo imageSrc={logoSrc} />

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
