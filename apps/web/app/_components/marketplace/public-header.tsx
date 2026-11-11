"use client"

import Link from "next/link"
import { useEffect, useId, useState, type CSSProperties } from "react"
import {
  DEFAULT_CMS_HEADER,
  HOMEPAGE_CONTENT_GUTTER,
  parseCmsTheme,
  resolveMediaUrl,
  type CmsThemeHeader,
} from "@europmade/utils"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { t } from "../../_lib/i18n/messages"
import { medusaBackendUrl } from "../../_lib/medusa-backend-url"
import { SearchForm } from "../homepage/search-form"
import { AccountMenu } from "./account-menu"
import { BrandLogo } from "./brand-logo"
import { CartLink } from "./cart-link"
import {
  CategoryMegaMenu,
  CategoryMobileNav,
} from "./category-mega-menu"
import { LocaleCurrencySwitcher } from "./locale-currency-switcher"
import { HEADER_ICON_CLASS, headerChromeStyle, headerIconStyle } from "./header-chrome"

type PublicHeaderProps = {
  searchQuery?: string
  alwaysShowSearch?: boolean
  locale?: StorefrontLocale
  /** Parsed CMS header. Preview and the published homepage pass this directly. */
  chrome?: CmsThemeHeader | null
  /**
   * When true (default), load the published theme header if `chrome` is omitted.
   */
  loadThemeChrome?: boolean
}

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

async function fetchPublishedHeaderChrome(): Promise<CmsThemeHeader | null> {
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
    if (!res.ok) return null
    const body = (await res.json()) as {
      theme?: { document?: unknown; published?: boolean } | null
    }
    if (!body.theme?.published || !body.theme.document) return null
    return parseCmsTheme(body.theme.document).header
  } catch {
    return null
  }
}

/**
 * CMP-001 Header — locale-aware chrome + pc_category mega-menu.
 */
export function PublicHeader({
  searchQuery = "",
  alwaysShowSearch = true,
  locale = DEFAULT_STOREFRONT_LOCALE,
  chrome: chromeProp,
  loadThemeChrome = true,
}: PublicHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const mobileNavId = useId()
  const [remoteChrome, setRemoteChrome] = useState<
    CmsThemeHeader | null | undefined
  >(undefined)

  useEffect(() => {
    if (!loadThemeChrome || chromeProp) return
    let cancelled = false
    fetchPublishedHeaderChrome().then((chrome) => {
      if (!cancelled) setRemoteChrome(chrome)
    })
    return () => {
      cancelled = true
    }
  }, [loadThemeChrome, chromeProp])

  const header = chromeProp
    ? chromeProp
    : remoteChrome === undefined
      ? null
      : (remoteChrome ?? DEFAULT_CMS_HEADER)
  const logoSrc = header
    ? resolveMediaUrl(header.logo, medusaBackendUrl())
    : null

  return (
    <div
      data-em-header="chrome"
      className="relative z-50"
      style={header ? headerChromeStyle(header) : undefined}
    >
      <header
        role="banner"
        className={`flex items-center gap-3 overflow-visible border-b border-black/10 py-3.5 tablet:gap-5 ${HOMEPAGE_CONTENT_GUTTER}`}
      >
        <BrandLogo imageSrc={logoSrc} variant="header" />

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

        <div className="ml-auto flex shrink-0 items-center gap-2.5 tablet:gap-4">
          <div className="hidden tablet:block">
            <LocaleCurrencySwitcher />
          </div>
          <AccountMenu locale={locale} />
          <CartLink locale={locale} />
          <button
            type="button"
            className={`${HEADER_ICON_CLASS} text-[10px] font-bold tablet:hidden`}
            style={headerIconStyle}
            aria-label={t("menu", locale)}
            aria-expanded={menuOpen}
            aria-controls={mobileNavId}
            onClick={() => setMenuOpen((v) => !v)}
          >
            ☰
          </button>
        </div>
      </header>

      <nav aria-label={t("navMain", locale)}>
        <CategoryMegaMenu locale={locale} />
      </nav>

      {menuOpen ? (
        <nav
          id={mobileNavId}
          data-em-header-menu
          className={`border-b border-wf-200 bg-white py-3 text-[#151515] tablet:hidden ${HOMEPAGE_CONTENT_GUTTER}`}
          style={
            {
              color: "#151515",
              "--em-header-locale": "#4a4a4a",
              "--em-header-currency": "#4a4a4a",
              "--em-header-text": "#151515",
            } as CSSProperties
          }
          aria-label={t("menu", locale)}
        >
          <CategoryMobileNav
            locale={locale}
            onNavigate={() => setMenuOpen(false)}
          />
          <Link
            href="/over"
            className="mt-2 block text-[12px] text-wf-800"
            onClick={() => setMenuOpen(false)}
          >
            {t("navAbout", locale)}
          </Link>
          <div className="mt-3 border-t border-wf-100 pt-3">
            <LocaleCurrencySwitcher />
          </div>
        </nav>
      ) : null}
    </div>
  )
}
