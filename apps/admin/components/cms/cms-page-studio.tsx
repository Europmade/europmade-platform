"use client"

import {
  defaultCanonicalForSlug,
  deriveCmsPageStatus,
  getFixedPageBySlug,
  publicPathForCmsSlug,
} from "@europmade/utils"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  createCmsPage,
  emptyLocalized,
  getCmsPage,
  listCmsBanners,
  updateCmsPage,
  type CmsBannerDto,
  type LocalizedCms,
} from "../../lib/cms-admin-api"
import {
  createPageSection,
  documentFromLegacy,
  PAGE_SECTION_KEYS,
  PAGE_SECTION_LABELS,
  syncLegacyFromDocument,
  type CmsPageDocument,
  type PageSectionKey,
} from "../../lib/cms-page-document"
import {
  isCmsPageDocumentEmpty,
  isGenericFixedPageStub,
  seedDocumentForFixedSlug,
} from "../../lib/cms-fixed-page-seed"
import type { CmsI18nMeta } from "../../lib/cms-i18n"
import { pickLoc } from "../../lib/cms-homepage-document"
import { CmsLocalizedField } from "./cms-localized-field"
import { CmsImageField } from "./cms-image-field"
import { CmsPageSectionFields } from "./cms-page-section-fields"
import { CmsSeoFields } from "./cms-seo-fields"
import {
  CmsBreadcrumb,
  CmsEditorShell,
  type CmsViewport,
} from "./cms-editor-shell"
import { CmsLivePreview } from "./cms-live-preview"
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
  const [doc, setDoc] = useState<CmsPageDocument>({ sections: [] })
  const [seoTitle, setSeoTitle] = useState<LocalizedCms>(emptyLocalized())
  const [seoDescription, setSeoDescription] = useState<LocalizedCms>(emptyLocalized())
  const [canonical, setCanonical] = useState("")
  const [meta, setMeta] = useState<CmsI18nMeta>({})
  const [selectedId, setSelectedId] = useState("settings")
  const [picker, setPicker] = useState(false)
  const [banners, setBanners] = useState<CmsBannerDto[]>([])

  useEffect(() => {
    listCmsBanners()
      .then((r) => setBanners(r.banners ?? []))
      .catch(() => setBanners([]))
  }, [])

  useEffect(() => {
    if (!pageId) {
      const hero = createPageSection("hero")
      const text = createPageSection("text")
      setDoc({ sections: [hero, text] })
      setSelectedId(hero.id)
      return
    }
    getCmsPage(pageId)
      .then(({ page }) => {
        setSlug(page.slug)
        setSeoTitle(page.seo_title ?? emptyLocalized())
        setSeoDescription(page.seo_description ?? emptyLocalized())
        setCanonical(
          page.seo_canonical ?? defaultCanonicalForSlug(page.slug)
        )
        setPublished(page.published)
        setVisible(page.visible !== false)
        setPublishAt(toDatetimeLocal(page.publish_at))
        setExpiresAt(toDatetimeLocal(page.expires_at))
        setMeta((page.i18n_meta as CmsI18nMeta) ?? {})
        const next = documentFromLegacy({
          title: page.title,
          body: page.body,
          cover_url: page.cover_url,
          document: page.document,
        })
        // Empty fixed-page stubs: hydrate from storefront fallback seed (do not
        // overwrite non-empty CMS content). User must still Save to persist.
        const seed = seedDocumentForFixedSlug(page.slug)
        if (
          seed &&
          (isCmsPageDocumentEmpty(next) ||
            isGenericFixedPageStub(page.slug, next))
        ) {
          setDoc(seed.document)
          setSeoTitle(page.seo_title?.nl ? page.seo_title : seed.title)
          setSelectedId(seed.document.sections[0]?.id ?? "settings")
          setOk(
            "Pagina aangevuld met bestaande storefront-structuur. Sla op om te bewaren."
          )
        } else {
          setDoc(next)
          setSelectedId(next.sections[0]?.id ?? "settings")
        }
      })
      .catch((e: Error) => setError(e.message))
  }, [pageId])

  const fixed = useMemo(() => getFixedPageBySlug(slug), [slug])
  const publicPath = useMemo(
    () => publicPathForCmsSlug(slug) ?? `/pagina/${slug || "…"}`,
    [slug]
  )

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

  const sorted = useMemo(
    () => [...doc.sections].sort((a, b) => a.sortOrder - b.sortOrder),
    [doc.sections]
  )

  const structure = useMemo(
    () => [
      { id: "chrome_header", label: "Header", hint: "Centraal beheerd", locked: true },
      { id: "settings", label: "Pagina-instellingen", locked: true },
      ...sorted.map((s) => ({
        id: s.id,
        label: PAGE_SECTION_LABELS[s.key],
        hint: s.key,
        visible: s.visible,
      })),
      { id: "chrome_footer", label: "Footer", hint: "Centraal beheerd", locked: true },
      { id: "seo", label: "SEO", locked: true },
    ],
    [sorted]
  )

  async function save(nextPublished: boolean) {
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      const legacy = syncLegacyFromDocument(doc)
      const nextSlug = slug.trim().toLowerCase()
      const payload = {
        slug: nextSlug,
        title: legacy.title,
        body: legacy.body,
        cover_url: legacy.cover_url,
        document: doc,
        seo_title: seoTitle,
        seo_description: seoDescription,
        seo_canonical: canonical.trim() || defaultCanonicalForSlug(nextSlug),
        published: nextPublished,
        visible,
        publish_at: fromDatetimeLocal(publishAt),
        expires_at: fromDatetimeLocal(expiresAt),
        i18n_meta: meta,
      }
      if (isNew) {
        const { page } = await createCmsPage(payload)
        setOk(nextPublished ? "Pagina gepubliceerd." : "Concept opgeslagen.")
        router.replace(`/cms/pages/${page.id}`)
      } else if (pageId) {
        await updateCmsPage(pageId, payload)
        setPublished(nextPublished)
        setOk(nextPublished ? "Pagina gepubliceerd." : "Concept opgeslagen.")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opslaan mislukt")
    } finally {
      setBusy(false)
    }
  }

  const selected = sorted.find((s) => s.id === selectedId)

  return (
    <>
      <CmsEditorShell
        breadcrumb={
          <CmsBreadcrumb
            items={[
              { href: "/cms", label: "CMS" },
              { href: "/cms/pages", label: "Pagina's" },
              { label: isNew ? "Nieuw" : slug },
            ]}
          />
        }
        title={isNew ? "Nieuwe pagina" : pickLoc(syncLegacyFromDocument(doc).title, locale) || slug}
        templateLabel="Contentpagina"
        published={published}
        busy={busy}
        error={error}
        ok={ok}
        viewport={viewport}
        onViewport={setViewport}
        onSaveDraft={() => void save(false)}
        onPublish={() => void save(true)}
        structure={structure}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onMove={(id, dir) => {
          setDoc((prev) => {
            const list = [...prev.sections].sort((a, b) => a.sortOrder - b.sortOrder)
            const idx = list.findIndex((s) => s.id === id)
            const next = idx + dir
            if (idx < 0 || next < 0 || next >= list.length) return prev
            const tmp = list[idx]!
            list[idx] = list[next]!
            list[next] = tmp
            return { sections: list.map((s, i) => ({ ...s, sortOrder: (i + 1) * 10 })) }
          })
        }}
        onToggleVisible={(id) =>
          setDoc((d) => ({
            sections: d.sections.map((s) =>
              s.id === id ? { ...s, visible: !s.visible } : s
            ),
          }))
        }
        onRemove={(id) => {
          setDoc((d) => ({ sections: d.sections.filter((s) => s.id !== id) }))
          setSelectedId("settings")
        }}
        onAddSection={() => setPicker(true)}
        childrenPreview={
          <CmsLivePreview
            kind="page"
            path={`/cms-preview/page/${encodeURIComponent(slug || "concept")}`}
            viewport={viewport}
            locale={locale}
            selectedId={selectedId}
            document={doc}
            slug={slug}
            theme={null}
            onSelect={setSelectedId}
          />
        }
        childrenSettings={
          selectedId === "chrome_header" || selectedId === "chrome_footer" ? (
            <p className="text-sm text-wf-600">
              Sitebreed beheerd — niet per CMS-pagina.
            </p>
          ) : selectedId === "settings" ? (
            <div className="space-y-4">
              <label className="block text-sm font-semibold">
                Slug
                <input
                  className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
                  value={slug}
                  onChange={(e) => {
                    const next = e.target.value
                    setSlug(next)
                    if (!canonical || canonical === defaultCanonicalForSlug(slug)) {
                      setCanonical(defaultCanonicalForSlug(next.trim().toLowerCase()))
                    }
                  }}
                  placeholder="over of juridisch/privacybeleid"
                />
              </label>
              <p className="text-[12px] text-wf-600">
                Publieke URL:{" "}
                <span className="font-semibold text-wf-800">{publicPath}</span>
                {fixed ? (
                  <span className="mt-1 block text-wf-500">
                    Vaste storefront-route (Fase 2A). Canonical blijft{" "}
                    {fixed.path}.
                  </span>
                ) : (
                  <span className="mt-1 block text-wf-500">
                    Ad-hoc pagina via /pagina/{slug || "…"}
                  </span>
                )}
              </p>
              <label className="flex items-center gap-2 text-sm text-wf-800">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={(e) => setVisible(e.target.checked)}
                />
                Pagina zichtbaar (soft flag)
              </label>
              <label className="block text-sm font-semibold">
                Publiceren vanaf
                <input
                  type="datetime-local"
                  className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                />
              </label>
              <label className="block text-sm font-semibold">
                Verloopt op
                <input
                  type="datetime-local"
                  className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </label>
              <p className="rounded-lg border border-wf-200 bg-wf-50 px-3 py-2 text-[12px] text-wf-700">
                Afgeleide status:{" "}
                <strong>{STATUS_LABEL[derivedStatus] ?? derivedStatus}</strong>
                . Live storefront toont alleen Actief (published + zichtbaar +
                binnen planning). Preview toont altijd de draft.
              </p>
              <p className="text-[12px] text-wf-500">
                Opslaan: {published ? "Gepubliceerd" : "Concept"} — gebruik de
                toolbar.
              </p>
            </div>
          ) : selectedId === "seo" ? (
            <CmsSeoFields
              title={seoTitle}
              description={seoDescription}
              canonical={canonical}
              onTitle={setSeoTitle}
              onDescription={setSeoDescription}
              onCanonical={setCanonical}
              meta={meta}
              onMeta={setMeta}
            />
          ) : selected ? (
            <div className="space-y-4">
              {(selected.key === "hero" ||
                selected.key === "image_text" ||
                selected.key === "banner") && (
                <CmsImageField
                  label="Afbeelding"
                  url={selected.image ?? null}
                  large={selected.key === "hero"}
                  placement={
                    selected.key === "banner" ? "cms_banner" : "homepage_hero"
                  }
                  onChange={(image) =>
                    setDoc((d) => ({
                      sections: d.sections.map((s) =>
                        s.id === selected.id ? { ...s, image } : s
                      ),
                    }))
                  }
                  onError={setError}
                />
              )}
              {selected.key === "banner" ? (
                <label className="block text-sm font-semibold">
                  Banner uit bibliotheek (optioneel)
                  <select
                    className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs"
                    value={selected.bannerId ?? ""}
                    onChange={(e) => {
                      const id = e.target.value
                      const banner = banners.find((b) => b.id === id)
                      setDoc((d) => ({
                        sections: d.sections.map((s) =>
                          s.id === selected.id
                            ? {
                                ...s,
                                bannerId: id || null,
                                image: banner?.image_url ?? s.image,
                                href: banner?.destination_url || s.href,
                              }
                            : s
                        ),
                      }))
                    }}
                  >
                    <option value="">— Geen bibliotheek-banner —</option>
                    {banners.map((b) => (
                      <option key={b.id} value={b.id}>
                        {pickLoc(b.title, locale) || b.id}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <CmsPageSectionFields
                section={selected}
                meta={meta}
                onMetaChange={setMeta}
                onChange={(next) =>
                  setDoc((d) => ({
                    sections: d.sections.map((s) =>
                      s.id === selected.id ? next : s
                    ),
                  }))
                }
              />
            </div>
          ) : (
            <p className="text-sm text-wf-500">Selecteer een sectie.</p>
          )
        }
      />
      {picker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4">
            <p className="mb-3 font-bold">Sectie toevoegen</p>
            {PAGE_SECTION_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className="mb-1 w-full rounded-lg border border-wf-200 px-3 py-2 text-left text-sm"
                onClick={() => {
                  const section = createPageSection(key as PageSectionKey)
                  setDoc((d) => ({ sections: [...d.sections, section] }))
                  setSelectedId(section.id)
                  setPicker(false)
                }}
              >
                {PAGE_SECTION_LABELS[key]}
              </button>
            ))}
            <button type="button" className="mt-2 text-sm text-wf-500" onClick={() => setPicker(false)}>
              Annuleren
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export function CmsPageStudio({ pageId }: { pageId?: string }) {
  return (
    <CmsLocaleProvider>
      <Inner pageId={pageId} />
    </CmsLocaleProvider>
  )
}
