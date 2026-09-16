"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { deriveCmsPageStatus, isCmsActionDocument, publicActionPath } from "@europmade/utils"
import { Button, Notice } from "@europmade/ui"
import {
  createCmsPage,
  deleteCmsPage,
  emptyLocalized,
  listCmsPages,
  type CmsPageDto,
} from "../../../../lib/cms-admin-api"
import { CmsStatusBadge } from "../../../../components/cms/cms-preview-frame"

const STATUS_LABEL: Record<string, string> = {
  concept: "Concept",
  planned: "Gepland",
  active: "Actief",
  expired: "Verlopen",
}

function locTitle(page: CmsPageDto): string {
  return page.title?.nl || page.title?.en || page.slug
}

export default function CmsActionsPage() {
  const [pages, setPages] = useState<CmsPageDto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    listCmsPages()
      .then((r) => setPages(r.pages.filter((p) => isCmsActionDocument(p.document))))
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const rows = useMemo(
    () =>
      pages.slice().sort((a, b) => a.slug.localeCompare(b.slug)),
    [pages]
  )

  async function createAction() {
    setBusy(true)
    setError(null)
    try {
      const created = await createCmsPage({
        slug: `actie-${Date.now()}`,
        title: { ...emptyLocalized(), nl: "Nieuwe actie" },
        body: emptyLocalized(),
        published: false,
        visible: true,
        document: { kind: "action", intro: emptyLocalized(), product_ids: [] },
      })
      window.location.href = `/cms/actions/${created.page.id}`
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aanmaken mislukt.")
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
            <Link href="/cms" className="hover:underline">
              CMS
            </Link>{" "}
            / Acties
          </p>
          <h1 className="text-xl font-bold text-wf-950">Actiepagina&apos;s</h1>
          <p className="mt-1 text-sm text-wf-600">
            Commerciële landingspagina&apos;s met een door jou gekozen productset.
            Dit is geen Product Cloud-categorie.
          </p>
        </div>
        <Button type="button" onClick={() => void createAction()} disabled={busy}>
          + Actie aanmaken
        </Button>
      </div>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <div className="overflow-x-auto rounded-xl border border-wf-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-wf-100 text-[11px] uppercase tracking-wide text-wf-500">
            <tr>
              <th className="px-3 py-2">Titel</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-wf-500">
                  Nog geen acties. Maak er een aan om producten te koppelen.
                </td>
              </tr>
            ) : (
              rows.map((page) => {
                const status = deriveCmsPageStatus({
                  published: page.published,
                  visible: page.visible !== false,
                  publish_at: page.publish_at ?? null,
                  expires_at: page.expires_at ?? null,
                })
                return (
                  <tr key={page.id} className="border-b border-wf-50 last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        href={`/cms/actions/${page.id}`}
                        className="font-semibold text-wf-900 hover:underline"
                      >
                        {locTitle(page)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-mono text-[12px] text-wf-600">
                      {publicActionPath(page.slug)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="mr-2 text-[12px] text-wf-700">
                        {STATUS_LABEL[status] ?? status}
                      </span>
                      <CmsStatusBadge published={page.published} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="text-[12px] text-red-700 underline"
                        onClick={() => {
                          if (!confirm("Deze actie verwijderen?")) return
                          void deleteCmsPage(page.id).then(load)
                        }}
                      >
                        Verwijderen
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
