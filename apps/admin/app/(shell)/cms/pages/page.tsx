"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { Button, Notice } from "@europmade/ui"
import {
  deleteCmsPage,
  listCmsPages,
  type CmsPageDto,
} from "../../../../lib/cms-admin-api"
import { CmsStatusBadge } from "../../../../components/cms/cms-preview-frame"
import { storefrontOrigin } from "../../../../lib/medusa-backend-url"

export default function CmsPagesPage() {
  const [pages, setPages] = useState<CmsPageDto[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    listCmsPages()
      .then((r) => setPages(r.pages))
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

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
          <p className="sr-only">Lijst</p>
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
        {pages.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-wf-200 bg-white px-3 py-3"
          >
            <div>
              <p className="font-semibold">/pagina/{p.slug}</p>
              <p className="text-xs text-wf-600">{p.title.nl || p.title.en}</p>
              <div className="mt-1">
                <CmsStatusBadge
                  published={p.published}
                  extra={p.visible ? "zichtbaar" : "verborgen"}
                />
              </div>
            </div>
            <div className="flex gap-2">
              {p.published ? (
                <a
                  href={`${storefrontOrigin()}/pagina/${p.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-wf border border-wf-500 bg-white px-4 py-2 text-sm font-semibold text-wf-800"
                >
                  Storefront
                </a>
              ) : null}
              <Link
                href={`/cms/pages/${p.id}`}
                className="inline-flex items-center rounded-wf border border-wf-500 bg-white px-4 py-2 text-sm font-semibold text-wf-800"
              >
                Bewerken
              </Link>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (!confirm("Pagina verwijderen?")) return
                  await deleteCmsPage(p.id)
                  load()
                }}
              >
                Verwijderen
              </Button>
            </div>
          </li>
        ))}
        {pages.length === 0 ? (
          <li className="text-sm text-wf-600">Nog geen pagina&apos;s.</li>
        ) : null}
      </ul>
    </div>
  )
}
