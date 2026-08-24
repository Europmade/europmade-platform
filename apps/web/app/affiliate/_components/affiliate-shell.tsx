"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@europmade/utils"
import { LocaleCurrencySwitcher } from "../../_components/marketplace/locale-currency-switcher"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t, type StorefrontMessageKey } from "../../_lib/i18n/messages"

const NAV: Array<{ labelKey: StorefrontMessageKey; href: string | null }> = [
  { labelKey: "affiliateNavOverview", href: "/affiliate/dashboard" },
  { labelKey: "affiliateNavProducts", href: "/affiliate/dashboard/products" },
  { labelKey: "affiliateNavLinks", href: "/affiliate/dashboard/links" },
  { labelKey: "affiliateNavStats", href: "/affiliate/dashboard/stats" },
  { labelKey: "affiliateNavCommissions", href: "/affiliate/dashboard/commissions" },
  { labelKey: "affiliateNavPayouts", href: "/affiliate/dashboard/payouts" },
  { labelKey: "affiliateNavAccount", href: "/affiliate/dashboard/account" },
]

export type AffiliateShellProps = {
  breadcrumb: Array<{ label: string; href?: string }>
  children: React.ReactNode
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/affiliate/dashboard") {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Affiliate Dashboard-shell — authenticated portal under /affiliate/dashboard.
 */
export function AffiliateShell({ breadcrumb, children }: AffiliateShellProps) {
  const pathname = usePathname()
  const locale = useStorefrontLocale()

  return (
    <div className="min-h-screen bg-wf-100">
      <div className="mx-auto flex min-h-screen max-w-[1080px] border border-wf-400 bg-white mobile:max-w-none">
        <aside className="hidden w-[220px] shrink-0 border-r border-wf-300 bg-wf-100 p-3.5 tablet:block">
          <Link href="/affiliate" className="mb-5 block px-3 text-xs font-bold text-wf-800 hover:underline">
            {t("affiliateShellHome", locale)}
          </Link>
          <p className="px-3 pb-1 text-[9.5px] font-semibold uppercase tracking-wide text-wf-500">
            {t("affiliateDashboardTitle", locale)}
          </p>
          <nav
            className="flex flex-col gap-0.5"
            aria-label={t("affiliateNavAria", locale)}
          >
            {NAV.map((item) => {
              const label = t(item.labelKey, locale)
              const active = item.href !== null && isNavActive(pathname, item.href)
              const className = cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-xs text-wf-700",
                active && "bg-wf-900 font-semibold text-white"
              )
              const icon = (
                <span
                  className={cn(
                    "inline-block h-4 w-4 shrink-0 rounded-sm bg-wf-400",
                    active && "bg-white"
                  )}
                  aria-hidden
                />
              )
              if (!item.href) {
                return (
                  <span
                    key={item.labelKey}
                    className={cn(className, "cursor-not-allowed opacity-50")}
                    title={t("notAvailableYet", locale)}
                  >
                    {icon}
                    <span>{label}</span>
                  </span>
                )
              }
              return (
                <Link key={item.labelKey} href={item.href} className={className}>
                  {icon}
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-wf-300 px-4 py-3 tablet:px-6">
            <div className="flex items-center gap-3.5">
              <Link href="/" className="text-sm font-bold text-wf-900">
                EuropMade
              </Link>
              <div className="border-l border-wf-300 pl-3.5 text-xs font-bold text-wf-700">
                {t("affiliateBrand", locale)}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LocaleCurrencySwitcher />
            </div>
          </header>

          <nav
            className="border-b border-wf-200 px-4 py-3 text-[11.5px] text-wf-500 tablet:px-7"
            aria-label={t("affBreadcrumbAria", locale)}
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
              {NAV.filter((n) => n.href).map((item) => (
                <Link
                  key={item.labelKey}
                  href={item.href!}
                  className={cn(
                    "whitespace-nowrap rounded-md border border-wf-400 px-3 py-1.5 text-wf-700",
                    isNavActive(pathname, item.href!) &&
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
