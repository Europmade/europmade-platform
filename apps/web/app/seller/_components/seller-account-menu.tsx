"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { endSession } from "../../(auth)/_lib/medusa-auth"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t } from "../../_lib/i18n/messages"
import { medusaBackendUrl } from "../../_lib/medusa-backend-url"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

type CustomerMe = {
  email: string
  first_name?: string | null
  last_name?: string | null
}

async function fetchCustomer(): Promise<CustomerMe | null> {
  try {
    const res = await fetch(`${medusaBackendUrl()}/store/customers/me`, {
      credentials: "include",
      headers: {
        ...(PUBLISHABLE_KEY
          ? { "x-publishable-api-key": PUBLISHABLE_KEY }
          : {}),
      },
    })
    if (!res.ok) return null
    const body = (await res.json()) as { customer?: CustomerMe }
    return body.customer ?? null
  } catch {
    return null
  }
}

/**
 * Seller account menu — primary destination is seller settings, not buyer account.
 */
export function SellerAccountMenu({
  roleLabel,
}: {
  roleLabel?: string
}) {
  const router = useRouter()
  const locale = useStorefrontLocale()
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [customer, setCustomer] = useState<CustomerMe | null>(null)

  const initials = (roleLabel || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

  useEffect(() => {
    void fetchCustomer().then(setCustomer)
  }, [])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  async function logout() {
    try {
      await endSession()
    } catch {
      /* session already gone */
    }
    setOpen(false)
    router.push("/")
    router.refresh()
  }

  const display =
    [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
    customer?.email ||
    roleLabel

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-wf-400 bg-wf-100 text-[10px] font-semibold text-wf-800"
        aria-label="Seller accountmenu"
        aria-expanded={open}
        aria-controls={menuId}
        title={display}
        onClick={() => setOpen((v) => !v)}
      >
        {initials || "S"}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-52 rounded-lg border border-wf-300 bg-white py-1.5 shadow-sm"
        >
          <p className="truncate border-b border-wf-200 px-3 py-2 text-[11px] text-wf-600">
            {display}
          </p>
          <MenuLink href="/seller/settings" onNavigate={() => setOpen(false)}>
            Mijn Partner-account
          </MenuLink>
          <MenuLink href="/seller/settings" onNavigate={() => setOpen(false)}>
            Instellingen
          </MenuLink>
          {customer ? (
            <MenuLink href="/account" onNavigate={() => setOpen(false)}>
              Naar buyer-account
            </MenuLink>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="block w-full border-t border-wf-200 px-3 py-2 text-left text-xs text-wf-800 hover:bg-wf-100"
            onClick={() => void logout()}
          >
            {t("logout", locale)}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function MenuLink({
  href,
  children,
  onNavigate,
}: {
  href: string
  children: React.ReactNode
  onNavigate: () => void
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="block px-3 py-2 text-xs text-wf-800 hover:bg-wf-100"
      onClick={onNavigate}
    >
      {children}
    </Link>
  )
}
