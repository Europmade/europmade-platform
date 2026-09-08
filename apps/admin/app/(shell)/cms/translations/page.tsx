"use client"

import Link from "next/link"
import { CmsLocaleProvider, CmsLocaleToolbar } from "../../../../components/cms/cms-locale-toolbar"
import { getCmsTranslateStatus } from "../../../../lib/cms-admin-api"
import { useEffect, useState } from "react"
import { Notice } from "@europmade/ui"

const CMS_CONTENT_LINKS = [
  {
    href: "/cms/homepage",
    title: "Homepage",
    body: "Hero, USP’s, nieuwsbrief, campagnes, SEO — per taalveld in de editor.",
  },
  {
    href: "/cms/pages",
    title: "CMS-pagina’s",
    body: "Titel, body, CTA’s en SEO van contentpagina’s.",
  },
  {
    href: "/cms/banners",
    title: "Banners",
    body: "Bannerteksten, CTA’s en alt-teksten in de bannerbibliotheek.",
  },
  {
    href: "/cms/categories",
    title: "Categorieën",
    body: "Categorie-intro, FAQ, USP’s en SEO (geen Product Cloud-productnamen).",
  },
  {
    href: "/cms/products/template",
    title: "Producttemplate",
    body: "Aanvullende CMS-secties op het producttemplate (intro, waarom, FAQ).",
  },
] as const

function Inner() {
  const [message, setMessage] = useState("Laden…")
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    getCmsTranslateStatus()
      .then((r) => {
        setConfigured(r.configured)
        setMessage(r.message)
      })
      .catch((e: Error) => setMessage(e.message))
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-wf-500">
        <Link href="/cms" className="hover:underline">
          CMS
        </Link>{" "}
        / Vertalingen
      </p>
      <h1 className="text-xl font-bold text-wf-950">CMS-vertalingen</h1>
      <p className="text-sm text-wf-600">
        Deze pagina legt uit <strong>welke content</strong> je in CMS per taal
        beheert. Productnamen, specificaties en EAN blijven in Product Cloud —
        die vertaal je daar, niet hier.
      </p>
      <CmsLocaleToolbar />
      <Notice variant={configured ? "info" : "warning"}>{message}</Notice>

      <div className="rounded-xl border border-wf-200 bg-white p-4 text-sm text-wf-700">
        <p className="font-semibold text-wf-900">Twee lagen</p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <strong>Product Cloud</strong> — productdata en productvertalingen.{" "}
            <Link
              href="/product-cloud/translations"
              className="font-semibold text-sky-700 hover:underline"
            >
              Open Product Cloud-vertalingen
            </Link>
          </li>
          <li>
            <strong>CMS-content</strong> — redactionele teksten (hero, FAQ,
            banners, pagina’s). Per veld kies je taal in de editor; handmatige
            overrides worden niet stilletjes overschreven door DeepL.
          </li>
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-wf-900">
          Waar vertaal je CMS-content?
        </p>
        {CMS_CONTENT_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-xl border border-wf-200 bg-white px-4 py-3 hover:border-wf-400"
          >
            <p className="font-semibold text-wf-900">{item.title}</p>
            <p className="mt-0.5 text-sm text-wf-600">{item.body}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function CmsTranslationsPage() {
  return (
    <CmsLocaleProvider>
      <Inner />
    </CmsLocaleProvider>
  )
}
