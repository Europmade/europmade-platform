"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Notice } from "@europmade/ui"
import { listCmsEditorialCategories } from "../../../../lib/cms-admin-api"
import { listTaxonomyCategories, type AdminTaxonomyCategory } from "../../../../lib/category-admin-api"
import { CmsStatusBadge } from "../../../../components/cms/cms-preview-frame"

export default function CmsCategoriesIndexPage() {
  const [taxonomy, setTaxonomy] = useState<AdminTaxonomyCategory[]>([])
  const [cmsBySlug, setCmsBySlug] = useState<Record<string, { published: boolean; updated_at?: string }>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listTaxonomyCategories(), listCmsEditorialCategories()])
      .then(([tax, cms]) => {
        setTaxonomy(tax.categories)
        const map: Record<string, { published: boolean; updated_at?: string }> = {}
        for (const row of cms.categories) {
          map[row.category_slug] = {
            published: row.published,
            updated_at: row.updated_at,
          }
        }
        setCmsBySlug(map)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  const byId = useMemo(() => {
    const m = new Map<string, AdminTaxonomyCategory>()
    for (const c of taxonomy) m.set(c.id, c)
    return m
  }, [taxonomy])

  const roots = taxonomy.filter((c) => !c.parent_category_id)
  const childrenOf = (id: string) =>
    taxonomy.filter((c) => c.parent_category_id === id)

  function depthLabel(cat: AdminTaxonomyCategory): string {
    let depth = 0
    let parent = cat.parent_category_id
    while (parent && depth < 4) {
      depth += 1
      parent = byId.get(parent)?.parent_category_id ?? null
    }
    if (depth === 0) return "Hoofdcategorie"
    if (depth === 1) return "Subcategorie"
    return "Sub-subcategorie"
  }

  function renderNode(cat: AdminTaxonomyCategory, indent: number) {
    const slug = cat.slug ?? ""
    const cms = slug ? cmsBySlug[slug] : undefined
    return (
      <li key={cat.id} style={{ marginLeft: indent * 16 }}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-wf-200 bg-white px-3 py-2">
          <div>
            <p className="font-semibold text-wf-900">{cat.name}</p>
            <p className="text-[11px] text-wf-500">
              {depthLabel(cat)} · {slug || "geen slug"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CmsStatusBadge published={Boolean(cms?.published)} extra={cms ? undefined : "geen CMS-document"} />
            {slug ? (
              <Link
                href={`/cms/categories/${encodeURIComponent(slug)}`}
                className="rounded-wf border border-wf-500 bg-white px-3 py-1.5 text-sm font-semibold text-wf-800"
              >
                Bewerken
              </Link>
            ) : null}
          </div>
        </div>
        <ul>{childrenOf(cat.id).map((child) => renderNode(child, indent + 1))}</ul>
      </li>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-wf-500">
        <Link href="/cms" className="hover:underline">
          CMS
        </Link>{" "}
        / Categoriepagina&apos;s
      </p>
      <h1 className="text-xl font-bold text-wf-950">Categoriecontent</h1>
      <p className="sr-only">Taxonomie</p>
      <p className="text-sm text-wf-600">
        Redactionele laag per canonieke Product Cloud-categorie. Productlijsten
        blijven dynamisch vanuit Product Cloud.
      </p>
      {error ? <Notice variant="warning">{error}</Notice> : null}
      <ul className="space-y-1">
        {roots.map((c) => renderNode(c, 0))}
      </ul>
      {taxonomy.length === 0 ? (
        <p className="text-sm text-wf-600">Geen pc_category gevonden.</p>
      ) : null}
    </div>
  )
}
