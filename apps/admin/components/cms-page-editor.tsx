"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button, Input, Notice } from "@europmade/ui"
import {
  createCmsPage,
  emptyLocalized,
  getCmsPage,
  updateCmsPage,
  uploadCmsMedia,
  type LocalizedCms,
} from "../lib/cms-admin-api"
import type { CmsI18nMeta } from "../lib/cms-i18n"
import {
  CmsLocaleProvider,
  CmsLocaleToolbar,
  useCmsLocale,
} from "./cms/cms-locale-toolbar"
import { CmsLocalizedField } from "./cms/cms-localized-field"
import { CmsPreviewFrame, CmsStatusBadge } from "./cms/cms-preview-frame"

function Inner({ pageId }: { pageId?: string }) {
  const router = useRouter()
  const { locale } = useCmsLocale()
  const isNew = !pageId
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [slug, setSlug] = useState("")
  const [title, setTitle] = useState<LocalizedCms>(emptyLocalized())
  const [body, setBody] = useState<LocalizedCms>(emptyLocalized())
  const [seoTitle, setSeoTitle] = useState<LocalizedCms>(emptyLocalized())
  const [seoDescription, setSeoDescription] = useState<LocalizedCms>(emptyLocalized())
  const [canonical, setCanonical] = useState("")
  const [coverUrl, setCoverUrl] = useState("")
  const [published, setPublished] = useState(false)
  const [meta, setMeta] = useState<CmsI18nMeta>({})
  const [tab, setTab] = useState<"edit" | "preview">("edit")
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop")

  useEffect(() => {
    if (!pageId) return
    getCmsPage(pageId)
      .then(({ page }) => {
        setSlug(page.slug)
        setTitle(page.title)
        setBody(page.body)
        setSeoTitle(page.seo_title ?? emptyLocalized())
        setSeoDescription(page.seo_description ?? emptyLocalized())
        setCanonical(page.seo_canonical ?? `/pagina/${page.slug}`)
        setCoverUrl(page.cover_url ?? "")
        setPublished(page.published)
        setMeta((page.i18n_meta as CmsI18nMeta) ?? {})
      })
      .catch((e: Error) => setError(e.message))
  }, [pageId])

  async function persist(nextPublished: boolean) {
    setBusy(true)
    setError(null)
    try {
      const payload = {
        slug,
        title,
        body,
        seo_title: seoTitle,
        seo_description: seoDescription,
        seo_canonical: canonical || `/pagina/${slug}`,
        cover_url: coverUrl || null,
        published: nextPublished,
        i18n_meta: meta,
      }
      if (isNew) {
        const { page } = await createCmsPage(payload)
        router.replace(`/cms/pages/${page.id}`)
      } else if (pageId) {
        await updateCmsPage(pageId, payload)
        setPublished(nextPublished)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opslaan mislukt")
    } finally {
      setBusy(false)
    }
  }

  async function onCover(file: File | null) {
    if (!file) {
      setCoverUrl("")
      return
    }
    const uploaded = await uploadCmsMedia(file, "cms_banner")
    setCoverUrl(uploaded.asset.url)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-wf-500">
        <Link href="/cms" className="hover:underline">
          CMS
        </Link>{" "}
        /{" "}
        <Link href="/cms/pages" className="hover:underline">
          Pagina&apos;s
        </Link>
      </p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-wf-950">
            {isNew ? "Nieuwe pagina" : "Pagina bewerken"}
          </h1>
          <p className="mt-1 text-sm text-wf-600">
            Gepubliceerde pagina&apos;s staan op de storefront onder{" "}
            <span className="font-mono text-xs">/pagina/{slug || "slug"}</span>
          </p>
          <div className="mt-2">
            <CmsStatusBadge published={published} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => persist(false)}>
            Opslaan als concept
          </Button>
          <Button disabled={busy} onClick={() => persist(true)}>
            Publiceren
          </Button>
        </div>
      </div>
      {error ? <Notice variant="warning">{error}</Notice> : null}
      <CmsLocaleToolbar />
      <div className="flex gap-2">
        <Button
          type="button"
          variant={tab === "edit" ? "primary" : "secondary"}
          onClick={() => setTab("edit")}
        >
          Bewerken
        </Button>
        <Button
          type="button"
          variant={tab === "preview" ? "primary" : "secondary"}
          onClick={() => setTab("preview")}
        >
          Preview
        </Button>
      </div>

      {tab === "preview" ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={viewport === "desktop" ? "primary" : "secondary"}
              onClick={() => setViewport("desktop")}
            >
              Desktop
            </Button>
            <Button
              type="button"
              variant={viewport === "mobile" ? "primary" : "secondary"}
              onClick={() => setViewport("mobile")}
            >
              Mobiel
            </Button>
          </div>
          <CmsPreviewFrame viewport={viewport}>
            <article className="px-6 py-8">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="" className="mb-4 max-h-56 w-full object-cover" />
              ) : null}
              <h1 className="text-2xl font-bold text-wf-900">{title[locale] || title.nl}</h1>
              <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-wf-700">
                {body[locale] || body.nl}
              </p>
            </article>
          </CmsPreviewFrame>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-wf-200 bg-white p-4">
          <label className="block text-sm font-semibold">
            Slug
            <Input className="mt-1" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </label>
          <CmsLocalizedField
            label="Titel"
            field="title"
            value={title}
            onChange={setTitle}
            meta={meta}
            onMetaChange={setMeta}
          />
          <CmsLocalizedField
            label="Content"
            field="body"
            value={body}
            onChange={setBody}
            meta={meta}
            onMetaChange={setMeta}
            multiline
            rows={10}
          />
          <div>
            <p className="mb-1 text-sm font-semibold">Coverafbeelding</p>
            {coverUrl ? (
              <div className="mb-2 space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverUrl} alt="" className="max-h-40 rounded object-cover" />
                <Button type="button" variant="secondary" onClick={() => onCover(null)}>
                  Verwijderen
                </Button>
              </div>
            ) : null}
            <input type="file" accept="image/*" onChange={(e) => onCover(e.target.files?.[0] ?? null)} />
          </div>
          <CmsLocalizedField
            label="SEO-titel"
            field="seo_title"
            value={seoTitle}
            onChange={setSeoTitle}
            meta={meta}
            onMetaChange={setMeta}
          />
          <CmsLocalizedField
            label="SEO-beschrijving"
            field="seo_description"
            value={seoDescription}
            onChange={setSeoDescription}
            meta={meta}
            onMetaChange={setMeta}
            multiline
          />
          <label className="block text-sm">
            Canonical
            <Input className="mt-1" value={canonical} onChange={(e) => setCanonical(e.target.value)} />
          </label>
        </div>
      )}
    </div>
  )
}

export default function CmsPageEditor({ pageId }: { pageId?: string }) {
  return (
    <CmsLocaleProvider>
      <Inner pageId={pageId} />
    </CmsLocaleProvider>
  )
}
