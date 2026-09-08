"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  createCmsPage,
  emptyLocalized,
  getCmsPage,
  updateCmsPage,
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
import type { CmsI18nMeta } from "../../lib/cms-i18n"
import { pickLoc } from "../../lib/cms-homepage-document"
import { CmsLocalizedField } from "./cms-localized-field"
import { CmsImageField } from "./cms-image-field"
import { CmsSeoFields } from "./cms-seo-fields"
import {
  CmsBreadcrumb,
  CmsEditorShell,
  type CmsViewport,
} from "./cms-editor-shell"
import { CmsLivePreview } from "./cms-live-preview"
import { CmsLocaleProvider, useCmsLocale } from "./cms-locale-toolbar"

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
  const [doc, setDoc] = useState<CmsPageDocument>({ sections: [] })
  const [seoTitle, setSeoTitle] = useState<LocalizedCms>(emptyLocalized())
  const [seoDescription, setSeoDescription] = useState<LocalizedCms>(emptyLocalized())
  const [canonical, setCanonical] = useState("")
  const [meta, setMeta] = useState<CmsI18nMeta>({})
  const [selectedId, setSelectedId] = useState("settings")
  const [picker, setPicker] = useState(false)

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
        setCanonical(page.seo_canonical ?? `/pagina/${page.slug}`)
        setPublished(page.published)
        setMeta((page.i18n_meta as CmsI18nMeta) ?? {})
        const next = documentFromLegacy({
          title: page.title,
          body: page.body,
          cover_url: page.cover_url,
          document: page.document,
        })
        setDoc(next)
        setSelectedId(next.sections[0]?.id ?? "settings")
      })
      .catch((e: Error) => setError(e.message))
  }, [pageId])

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
      const payload = {
        slug,
        title: legacy.title,
        body: legacy.body,
        cover_url: legacy.cover_url,
        document: doc,
        seo_title: seoTitle,
        seo_description: seoDescription,
        seo_canonical: canonical || `/pagina/${slug}`,
        published: nextPublished,
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
                Slug (storefront: /pagina/…)
                <input className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm" value={slug} onChange={(e) => setSlug(e.target.value)} />
              </label>
              <p className="text-[12px] text-wf-500">
                Status: {published ? "Gepubliceerd" : "Concept"}. Gebruik
                Opslaan als concept / Publiceren in de toolbar.
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
              <CmsLocalizedField
                label="Titel"
                field={`${selected.id}.title`}
                value={selected.title}
                onChange={(title) =>
                  setDoc((d) => ({
                    sections: d.sections.map((s) =>
                      s.id === selected.id ? { ...s, title } : s
                    ),
                  }))
                }
                meta={meta}
                onMetaChange={setMeta}
              />
              <CmsLocalizedField
                label="Tekst"
                field={`${selected.id}.body`}
                value={selected.body}
                onChange={(body) =>
                  setDoc((d) => ({
                    sections: d.sections.map((s) =>
                      s.id === selected.id ? { ...s, body } : s
                    ),
                  }))
                }
                meta={meta}
                onMetaChange={setMeta}
                multiline
              />
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
              {(selected.key === "cta" || selected.key === "hero") && (
                <>
                  <CmsLocalizedField
                    label="CTA-tekst"
                    field={`${selected.id}.cta`}
                    value={selected.ctaLabel || emptyLocalized()}
                    onChange={(ctaLabel) =>
                      setDoc((d) => ({
                        sections: d.sections.map((s) =>
                          s.id === selected.id ? { ...s, ctaLabel } : s
                        ),
                      }))
                    }
                    meta={meta}
                    onMetaChange={setMeta}
                  />
                  <label className="block text-sm font-semibold">
                    CTA-link
                    <input
                      className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
                      value={selected.href || ""}
                      onChange={(e) =>
                        setDoc((d) => ({
                          sections: d.sections.map((s) =>
                            s.id === selected.id
                              ? { ...s, href: e.target.value }
                              : s
                          ),
                        }))
                      }
                      placeholder="/pad-of-https://…"
                    />
                  </label>
                </>
              )}
              <label className="flex items-center gap-2 text-sm text-wf-800">
                <input
                  type="checkbox"
                  checked={selected.visible}
                  onChange={(e) =>
                    setDoc((d) => ({
                      sections: d.sections.map((s) =>
                        s.id === selected.id
                          ? { ...s, visible: e.target.checked }
                          : s
                      ),
                    }))
                  }
                />
                Sectie zichtbaar
              </label>
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
