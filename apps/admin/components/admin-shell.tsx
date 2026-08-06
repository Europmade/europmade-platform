"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  findActiveNav,
  moreNavSorted,
  primaryNavSorted,
} from "../lib/module-registry";
import { endSession } from "../lib/medusa-admin-auth";

interface AdminShellProps {
  breadcrumb?: React.ReactNode;
  children: React.ReactNode;
}

function navActive(pathname: string, route: string | null) {
  if (!route) return false;
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function AdminShell({ breadcrumb, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const primary = primaryNavSorted();
  const more = moreNavSorted();
  const active = findActiveNav(pathname);
  const moreOpenByDefault = more.some((m) => navActive(pathname, m.route));
  const [moreOpen, setMoreOpen] = useState(moreOpenByDefault);

  async function handleLogout() {
    try {
      await endSession();
    } catch {
      // Sessie kan al verlopen zijn — toch naar login.
    }
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-wf-100">
      <header className="flex items-center justify-between border-b border-wf-300 bg-white px-4 py-3 tablet:px-6">
        <div className="flex items-center gap-3.5">
          <div
            className="h-[22px] w-[120px] rounded-sm bg-wf-300"
            role="img"
            aria-label="EuropMade logo"
          />
          <div className="border-l border-wf-300 pl-3.5 text-xs font-bold text-wf-700">
            {active?.naam ?? "Admin"}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-semibold text-wf-700 underline hover:text-wf-900"
          >
            Uitloggen
          </button>
          <div className="h-7 w-7 rounded-full bg-wf-300" aria-hidden />
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-53px)] flex-col tablet:flex-row">
        <aside className="w-full shrink-0 border-b border-wf-300 bg-wf-100 p-3.5 tablet:w-[220px] tablet:border-b-0 tablet:border-r tablet:p-5">
          <nav className="flex gap-1 overflow-x-auto tablet:flex-col">
            {primary.map((mod) => {
              if (!mod.route) return null;
              const isActive = navActive(pathname, mod.route);
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
              );
            })}

            <div className="my-2 hidden h-px bg-wf-300 tablet:block" />

            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2.5 text-left text-xs ${
                moreOpenByDefault || moreOpen
                  ? "font-semibold text-wf-900"
                  : "text-wf-700 hover:bg-wf-200"
              }`}
              aria-expanded={moreOpen}
            >
              <span
                className="h-4 w-4 shrink-0 rounded-sm bg-wf-400"
                aria-hidden
              />
              Meer
              <span className="ml-auto text-[10px] text-wf-500">
                {moreOpen ? "▾" : "▸"}
              </span>
            </button>

            {moreOpen
              ? more.map((mod) => {
                  const isActive = navActive(pathname, mod.route);
                  if (!mod.available || !mod.route) {
                    return (
                      <span
                        key={mod.id}
                        className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 pl-8 text-xs text-wf-400"
                        title="Komt later"
                      >
                        {mod.naam}
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={mod.id}
                      href={mod.route}
                      className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 pl-8 text-xs ${
                        isActive
                          ? "bg-wf-900 font-semibold text-white"
                          : "text-wf-700 hover:bg-wf-200"
                      }`}
                    >
                      {mod.naam}
                    </Link>
                  );
                })
              : null}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 bg-white">
          {breadcrumb && (
            <div className="border-b border-wf-200 px-4 py-3 text-[11.5px] text-wf-500 tablet:px-7">
              {breadcrumb}
            </div>
          )}
          <div className="px-4 py-6 tablet:px-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
