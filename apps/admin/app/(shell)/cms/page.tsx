"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  getCmsHomepage,
  listCmsBanners,
  listCmsEditorialCategories,
  listCmsEditorialProducts,
  listCmsPages,
} from "../../../lib/cms-admin-api"
import { CmsStatusBadge } from "../../../components/cms/cms-preview-frame"

type Row = {
  href: string
  name: string
  type: string
  published: boolean
  updated?: string
}

export default function CmsIndexPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [counts, setCounts] = useState({ pages: 0, banners: 0, cats: 0, products: 0 })

  useEffect(() => {
    Promise.allSettled([
      getCmsHomepage(),
      listCmsPages(),
      listCmsBanners(),
      listCmsEditorialCategories(),
      listCmsEditorialProducts(),
    ]).then((results) => {
      const homepage = results[0].status === "fulfilled" ? results[0].value.homepage : null
      const pages = results[1].status === "fulfilled" ? results[1].value.pages : []
      const banners = results[2].status === "fulfilled" ? results[2].value.banners : []
      const cats = results[3].status === "fulfilled" ? results[3].value.categories : []
      const products = results[4].status === "fulfilled" ? results[4].value.products : []
      setCounts({
        pages: pages.length,
        banners: banners.length,
        cats: cats.length,
        products: products.length,
      })
      const recent: Row[] = []
      if (homepage) {
        recent.push({
          href: "/cms/homepage",
          name: "Homepage",
          type: "Homepage",
          published: homepage.published,
          updated: homepage.updated_at,
        })
      }
      for (const p of pages.slice(0, 6)) {
        recent.push({
          href: `/cms/pages/${p.id}`,
          name: p.title.nl || p.slug,
          type: "Pagina",
          published: p.published,
          updated: p.updated_at,
        })
      }
      for (const c of cats.slice(0, 4)) {
        recent.push({
          href: `/cms/categories/${encodeURIComponent(c.category_slug)}`,
          name: c.category_slug,
          type: "Categorie",
          published: c.published,
          updated: c.updated_at,
        })
      }
      for (const p of products.slice(0, 4)) {
        recent.push({
          href: `/cms/products/${encodeURIComponent(p.product_id)}`,
          name: p.product_id,
          type: "Product",
          published: p.published,
          updated: p.updated_at,
        })
      }
      recent.sort((a, b) => String(b.updated ?? "").localeCompare(String(a.updated ?? "")))
      setRows(recent.slice(0, 12))
    })
  }, [])

  const shortcuts = [
    { href: "/cms/homepage", title: "Homepage", body: "Hero, secties en SEO" },
    { href: "/cms/design", title: "Design / Theme", body: "Kleuren, knoppen, kaarten" },
    { href: "/cms/products/template", title: "Producttemplate", body: "Layout zonder EAN" },
    { href: "/cms/categories", title: "Categorieën", body: `${counts.cats} documenten` },
    { href: "/cms/products", title: "Productpagina's", body: "Zoek in Product Cloud" },
    { href: "/cms/pages", title: "Pagina's", body: `${counts.pages} pagina's` },
    { href: "/cms/actions", title: "Acties", body: "Landingspagina's met productset" },
    { href: "/cms/banners", title: "Banners", body: `${counts.banners} banners` },
    { href: "/cms/translations", title: "Vertalingen", body: "DeepL-status" },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-wf-950">CMS</h1>
          <p className="mt-1 text-sm text-wf-600">
            Visuele editor voor homepage, categorie, product en contentpagina&apos;s.
          </p>
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-950">
            UAT: testdata herken je aan <strong>UAT-CMS</strong> of slug{" "}
            <strong>cms-uat</strong>. Wijzig geen Product Cloud-producten, sellers of
            echte catalogusdata. Design/theme is optioneel voor deze testronde.
          </p>
        </div>
        <Link
          href="/cms/pages/new"
          className="rounded-wf bg-wf-900 px-4 py-2 text-sm font-semibold text-white"
        >
          + Nieuwe pagina
        </Link>
      </div>

      <ul className="grid gap-3 tablet:grid-cols-3">
        {shortcuts.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-xl border border-wf-200 bg-white px-4 py-4 hover:border-wf-400"
            >
              <p className="font-semibold text-wf-900">{item.title}</p>
              <p className="mt-1 text-sm text-wf-600">{item.body}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div>
        <h2 className="mb-2 text-sm font-bold text-wf-900">Recente content</h2>
        <div className="overflow-x-auto rounded-xl border border-wf-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-wf-100 text-[11px] uppercase tracking-wide text-wf-500">
              <tr>
                <th className="px-3 py-2">Naam</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Gewijzigd</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.href + row.name} className="border-b border-wf-50 last:border-0">
                  <td className="px-3 py-2">
                    <Link href={row.href} className="font-semibold text-wf-900 hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-wf-600">{row.type}</td>
                  <td className="px-3 py-2">
                    <CmsStatusBadge published={row.published} />
                  </td>
                  <td className="px-3 py-2 text-[12px] text-wf-500">
                    {row.updated ? new Date(row.updated).toLocaleString("nl-NL") : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-wf-500" colSpan={4}>
                    Nog geen recente content.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
