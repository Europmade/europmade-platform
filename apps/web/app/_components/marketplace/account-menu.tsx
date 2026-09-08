"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { endSession } from "../../(auth)/_lib/medusa-auth"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { t } from "../../_lib/i18n/messages"
import { medusaBackendUrl } from "../../_lib/medusa-backend-url"

type CustomerMe = {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
}

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

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
 * Account-icoon + menu — Medusa customer session (`/store/customers/me` + `DELETE /auth/session`).
 */
export function AccountMenu({
  locale = "nl" as StorefrontLocale,
}: {
  locale?: StorefrontLocale
}) {
  const router = useRouter()
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [customer, setCustomer] = useState<CustomerMe | null | "loading">(
    "loading"
  )

  useEffect(() => {
    let cancelled = false
    fetchCustomer().then((c) => {
      if (!cancelled) setCustomer(c)
    })
    return () => {
      cancelled = true
    }
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
      // sessie al weg
    }
    setCustomer(null)
    setOpen(false)
    router.push("/")
    router.refresh()
  }

  if (customer === "loading") {
    return (
      <span
        className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-wf-300 text-wf-400"
        aria-hidden
      >
        <UserIcon />
      </span>
    )
  }

  if (!customer) {
    return (
      <Link
        href="/login"
        className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-wf-400 text-wf-700 hover:border-wf-700"
        aria-label={t("login", locale)}
        title={t("login", locale)}
      >
        <UserIcon />
      </Link>
    )
  }

  const label =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
    customer.email

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-wf-400 text-wf-700 hover:border-wf-700"
        aria-label={`${t("myAccount", locale)} (${label})`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <UserIcon />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-52 rounded-lg border border-wf-300 bg-white py-1.5 shadow-sm"
        >
          <p className="truncate border-b border-wf-200 px-3 py-2 text-[11px] text-wf-600">
            {label}
          </p>
          <MenuLink href="/account" onNavigate={() => setOpen(false)}>
            {t("myAccount", locale)}
          </MenuLink>
          <MenuLink href="/account/orders" onNavigate={() => setOpen(false)}>
            {t("orders", locale)}
          </MenuLink>
          <MenuLink href="/account/settings" onNavigate={() => setOpen(false)}>
            {t("settings", locale)}
          </MenuLink>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-xs text-wf-800 hover:bg-wf-100"
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

function UserIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.8-3.2 4.2-4.5 7-4.5s5.2 1.3 7 4.5" />
    </svg>
  )
}
