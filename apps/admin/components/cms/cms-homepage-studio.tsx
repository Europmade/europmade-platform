"use client"

import { useEffect, useMemo, useState } from "react"
import {
  emptyLocalized,
  getCmsHomepage,
  getCmsTheme,
  listCmsBanners,
  putCmsHomepage,
  putCmsTheme,
  type CmsBannerDto,
  type LocalizedCms,
} from "../../lib/cms-admin-api"
import {
  createSection,
  emptyHomepageDocument,
  HOMEPAGE_SECTION_KEYS,
  normalizeHomepageDocument,
  SECTION_LABELS,
  type HomepageCmsDoc,
  type HomepageSectionKey,
} from "../../lib/cms-homepage-document"
import type { CmsI18nMeta } from "../../lib/cms-i18n"
import { CmsSeoFields } from "./cms-seo-fields"
import {
  CmsBreadcrumb,
  CmsEditorShell,
  type CmsViewport,
} from "./cms-editor-shell"
import { CmsLivePreview } from "./cms-live-preview"
import { CmsLocaleProvider, useCmsLocale } from "./cms-locale-toolbar"
import {
  CmsHomepageHeroSettings,
  CmsHomepageSectionSettings,
} from "./cms-homepage-section-settings"
import { storefrontOrigin } from "../../lib/medusa-backend-url"
import {
  defaultCmsTheme,
  parseCmsTheme,
  type CmsThemeDocument,
} from "@europmade/utils"
import { CmsHomepageHeaderSettings } from "./cms-homepage-header-settings"

function Inner() {
  const { locale } = useCmsLocale()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [published, setPublished] = useState(false)
  const [viewport, setViewport] = useState<CmsViewport>("desktop")
  const [doc, setDoc] = useState<HomepageCmsDoc>(emptyHomepageDocument)
  const [seoTitle, setSeoTitle] = useState<LocalizedCms>(emptyLocalized())
  const [seoDescription, setSeoDescription] = useState<LocalizedCms>(emptyLocalized())
  const [seoCanonical, setSeoCanonical] = useState("/")
  const [ogTitle, setOgTitle] = useState<LocalizedCms>(emptyLocalized())
  const [ogDescription, setOgDescription] = useState<LocalizedCms>(emptyLocalized())
  const [meta, setMeta] = useState<CmsI18nMeta>({})
  const [selectedId, setSelectedId] = useState("hero")
  const [picker, setPicker] = useState(false)
  const [previewScale, setPreviewScale] = useState<"fit" | "100">("fit")
  const [banners, setBanners] = useState<CmsBannerDto[]>([])
  const [theme, setTheme] = useState<CmsThemeDocument>(defaultCmsTheme)
  const [themePublished, setThemePublished] = useState(false)

  useEffect(() => {
    getCmsHomepage()
      .then(({ homepage }) => {
        if (!homepage) return
        const next = normalizeHomepageDocument(homepage.document)
        setDoc(next)
        setMeta(next._i18n ?? {})
        setPublished(homepage.published)
        if (homepage.seo_title) setSeoTitle(homepage.seo_title)
        if (homepage.seo_description) setSeoDescription(homepage.seo_description)
        if (homepage.seo_canonical) setSeoCanonical(homepage.seo_canonical)
        if (homepage.og_title) setOgTitle(homepage.og_title)
        if (homepage.og_description) setOgDescription(homepage.og_description)
      })
      .catch((e: Error) => setError(e.message))
    listCmsBanners()
      .then((r) => setBanners(r.banners ?? []))
      .catch(() => setBanners([]))
    getCmsTheme()
      .then((r) => {
        if (r.theme) {
          setTheme(parseCmsTheme(r.theme.document))
          setThemePublished(Boolean(r.theme.published))
        }
      })
      .catch(() => setTheme(defaultCmsTheme()))
  }, [])

  const sorted = useMemo(
    () => [...doc.sections].sort((a, b) => a.sortOrder - b.sortOrder),
    [doc.sections]
  )

  const structure = useMemo(
    () => [
      { id: "chrome_header", label: "Header", hint: "Logo + achtergrond", locked: true },
      { id: "hero", label: "Hero", hint: "Kop + beeld + CTA", visible: doc.hero.visible, locked: true },
      ...sorted.map((s) => ({
        id: s.id,
        label: SECTION_LABELS[s.key] || s.key,
        hint: s.key === "banner" ? "Banner-slot" : s.key,
        visible: s.visible,
      })),
      { id: "chrome_footer", label: "Footer", hint: "Centraal beheerd", locked: true },
      { id: "theme", label: "Theme", hint: "Centraal beheerd", locked: true },
      { id: "seo", label: "SEO", hint: "Zoekmachines", locked: true },
    ],
    [doc.hero.visible, sorted]
  )

  function moveSection(id: string, dir: -1 | 1) {
    setDoc((prev) => {
      const list = [...prev.sections].sort((a, b) => a.sortOrder - b.sortOrder)
      const idx = list.findIndex((s) => s.id === id)
      const next = idx + dir
      if (idx < 0 || next < 0 || next >= list.length) return prev
      const tmp = list[idx]!
      list[idx] = list[next]!
      list[next] = tmp
      return { ...prev, sections: list.map((s, i) => ({ ...s, sortOrder: (i + 1) * 10 })) }
    })
  }

  async function save(nextPublished: boolean) {
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      await putCmsHomepage({
        document: { ...doc, _i18n: meta },
        seo_title: seoTitle,
        seo_description: seoDescription,
        seo_canonical: seoCanonical,
        og_title: ogTitle,
        og_description: ogDescription,
        published: nextPublished,
      })
      // Header chrome lives on the sitewide theme document.
      await putCmsTheme({
        document: theme,
        published: nextPublished ? true : themePublished,
      })
      if (nextPublished) setThemePublished(true)
      setPublished(nextPublished)
      setOk(nextPublished ? "Homepage gepubliceerd." : "Concept opgeslagen.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opslaan mislukt")
    } finally {
      setBusy(false)
    }
  }

  const selectedSection = sorted.find((s) => s.id === selectedId)

  return (
    <>
      <CmsEditorShell
        breadcrumb={<CmsBreadcrumb items={[{ href: "/cms", label: "CMS" }, { label: "Homepage" }]} />}
        title="Homepage"
        templateLabel="Homepage"
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
        onMove={moveSection}
        onToggleVisible={(id) => {
          if (id === "hero") {
            setDoc((d) => ({ ...d, hero: { ...d.hero, visible: !d.hero.visible } }))
            return
          }
          setDoc((d) => ({
            ...d,
            sections: d.sections.map((s) =>
              s.id === id ? { ...s, visible: !s.visible } : s
            ),
          }))
        }}
        onRemove={(id) => {
          if (id === "hero" || id === "seo") return
          setDoc((d) => ({ ...d, sections: d.sections.filter((s) => s.id !== id) }))
          setSelectedId("hero")
        }}
        onAddSection={() => setPicker(true)}
        previewScale={previewScale}
        onPreviewScale={setPreviewScale}
        onOpenPreview={() =>
          window.open(
            `${storefrontOrigin()}/cms-preview/homepage`,
            "_blank"
          )
        }
        childrenPreview={
          <CmsLivePreview
            kind="homepage"
            path="/cms-preview/homepage"
            viewport={viewport}
            locale={locale}
            selectedId={selectedId}
            document={doc}
            banners={banners}
            theme={theme}
            onSelect={setSelectedId}
            previewScale={previewScale}
          />
        }
        childrenSettings={
          selectedId === "chrome_header" ? (
            <CmsHomepageHeaderSettings
              theme={theme}
              onChange={setTheme}
              onError={setError}
            />
          ) : selectedId === "chrome_footer" ? (
            <div className="space-y-3 text-sm text-wf-700">
              <p className="font-semibold text-wf-900">Footer (sitebreed)</p>
              <p>
                Footerlinks en kolommen zijn sitebreed. CMS-pagina&apos;s
                (bijv. Over ons) beheer je onder CMS → Pagina&apos;s.
              </p>
              <a
                href="/cms/pages"
                className="inline-block font-semibold text-sky-700 hover:underline"
              >
                Open CMS-pagina&apos;s
              </a>
            </div>
          ) : selectedId === "theme" ? (
            <p className="text-sm text-wf-600">
              Kleuren en knopvormen beheer je onder CMS → Design.{" "}
              <a href="/cms/design" className="font-semibold text-sky-700 hover:underline">
                Open Design
              </a>
            </p>
          ) : selectedId === "seo" ? (
            <CmsSeoFields
              title={seoTitle}
              description={seoDescription}
              canonical={seoCanonical}
              ogTitle={ogTitle}
              ogDescription={ogDescription}
              onTitle={setSeoTitle}
              onDescription={setSeoDescription}
              onCanonical={setSeoCanonical}
              onOgTitle={setOgTitle}
              onOgDescription={setOgDescription}
              meta={meta}
              onMeta={setMeta}
            />
          ) : selectedId === "hero" ? (
            <CmsHomepageHeroSettings
              doc={doc}
              setDoc={setDoc}
              meta={meta}
              setMeta={setMeta}
              onError={setError}
            />
          ) : selectedSection ? (
            <CmsHomepageSectionSettings
              section={selectedSection}
              doc={doc}
              setDoc={setDoc}
              meta={meta}
              setMeta={setMeta}
              banners={banners}
              onError={setError}
            />
          ) : (
            <p className="text-sm text-wf-500">Selecteer een sectie.</p>
          )
        }
      />
      {picker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-4 shadow-xl">
            <p className="mb-3 font-bold text-wf-900">Sectie toevoegen</p>
            <ul className="grid gap-2">
              {HOMEPAGE_SECTION_KEYS.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-wf-200 px-3 py-2 text-left text-sm hover:border-wf-400"
                    onClick={() => {
                      const section = createSection(key as HomepageSectionKey)
                      setDoc((d) => ({
                        ...d,
                        sections: [...d.sections, section],
                      }))
                      setSelectedId(section.id)
                      setPicker(false)
                    }}
                  >
                    {SECTION_LABELS[key]}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-3 text-sm text-wf-500"
              onClick={() => setPicker(false)}
            >
              Annuleren
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export function CmsHomepageStudio() {
  return (
    <CmsLocaleProvider>
      <Inner />
    </CmsLocaleProvider>
  )
}
