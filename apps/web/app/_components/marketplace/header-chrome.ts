import type { CSSProperties } from "react"
import type { CmsThemeHeader } from "@europmade/utils"

export function headerChromeStyle(header: CmsThemeHeader): CSSProperties {
  return {
    backgroundColor: header.backgroundColor,
    color: header.textColor,
    "--em-header-text": header.textColor,
    "--em-header-icon": header.iconColor,
    "--em-header-icon-size": `${header.iconSize}px`,
    "--em-header-nav-size": `${header.navFontSize}px`,
    "--em-header-category": header.categoryColor,
    "--em-header-category-size": `${header.categoryFontSize}px`,
    "--em-header-search-bg": header.searchBackground,
    "--em-header-search-text": header.searchText,
    "--em-header-search-border": header.searchBorder,
    "--em-header-search-h": `${header.searchHeight}px`,
    "--em-header-locale": header.localeColor,
    "--em-header-locale-size": `${header.localeFontSize}px`,
    "--em-header-currency": header.currencyColor,
    "--em-header-currency-size": `${header.currencyFontSize}px`,
    "--em-header-logo-h": `${header.logoHeight}px`,
  } as CSSProperties
}

export const HEADER_ICON_CLASS =
  "em-header-icon inline-flex shrink-0 items-center justify-center rounded-full border hover:opacity-80"

export const headerIconStyle: CSSProperties = {
  color: "var(--em-header-icon, #4a4a4a)",
  borderColor: "var(--em-header-icon, #4a4a4a)",
  width: "var(--em-header-icon-size, 22px)",
  height: "var(--em-header-icon-size, 22px)",
}
