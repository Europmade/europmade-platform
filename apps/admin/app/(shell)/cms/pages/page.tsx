"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  defaultCanonicalForSlug,
  isCmsActionDocument,
  listableFixedCmsPages,
  publicPathForCmsSlug,
  type CmsFixedPageDef,
} from "@europmade/utils"
import { Button, Notice } from "@europmade/ui"
import {
  createCmsPage,
  deleteCmsPage,
  emptyLocalized,
  listCmsPages,
  type CmsPageDto,
  type LocalizedCms,
} from "../../../../lib/cms-admin-api"
import { seedDocumentForFixedSlug } from "../../../../lib/cms-fixed-page-seed"
import { CmsStatusBadge } from "../../../../components/cms/cms-preview-frame"
import { storefrontOrigin } from "../../../../lib/medusa-backend-url"

type ListRow =
  | {
      kind: "db"
      page: CmsPageDto
      publicPath: string
      fixed: CmsFixedPageDef | null
    }
  | {
      kind: "missing"
      fixed: CmsFixedPageDef
      publicPath: string
    }

function locTitle(title: LocalizedCms | undefined, fallback: string): string {
  if (!title) return fallback
  return title.nl || title.en || title.de || title.fr || fallback
}

function mergePageList(dbPages: CmsPageDto[]): ListRow[] {
  const bySlug = new Map(
    dbPages.map((p) => [p.slug.trim().toLowerCase(), p] as const)
  )
  const fixed = listableFixedCmsPages()
  const fixedSlugs = new Set(fixed.map((f) => f.slug))

  const rows: ListRow[] = []

  for (const def of fixed) {
    const existing = bySlug.get(def.slug)
    if (existing) {
      rows.push({
        kind: "db",
        page: existing,
        publicPath: def.path,
        fixed: def,
      })
    } else {
      rows.push({
        kind: "missing",
        fixed: def,
        publicPath: def.path,
      })
    }
  }

  // Ad-hoc / UAT pages not in CMS_FIXED_PAGES
  const extras = dbPages
    .filter((p) => !fixedSlugs.has(p.slug.trim().toLowerCase()))
    .filter((p) => !isCmsActionDocument(p.document))
    .sort((a, b) => a.slug.localeCompare(b.slug))
  for (const page of extras) {
    rows.push({
      kind: "db",
      page,
      publicPath: publicPathForCmsSlug(page.slug) ?? `/pagina/${page.slug}`,
      fixed: null,
    })
  }

  return rows
}

export default function CmsPagesPage() {
  const [pages, setPages] = useState<CmsPageDto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busySlug, setBusySlug] = useState<string | null>(null)

  const load = useCallback(() => {
    listCmsPages()
      .then((r) => setPages(r.pages))
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const rows = useMemo(() => mergePageList(pages), [pages])

  async function createStub(def: CmsFixedPageDef) {
    setBusySlug(def.slug)
    setError(null)
    try {
      // Prevent duplicate if list is stale
      const latest = await listCmsPages()
      const existing = latest.pages.find(
        (p) => p.slug.trim().toLowerCase() === def.slug
      )
      if (existing) {
        setPages(latest.pages)
        window.location.href = `/cms/pages/${existing.id}`
        return
      }
      const seed = seedDocumentForFixedSlug(def.slug)
      const title = seed?.title ?? {
        nl: def.label,
        en: def.label,
        de: def.label,
        fr: def.label,
      }
      const document = seed?.document ?? {
        sections: [
          {
            id: "pg_hero",
            key: "hero",
            visible: true,
            sortOrder: 0,
            title,
            body: emptyLocalized(),
            image: null,
            href: "",
            ctaLabel: emptyLocalized(),
            bannerId: null,
          },
          {
            id: "pg_text",
            key: "text",
            visible: true,
            sortOrder: 10,
            title: emptyLocalized(),
            body: seed?.body ?? emptyLocalized(),
            image: null,
            href: "",
            ctaLabel: emptyLocalized(),
            bannerId: null,
          },
        ],
      }
      const { page } = await createCmsPage({
        slug: def.slug,
        title,
        body: seed?.body ?? emptyLocalized(),
        document,
        seo_title: title,
        seo_description: emptyLocalized(),
        seo_canonical: defaultCanonicalForSlug(def.slug),
        published: false,
        visible: true,
      })
      window.location.href = `/cms/pages/${page.id}`
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aanmaken mislukt")
      load()
    } finally {
      setBusySlug(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-wf-500">
            <Link href="/cms" className="hover:underline">
              CMS
            </Link>{" "}
            / Pagina&apos;s
          </p>
          <h1 className="text-xl font-bold text-wf-950">CMS-pagina&apos;s</h1>
          <p className="mt-1 text-sm text-wf-600">
            Vaste storefront-routes + overige CMS-pagina&apos;s. Concept-stubs
            publiceren pas de fallback wanneer je content live zet.
          </p>
        </div>
        <Link
          href="/cms/pages/new"
          className="inline-flex items-center justify-center rounded-wf bg-wf-900 px-[18px] py-[9px] text-sm font-semibold text-white hover:bg-wf-800"
        >
          Nieuwe pagina
        </Link>
      </div>

      {error ? <Notice variant="warning">{error}</Notice> : null}

      <ul className="space-y-2">
        {rows.map((row) => {
          if (row.kind === "missing") {
            return (
              <li
                key={`missing:${row.fixed.slug}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-wf-300 bg-wf-50 px-3 py-3"
              >
                <div>
                  <p className="font-semibold">{row.publicPath}</p>
                  <p className="text-xs text-wf-600">{row.fixed.label}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                    Nog niet in CMS
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busySlug === row.fixed.slug}
                  onClick={() => void createStub(row.fixed)}
                >
                  {busySlug === row.fixed.slug ? "Bezig…" : "Aanmaken"}
                </Button>
              </li>
            )
          }

          const { page, publicPath } = row
          return (
            <li
              key={page.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-wf-200 bg-white px-3 py-3"
            >
              <div>
                <p className="font-semibold">{publicPath}</p>
                <p className="text-xs text-wf-600">
                  {locTitle(page.title, page.slug)}
                </p>
                <div className="mt-1">
                  <CmsStatusBadge
                    published={page.published}
                    extra={page.visible ? "zichtbaar" : "verborgen"}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {page.published ? (
                  <a
                    href={`${storefrontOrigin()}${publicPath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-wf border border-wf-500 bg-white px-4 py-2 text-sm font-semibold text-wf-800"
                  >
                    Storefront
                  </a>
                ) : null}
                <Link
                  href={`/cms/pages/${page.id}`}
                  className="inline-flex items-center rounded-wf border border-wf-500 bg-white px-4 py-2 text-sm font-semibold text-wf-800"
                >
                  Bewerken
                </Link>
                {!row.fixed ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      if (!confirm("Pagina verwijderen?")) return
                      await deleteCmsPage(page.id)
                      load()
                    }}
                  >
                    Verwijderen
                  </Button>
                ) : null}
              </div>
            </li>
          )
        })}
        {rows.length === 0 ? (
          <li className="text-sm text-wf-600">Nog geen pagina&apos;s.</li>
        ) : null}
      </ul>
    </div>
  )
}
