"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"
import type { StorefrontLocale } from "../../_lib/i18n/locales"
import { t, tFormat } from "../../_lib/i18n/messages"
import {
  applyEmptyNavQueryFromLocation,
  commercialMembersForMenu,
  fetchCommercialNav,
  filterCommercialNav,
  storefrontShowsEmptyCategories,
  type CategoryNavNode,
  type CommercialNavGroupDto,
} from "../../_lib/category-nav"
import { CommercialCategoryIcon } from "./commercial-category-icon"

const OPEN_DELAY_MS = 90
const CLOSE_DELAY_MS = 160
const FEATURED_COUNT = 5

export function CategoryMegaMenu({ locale }: { locale: StorefrontLocale }) {
  const [groups, setGroups] = useState<CommercialNavGroupDto[]>([])
  const [open, setOpen] = useState(false)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const megaId = useId()
  const openTimer = useRef<number | null>(null)
  const closeTimer = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    applyEmptyNavQueryFromLocation()
    const includeEmpty = storefrontShowsEmptyCategories()
    fetchCommercialNav(locale).then((rows) => {
      if (cancelled) return
      setGroups(filterCommercialNav(rows, includeEmpty))
    })
    return () => {
      cancelled = true
    }
  }, [locale])

  function clearTimers() {
    if (openTimer.current != null) window.clearTimeout(openTimer.current)
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current)
    openTimer.current = null
    closeTimer.current = null
  }

  function intendOpen(key: string | null) {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    openTimer.current = window.setTimeout(() => {
      setActiveKey(key)
      setOpen(true)
      openTimer.current = null
    }, OPEN_DELAY_MS)
  }

  function intendClose() {
    if (openTimer.current != null) {
      window.clearTimeout(openTimer.current)
      openTimer.current = null
    }
    closeTimer.current = window.setTimeout(() => {
      setOpen(false)
      closeTimer.current = null
    }, CLOSE_DELAY_MS)
  }

  useEffect(() => () => clearTimers(), [])

  const active = activeKey
    ? (groups.find((g) => g.key === activeKey) ?? groups[0] ?? null)
    : (groups[0] ?? null)
  const featured = groups.slice(0, FEATURED_COUNT)

  return (
    <div
      className="relative hidden border-b border-wf-200 tablet:block"
      data-em-category-nav="desktop"
      data-em-commercial-nav={groups.length}
      onMouseLeave={intendClose}
    >
      <div className="flex items-center gap-5 overflow-hidden px-8 pb-3 text-[13px] text-wf-700">
        <button
          type="button"
          className={`shrink-0 hover:text-wf-900 hover:underline ${
            open ? "font-semibold text-wf-900" : ""
          }`}
          aria-expanded={open}
          aria-controls={megaId}
          onMouseEnter={() => intendOpen(active?.key ?? groups[0]?.key ?? null)}
          onFocus={() => intendOpen(active?.key ?? groups[0]?.key ?? null)}
          onClick={() => {
            setActiveKey((prev) => prev ?? groups[0]?.key ?? null)
            setOpen((v) => !v)
          }}
        >
          {t("navCategoriesMenu", locale)}
        </button>
        <div className="hidden min-w-0 flex-1 items-center gap-5 overflow-hidden desktop:flex">
          {featured.map((group) => (
            <Link
              key={group.key}
              href={group.href}
              className="shrink-0 hover:text-wf-900 hover:underline"
              onMouseEnter={() => intendOpen(group.key)}
            >
              {group.name}
            </Link>
          ))}
        </div>
        <Link
          href="/over"
          className="ml-auto shrink-0 hover:text-wf-900 hover:underline"
        >
          {t("navAbout", locale)}
        </Link>
      </div>

      {open ? (
        <div
          id={megaId}
          role="region"
          aria-label={t("navMainCategories", locale)}
          className="absolute left-0 right-0 top-full z-40 pt-1"
          onMouseEnter={() => intendOpen(active?.key ?? null)}
        >
          <div className="border-b border-t border-wf-200 bg-white px-6 py-4 shadow-sm desktop:px-8">
            <div className="grid grid-cols-[minmax(14rem,18rem)_1fr] gap-6 desktop:gap-8">
              <ul className="space-y-0.5">
                {groups.map((group) => (
                  <li key={group.key}>
                    <Link
                      href={group.href}
                      data-em-nav-commercial={group.key}
                      data-em-nav-image={group.icon_url || group.image_url ? "1" : "0"}
                      className={`flex items-center gap-2.5 rounded-md px-1.5 py-1.5 ${
                        active?.key === group.key
                          ? "bg-wf-100"
                          : "hover:bg-wf-50"
                      }`}
                      onMouseEnter={() => intendOpen(group.key)}
                      onFocus={() => intendOpen(group.key)}
                      onClick={() => setOpen(false)}
                    >
                      <CommercialCategoryIcon group={group} size={48} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-wf-900">
                          {group.name}
                        </span>
                        <span className="block text-[10px] text-wf-500">
                          {tFormat("navProductCount", locale, {
                            count: group.product_count,
                          })}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="min-w-0">
                {active ? (
                  <CommercialPanel
                    group={active}
                    locale={locale}
                    onNavigate={() => setOpen(false)}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CommercialPanel({
  group,
  locale,
  onNavigate,
}: {
  group: CommercialNavGroupDto
  locale: StorefrontLocale
  onNavigate: () => void
}) {
  const members = commercialMembersForMenu(group)
  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <Link
            href={group.href}
            className="text-sm font-bold text-wf-900 hover:underline"
            onClick={onNavigate}
          >
            {group.name}
          </Link>
          <p className="mt-0.5 text-[11px] text-wf-500">
            {tFormat("navProductCount", locale, {
              count: group.product_count,
            })}
          </p>
        </div>
        <Link
          href={group.href}
          className="shrink-0 text-[11px] font-semibold text-wf-600 hover:underline"
          onClick={onNavigate}
        >
          {t("navViewCategory", locale)}
        </Link>
      </div>
      {members.length === 0 ? (
        <p className="text-[12px] text-wf-500">
          {t("navNoSubcategories", locale)}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-8 gap-y-5 desktop:grid-cols-3">
          {members.map((member) => (
            <MemberColumn
              key={member.id}
              node={member}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MemberColumn({
  node,
  onNavigate,
}: {
  node: CategoryNavNode
  onNavigate: () => void
}) {
  return (
    <div>
      <Link
        href={`/categorie/${node.slug}`}
        className="text-[13px] font-bold text-wf-900 hover:underline"
        onClick={onNavigate}
      >
        {node.name}
      </Link>
      {node.children.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {node.children.map((leaf) => (
            <li key={leaf.id}>
              <Link
                href={`/categorie/${leaf.slug}`}
                className="text-[12px] text-wf-700 hover:text-wf-900 hover:underline"
                onClick={onNavigate}
              >
                {leaf.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function CategoryMobileNav({
  locale,
  onNavigate,
}: {
  locale: StorefrontLocale
  onNavigate: () => void
}) {
  const [groups, setGroups] = useState<CommercialNavGroupDto[]>([])
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    applyEmptyNavQueryFromLocation()
    const includeEmpty = storefrontShowsEmptyCategories()
    fetchCommercialNav(locale).then((rows) => {
      setGroups(filterCommercialNav(rows, includeEmpty))
    })
  }, [locale])

  function toggle(id: string) {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div data-em-category-nav="mobile">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-wf-500">
        {t("navCategories", locale)}
      </p>
      <ul className="mb-3 space-y-1">
        {groups.map((group) => (
          <li key={group.key}>
            <div className="flex overflow-hidden rounded border border-wf-200">
              <Link
                href={group.href}
                className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-[12px] text-wf-800"
                onClick={onNavigate}
              >
                <CommercialCategoryIcon group={group} size={36} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{group.name}</span>
                  <span className="block text-[10px] text-wf-500">
                    {tFormat("navProductCount", locale, {
                      count: group.product_count,
                    })}
                  </span>
                </span>
              </Link>
              {commercialMembersForMenu(group).length > 0 ? (
                <button
                  type="button"
                  className="shrink-0 border-l border-wf-200 px-2.5 text-[11px] font-semibold text-wf-600"
                  aria-expanded={Boolean(openIds[group.key])}
                  aria-label={t("navOpenSubcategories", locale)}
                  onClick={() => toggle(group.key)}
                >
                  {openIds[group.key] ? "−" : ">"}
                </button>
              ) : null}
            </div>
            {openIds[group.key] && commercialMembersForMenu(group).length > 0 ? (
              <ul className="mt-1 space-y-1 pl-3">
                {commercialMembersForMenu(group).map((member) => (
                  <MobileMember
                    key={member.id}
                    node={member}
                    locale={locale}
                    openIds={openIds}
                    onToggle={toggle}
                    onNavigate={onNavigate}
                  />
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      <Link
        href="/categorie"
        className="block text-[12px] font-semibold text-wf-800 underline"
        onClick={onNavigate}
      >
        {t("navAllCategories", locale)}
      </Link>
    </div>
  )
}

function MobileMember({
  node,
  locale,
  openIds,
  onToggle,
  onNavigate,
}: {
  node: CategoryNavNode
  locale: StorefrontLocale
  openIds: Record<string, boolean>
  onToggle: (id: string) => void
  onNavigate: () => void
}) {
  const hasChildren = node.children.length > 0
  const expanded = Boolean(openIds[node.id])
  if (!hasChildren) {
    return (
      <li>
        <Link
          href={`/categorie/${node.slug}`}
          className="block rounded border border-wf-200 px-2 py-1.5 text-[12px] text-wf-800"
          onClick={onNavigate}
        >
          {node.name}
        </Link>
      </li>
    )
  }
  return (
    <li>
      <div className="flex overflow-hidden rounded border border-wf-200">
        <Link
          href={`/categorie/${node.slug}`}
          className="min-w-0 flex-1 px-2 py-1.5 text-[12px] text-wf-800"
          onClick={onNavigate}
        >
          {node.name}
        </Link>
        <button
          type="button"
          className="shrink-0 border-l border-wf-200 px-2.5 text-[11px] font-semibold text-wf-600"
          aria-expanded={expanded}
          aria-label={t("navOpenSubcategories", locale)}
          onClick={() => onToggle(node.id)}
        >
          {expanded ? "−" : ">"}
        </button>
      </div>
      {expanded ? (
        <ul className="mt-1 space-y-1 pl-3">
          {node.children.map((child) => (
            <MobileMember
              key={child.id}
              node={child}
              locale={locale}
              openIds={openIds}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
