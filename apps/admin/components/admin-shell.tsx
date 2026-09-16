"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { findActiveNav, navGroupsSorted } from "../lib/module-registry"
import { endSession, getSession } from "../lib/medusa-admin-auth"

interface AdminShellProps {
  breadcrumb?: React.ReactNode
  children: React.ReactNode
}

function isCmsVisualEditor(pathname: string) {
  if (pathname === "/cms/homepage") return true
  if (pathname === "/cms/design") return true
  if (/^\/cms\/pages\/[^/]+$/.test(pathname)) return true
  if (/^\/cms\/categories\/.+/.test(pathname)) return true
  if (/^\/cms\/products\/[^/]+$/.test(pathname)) return true
  return false
}

function navActive(pathname: string, route: string | null) {
  if (!route) return false
  return pathname === route || pathname.startsWith(`${route}/`)
}

export function AdminShell({ breadcrumb, children }: AdminShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const groups = navGroupsSorted()
  const visualCms = isCmsVisualEditor(pathname)
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountLabel, setAccountLabel] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    getSession()
      .then((session) => {
        if (cancelled) return
        const user = session.user
        if (!user) {
          setAccountLabel(null)
          return
        }
        const name = [user.first_name, user.last_name]
          .filter(Boolean)
          .join(" ")
          .trim()
        setAccountLabel(name || user.email || null)
      })
      .catch(() => {
        if (!cancelled) setAccountLabel(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  async function handleLogout() {
    setMenuOpen(false)
    try {
      await endSession()
    } catch {
      // Sessie kan al verlopen zijn — toch naar login.
    }
    router.replace("/login")
  }

  return (
    <div className="min-h-screen bg-wf-100" data-admin-shell="cms-0c">
      <header className="flex items-center justify-between border-b border-wf-300 bg-white px-4 py-3 tablet:px-6">
        <div className="flex items-center gap-3.5">
          <Link
            href="/dashboard"
            className="text-[15px] font-bold tracking-tight text-wf-900"
            aria-label="EuropMade Admin"
          >
            EuropMade
          </Link>
          <div className="border-l border-wf-300 pl-3.5 text-xs font-bold text-wf-700">
            {findActiveNav(pathname)?.naam ?? "Admin"}
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-wf-400 bg-white text-wf-700 hover:bg-wf-100"
            aria-label="Accountmenu"
            aria-expanded={menuOpen}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden
            >
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 19.5c1.8-3.2 4.2-4.5 7-4.5s5.2 1.3 7 4.5" />
            </svg>
          </button>
          {menuOpen ? (
            <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border border-wf-300 bg-white shadow-sm">
              <div className="border-b border-wf-200 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500">
                  Admin-account
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-wf-800">
                  {accountLabel || "Ingelogd"}
                </p>
              </div>
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 text-xs text-wf-700 hover:bg-wf-50"
              >
                Instellingen
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full px-3 py-2.5 text-left text-xs font-semibold text-wf-800 hover:bg-wf-50"
              >
                Uitloggen
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-53px)] flex-col tablet:flex-row">
        <aside className="w-full shrink-0 border-b border-wf-300 bg-wf-100 p-3.5 tablet:w-[220px] tablet:border-b-0 tablet:border-r tablet:p-5">
          <nav className="flex gap-1 overflow-x-auto tablet:flex-col tablet:overflow-visible">
            {groups.map((group, groupIndex) => (
              <div key={group.id} className="tablet:mb-1">
                {groupIndex > 0 ? (
                  <div className="my-2 hidden h-px bg-wf-300 tablet:block" />
                ) : null}
                <p className="mb-1 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-wf-500 tablet:block">
                  {group.label}
                </p>
                {group.items.map((mod) => {
                  if (!mod.available || !mod.route) {
                    return (
                      <span
                        key={mod.id}
                        className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2.5 text-xs text-wf-400"
                        title="Niet beschikbaar"
                      >
                        {mod.naam}
                      </span>
                    )
                  }
                  const isActive = navActive(pathname, mod.route)
                  return (
                    <Link
                      key={mod.id}
                      href={mod.route}
                      className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2.5 text-xs ${
                        isActive
                          ? "bg-wf-900 font-semibold text-white"
                          : "text-wf-700 hover:bg-wf-200"
                      }`}
                    >
                      <span
                        className={`h-4 w-4 shrink-0 rounded-sm ${
                          isActive ? "bg-white" : "bg-wf-400"
                        }`}
                        aria-hidden
                      />
                      {mod.naam}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>
        </aside>

        <main
          className={`min-w-0 flex-1 bg-white ${
            visualCms ? "flex min-h-0 flex-col overflow-hidden" : ""
          }`}
        >
          {breadcrumb && !visualCms ? (
            <div className="border-b border-wf-200 px-4 py-3 text-[11.5px] text-wf-500 tablet:px-7">
              {breadcrumb}
            </div>
          ) : null}
          <div className={visualCms ? "min-h-0 flex-1 overflow-hidden" : "px-4 py-6 tablet:px-7"}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
