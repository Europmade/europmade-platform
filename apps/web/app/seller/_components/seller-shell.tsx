"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@europmade/utils"
import { BrandLogo } from "../../_components/marketplace/brand-logo"
import { LocaleCurrencySwitcher } from "../../_components/marketplace/locale-currency-switcher"
import { SellerAccountMenu } from "./seller-account-menu"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t } from "../../_lib/i18n/messages"
import {
  findActiveSellerNav,
  primaryNavSorted,
} from "../_lib/module-registry"

export type SellerShellProps = {
  roleLabel?: string
  breadcrumb?: Array<{ label: string; href?: string }>
  children: React.ReactNode
}

function navActive(pathname: string, route: string | null) {
  if (!route) return false
  if (route === "/seller") return pathname === "/seller"
  return pathname === route || pathname.startsWith(`${route}/`)
}

/**
 * Seller Dashboard-shell — chrome conform Sprint 3 P0 + MVP-navigatie.
 */
export function SellerShell({
  roleLabel,
  breadcrumb = [],
  children,
}: SellerShellProps) {
  const pathname = usePathname()
  const locale = useStorefrontLocale()
  const primary = primaryNavSorted()
  const active = findActiveSellerNav(pathname)
  const safeRole = typeof roleLabel === "string" ? roleLabel : ""
  const translated = active ? t(active.labelKey, locale) : ""
  const pageTitle =
    (translated && translated.trim()) ||
    active?.naam ||
    safeRole ||
    "Seller"
  const initials = safeRole
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <div className="min-h-screen bg-wf-100">
      <div className="mx-auto flex min-h-screen max-w-[1080px] border border-wf-400 bg-white mobile:max-w-none">
        <aside className="hidden w-[220px] shrink-0 border-r border-wf-300 bg-wf-100 p-3.5 tablet:block">
          <div className="mb-5 px-1">
            <BrandLogo href="/seller" size="md" />
          </div>
          <p className="px-3 pb-1 text-[9.5px] font-semibold uppercase tracking-wide text-wf-500">
            {t("sellerDashboardTitle", locale)}
          </p>
          <nav className="flex flex-col gap-0.5" aria-label={t("sellerNavAria", locale)}>
            {primary.map((item) => {
              const label = t(item.labelKey, locale)
              const isActive = navActive(pathname, item.route)
              const className = cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-xs text-wf-700",
                isActive && "bg-wf-900 font-semibold text-white"
              )
              if (!item.route || !item.available) {
                return (
                  <span
                    key={item.id}
                    className={cn(className, "cursor-not-allowed opacity-50")}
                    title={t("notAvailableYet", locale)}
                  >
                    <span>{label}</span>
                  </span>
                )
              }
              return (
                <Link key={item.id} href={item.route} className={className}>
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-wf-300 px-4 py-3 tablet:px-6">
            <div className="flex items-center gap-3.5">
              <BrandLogo href="/seller" />
              <div className="border-l border-wf-300 pl-3.5 text-xs font-bold text-wf-700">
                {pageTitle}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LocaleCurrencySwitcher />
              <SellerAccountMenu roleLabel={safeRole} />
            </div>
          </header>

          <nav
            className="border-b border-wf-200 px-4 py-3 text-[11.5px] text-wf-500 tablet:px-7"
            aria-label="Breadcrumb"
          >
            {breadcrumb.map((crumb, index) => {
              const isLast = index === breadcrumb.length - 1
              return (
                <span key={`${crumb.label}-${index}`}>
                  {index > 0 ? " > " : null}
                  {crumb.href && !isLast ? (
                    <Link href={crumb.href} className="hover:text-wf-800">
                      {crumb.label}
                    </Link>
                  ) : (
                    <b
                      className={
                        isLast ? "font-semibold text-wf-800" : undefined
                      }
                    >
                      {crumb.label}
                    </b>
                  )}
                </span>
              )
            })}
          </nav>

          <div className="border-b border-wf-300 px-4 py-2 tablet:hidden">
            <div className="flex gap-2 overflow-x-auto text-xs">
              {primary
                .filter((n) => n.route && n.available)
                .map((item) => (
                  <Link
                    key={item.id}
                    href={item.route!}
                    className={cn(
                      "whitespace-nowrap rounded-md border border-wf-400 px-3 py-1.5 text-wf-700",
                      navActive(pathname, item.route) &&
                        "border-wf-900 bg-wf-900 text-white"
                    )}
                  >
                    {t(item.labelKey, locale)}
                  </Link>
                ))}
            </div>
          </div>

          <main className="flex-1 px-4 py-6 tablet:px-7">{children}</main>
        </div>
      </div>
    </div>
  )
}
