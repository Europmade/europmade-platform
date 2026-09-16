"use client"

import {
  deriveCmsPageStatus,
  parseCmsActionBannerUrl,
  parseCmsActionProductIds,
  publicActionPath,
} from "@europmade/utils"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  createCmsPage,
  emptyLocalized,
  getCmsPage,
  updateCmsPage,
  type LocalizedCms,
} from "../../lib/cms-admin-api"
import type { CmsI18nMeta } from "../../lib/cms-i18n"
import { CmsLocalizedField } from "./cms-localized-field"
import { CmsImageField } from "./cms-image-field"
import { CmsSeoFields } from "./cms-seo-fields"
import { CmsProductPicker } from "./cms-product-picker"
import { CmsBreadcrumb, CmsEditorShell, type CmsViewport } from "./cms-editor-shell"
import { CmsLocaleProvider, useCmsLocale } from "./cms-locale-toolbar"

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(value: string): string | null {
  if (!value.trim()) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
}

const STATUS_LABEL: Record<string, string> = {
  concept: "Concept",
  planned: "Gepland",
  active: "Actief",
  expired: "Verlopen",
}

function Inner({ pageId }: { pageId?: string }) {
  const router = useRouter()
  const { locale } = useCmsLocale()
  const isNew = !pageId
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [slug, setSlug] = useState("")
  const [viewport, setViewport] = useState<CmsViewport>("desktop")
  const [published, setPublished] = useState(false)
  const [visible, setVisible] = useState(true)
  const [publishAt, setPublishAt] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [title, setTitle] = useState<LocalizedCms>(emptyLocalized())
  const [intro, setIntro] = useState<LocalizedCms>(emptyLocalized())
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [productIds, setProductIds] = useState<string[]>([])
  const [seoTitle, setSeoTitle] = useState<LocalizedCms>(emptyLocalized())
  const [seoDescription, setSeoDescription] = useState<LocalizedCms>(emptyLocalized())
  const [canonical, setCanonical] = useState("")
  const [meta, setMeta] = useState<CmsI18nMeta>({})
  const [selectedId, setSelectedId] = useState("settings")

  useEffect(() => {
    if (!pageId) return
    getCmsPage(pageId)
      .then(({ page }) => {
        setSlug(page.slug)
        setTitle(page.title ?? emptyLocalized())
        setSeoTitle(page.seo_title ?? emptyLocalized())
        setSeoDescription(page.seo_description ?? emptyLocalized())
        setPublished(page.published)
        setVisible(page.visible !== false)
        setPublishAt(toDatetimeLocal(page.publish_at))
        setExpiresAt(toDatetimeLocal(page.expires_at))
        const doc = (page.document ?? {}) as Record<string, unknown>
        setCoverUrl(page.cover_url || parseCmsActionBannerUrl(doc))
        setCanonical(page.seo_canonical ?? publicActionPath(page.slug))
        setMeta((page.i18n_meta as CmsI18nMeta) ?? {})
        const introRaw = doc.intro
        if (introRaw && typeof introRaw === "object") {
          const v = introRaw as Record<string, unknown>
          setIntro({
            nl: typeof v.nl === "string" ? v.nl : "",
            en: typeof v.en === "string" ? v.en : "",
            de: typeof v.de === "string" ? v.de : "",
            fr: typeof v.fr === "string" ? v.fr : "",
          })
        } else {
          setIntro(page.body ?? emptyLocalized())
        }
        setProductIds(parseCmsActionProductIds(page.document))
      })
      .catch((e: Error) => setError(e.message))
  }, [pageId])

  const derivedStatus = useMemo(
    () =>
      deriveCmsPageStatus({
        published,
        visible,
        publish_at: fromDatetimeLocal(publishAt),
        expires_at: fromDatetimeLocal(expiresAt),
      }),
    [published, visible, publishAt, expiresAt]
  )

  const publicPath = publicActionPath(slug || "…")

  function actionDocument() {
    return {
      kind: "action" as const,
      intro,
      product_ids: productIds,
      banner_url: coverUrl,
    }
  }

  async function save(nextPublished: boolean) {
    const nextSlug = slugify(slug)
    if (!nextSlug) {
      setError("Slug is verplicht.")
      return
    }
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      const payload = {
        slug: nextSlug,
        title,
        body: intro,
        seo_title: seoTitle,
        seo_description: seoDescription,
        seo_canonical: canonical.trim() || publicActionPath(nextSlug),
        i18n_meta: meta,
        published: nextPublished,
        visible,
        publish_at: fromDatetimeLocal(publishAt),
        expires_at: fromDatetimeLocal(expiresAt),
        cover_url: coverUrl,
        document: actionDocument(),
      }
      if (isNew) {
        const created = await createCmsPage(payload)
        setCoverUrl(created.page.cover_url || coverUrl)
        setPublished(nextPublished)
        setOk(nextPublished ? "Actie gepubliceerd." : "Concept opgeslagen.")
        router.replace(`/cms/actions/${created.page.id}`)
      } else if (pageId) {
        const updated = await updateCmsPage(pageId, payload)
        setCoverUrl(updated.page.cover_url || coverUrl)
        setPublished(nextPublished)
        setOk(nextPublished ? "Actie gepubliceerd." : "Concept opgeslagen.")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opslaan mislukt.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <CmsEditorShell
      breadcrumb={
        <CmsBreadcrumb
          items={[
            { href: "/cms", label: "CMS" },
            { href: "/cms/actions", label: "Acties" },
            { label: isNew ? "Nieuw" : slug },
          ]}
        />
      }
      title={isNew ? "Nieuwe actie" : title[locale] || slug}
      templateLabel="Actiepagina"
      published={published}
      busy={busy}
      error={error}
      ok={ok}
      viewport={viewport}
      onViewport={setViewport}
      onSaveDraft={() => void save(false)}
      onPublish={() => void save(true)}
      structure={[
        { id: "settings", label: "Basis & planning" },
        { id: "visual", label: "Banner" },
        { id: "products", label: "Producten" },
        { id: "seo", label: "SEO" },
      ]}
      selectedId={selectedId}
      onSelect={setSelectedId}
      childrenPreview={
        <div className="space-y-3 rounded-xl border border-wf-200 bg-white p-4 text-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-wf-500">
            Publiek {publicPath}
          </p>
          <p className="text-lg font-bold text-wf-900">{title.nl || slug || "Titel"}</p>
          <p className="text-wf-600">{intro.nl || "Intro…"}</p>
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="max-h-40 w-full rounded object-cover" />
          ) : null}
          <p className="text-[12px] text-wf-500">{productIds.length} producten geselecteerd</p>
          <p className="text-[12px] text-wf-700">
            Status: <strong>{STATUS_LABEL[derivedStatus] ?? derivedStatus}</strong>
          </p>
        </div>
      }
      childrenSettings={
        selectedId === "visual" ? (
          <CmsImageField
            label="Banner / hero"
            advice="Adviesformaat: 1600 × 480 px (breed). Valt als hero op de actiepagina."
            hint="Optioneel. Leeg = alleen titel en producten."
            url={coverUrl}
            placement="cms_action_banner"
            previewFit="cover"
            onChange={setCoverUrl}
            onError={setError}
          />
        ) : selectedId === "products" ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Producten in deze actie</p>
            <p className="text-[12px] text-wf-600">
              Alleen deze Product Cloud-producten verschijnen op de actiepagina.
              Filters op de storefront worden automatisch afgeleid van hun echte
              categorieën.
            </p>
            <CmsProductPicker productIds={productIds} onChange={setProductIds} />
          </div>
        ) : selectedId === "seo" ? (
          <CmsSeoFields
            title={seoTitle}
            description={seoDescription}
            canonical={canonical || publicPath}
            onTitle={setSeoTitle}
            onDescription={setSeoDescription}
            onCanonical={setCanonical}
            meta={meta}
            onMeta={setMeta}
          />
        ) : (
          <div className="space-y-4">
            <label className="block text-sm font-semibold">
              Slug
              <input
                className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="zomerdeals"
              />
            </label>
            <p className="text-[12px] text-wf-600">
              Publieke URL: <span className="font-semibold text-wf-800">{publicPath}</span>
            </p>
            <CmsLocalizedField
              label="Titel"
              field="action.title"
              value={title}
              onChange={setTitle}
              meta={meta}
              onMetaChange={setMeta}
            />
            <CmsLocalizedField
              label="Intro"
              field="action.intro"
              value={intro}
              onChange={setIntro}
              meta={meta}
              onMetaChange={setMeta}
              multiline
            />
            <label className="flex items-center gap-2 text-sm text-wf-800">
              <input
                type="checkbox"
                checked={visible}
                onChange={(e) => setVisible(e.target.checked)}
              />
              Zichtbaar (soft flag)
            </label>
            <label className="block text-sm font-semibold">
              Start (publiceren vanaf)
              <input
                type="datetime-local"
                className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold">
              Einde (verloopt op)
              <input
                type="datetime-local"
                className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </label>
            <p className="rounded-lg border border-wf-200 bg-wf-50 px-3 py-2 text-[12px] text-wf-700">
              Afgeleide status:{" "}
              <strong>{STATUS_LABEL[derivedStatus] ?? derivedStatus}</strong>.
              Publiek zichtbaar alleen als Actief (gepubliceerd + zichtbaar + binnen
              start/einde).
            </p>
          </div>
        )
      }
    />
  )
}

export function CmsActionStudio({ pageId }: { pageId?: string }) {
  return (
    <CmsLocaleProvider>
      <Inner pageId={pageId} />
    </CmsLocaleProvider>
  )
}
