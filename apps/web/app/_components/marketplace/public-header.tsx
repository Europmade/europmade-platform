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
 * CMP-001 Header — locale-aware chrome + pc_category mega-menu.
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

  return (
    <>
      <header
        role="banner"
        data-em-header="chrome"
        className="relative z-50 flex items-center gap-3 overflow-visible border-b border-wf-300 px-4 py-3.5 tablet:gap-5 tablet:px-8"
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

      <nav aria-label={t("navMain", locale)}>
        <CategoryMegaMenu locale={locale} />
      </nav>

      {menuOpen ? (
        <nav
          id={mobileNavId}
          className="border-b border-wf-200 px-4 py-3 tablet:hidden"
          aria-label={t("menu", locale)}
        >
          <CategoryMobileNav
            locale={locale}
            onNavigate={() => setMenuOpen(false)}
          />
          <Link
            href="/over"
            className="mt-2 block text-[12px] text-wf-700"
            onClick={() => setMenuOpen(false)}
          >
            {t("navAbout", locale)}
          </Link>
          <div className="mt-3 border-t border-wf-100 pt-3">
            <LocaleCurrencySwitcher />
          </div>
        </nav>
      ) : null}
    </>
  )
}
