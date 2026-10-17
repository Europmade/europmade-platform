"use client"

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { Button } from "@europmade/ui"
import { suggestCategoryCopy, type CategoryCopySuggestion } from "@europmade/utils"
import {
  emptyLocalized,
  fetchPublicCatalogProducts,
  fetchPublicCategoryAttributes,
  getCmsEditorialCategory,
  listCmsBanners,
  putCmsEditorialCategory,
  type CmsBannerDto,
  type LocalizedCms,
} from "../../lib/cms-admin-api"
import {
  emptyCategoryEditorial,
  parseCategoryEditorial,
  type CmsCategoryEditorial,
} from "../../lib/cms-category-editorial"
import type { CmsI18nMeta } from "../../lib/cms-i18n"
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

function FaqEditor(props: {
  doc: CmsCategoryEditorial
  setDoc: Dispatch<SetStateAction<CmsCategoryEditorial>>
  meta: CmsI18nMeta
  setMeta: Dispatch<SetStateAction<CmsI18nMeta>>
}) {
  const { doc, setDoc, meta, setMeta } = props
  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          setDoc((d) => ({
            ...d,
            faq: [
              ...d.faq,
              {
                id: `faq_${Date.now()}`,
                question: emptyLocalized(),
                answer: emptyLocalized(),
              },
            ],
          }))
        }
      >
        Vraag toevoegen
      </Button>
      {doc.faq.map((faq) => (
        <div key={faq.id} className="rounded-lg border border-wf-100 p-2">
          <CmsLocalizedField
            label="Vraag"
            field={`faq.${faq.id}.q`}
            value={faq.question}
            onChange={(question) =>
              setDoc((d) => ({
                ...d,
                faq: d.faq.map((f) =>
                  f.id === faq.id ? { ...f, question } : f
                ),
              }))
            }
            meta={meta}
            onMetaChange={setMeta}
          />
          <CmsLocalizedField
            label="Antwoord"
            field={`faq.${faq.id}.a`}
            value={faq.answer}
            onChange={(answer) =>
              setDoc((d) => ({
                ...d,
                faq: d.faq.map((f) =>
                  f.id === faq.id ? { ...f, answer } : f
                ),
              }))
            }
            meta={meta}
            onMetaChange={setMeta}
            multiline
          />
          <button
            type="button"
            className="mt-1 text-[11px] text-red-700 underline"
            onClick={() =>
              setDoc((d) => ({
                ...d,
                faq: d.faq.filter((f) => f.id !== faq.id),
              }))
            }
          >
            Verwijderen
          </button>
        </div>
      ))}
      <p className="text-[11px] text-wf-500">
        Lege FAQ wordt niet op de storefront getoond.
      </p>
    </div>
  )
}

function Inner({ slug }: { slug: string }) {
  const { locale } = useCmsLocale()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [published, setPublished] = useState(false)
  const [viewport, setViewport] = useState<CmsViewport>("desktop")
  const [doc, setDoc] = useState<CmsCategoryEditorial>(emptyCategoryEditorial())
  const [meta, setMeta] = useState<CmsI18nMeta>({})
  const [selectedId, setSelectedId] = useState("hero")
  const [banners, setBanners] = useState<CmsBannerDto[]>([])
  const [proposal, setProposal] = useState<CategoryCopySuggestion | null>(null)
  const [proposalError, setProposalError] = useState<string | null>(null)

  useEffect(() => {
    getCmsEditorialCategory(slug)
      .then(({ category }) => {
        setDoc(parseCategoryEditorial(category.document))
        setPublished(category.published)
        setMeta((category.i18n_meta as CmsI18nMeta) ?? {})
      })
      .catch((e: Error) => setError(e.message))
    listCmsBanners()
      .then((r) => setBanners(r.banners ?? []))
      .catch(() => setBanners([]))
  }, [slug])

  async function generateProposal() {
    setProposalError(null)
    try {
      const [catalog, attributes] = await Promise.all([
        fetchPublicCatalogProducts({ category: slug, limit: 40 }),
        fetchPublicCategoryAttributes(slug),
      ])
      const brands = catalog.products
        .map((product) =>
          typeof product.brand_name === "string" ? product.brand_name : ""
        )
        .filter(Boolean)
      const suggestion = suggestCategoryCopy({
        title: doc.title.nl || doc.title.en || slug,
        productCount: catalog.products.length,
        brands,
        attributes: attributes.map((attribute) => attribute.name),
      })
      if (suggestion.usps.length === 0 && suggestion.faq.length === 0) {
        setProposal(null)
        setProposalError("Er zijn geen betrouwbare categoriegegevens om een voorstel van te maken.")
        return
      }
      setProposal(suggestion)
    } catch (err) {
      setProposal(null)
      setProposalError(err instanceof Error ? err.message : "Voorstel genereren mislukt.")
    }
  }

  function applyText(current: LocalizedCms, value: string): LocalizedCms {
    return { ...current, [locale]: value }
  }

  const structure = useMemo(
    () => [
      { id: "chrome_header", label: "Header", hint: "Centraal beheerd", locked: true },
      { id: "hero", label: "Hero / titel", locked: true },
      { id: "intro", label: "Intro", locked: true },
      { id: "banner", label: "Banner", locked: true },
      { id: "products", label: "Producten (Product Cloud)", locked: true },
      { id: "filters", label: "Filters", hint: "Tonen, naam en volgorde", locked: true },
      { id: "usps", label: "USP's", locked: true },
      { id: "faq", label: "FAQ", locked: true },
      { id: "chrome_footer", label: "Footer", hint: "Centraal beheerd", locked: true },
      { id: "seo", label: "SEO", locked: true },
    ],
    []
  )

  async function save(nextPublished: boolean) {
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      await putCmsEditorialCategory(slug, {
        document: doc,
        published: nextPublished,
        i18n_meta: meta,
      })
      setPublished(nextPublished)
      setOk(
        nextPublished
          ? "Categoriecontent gepubliceerd."
          : "Concept opgeslagen."
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opslaan mislukt")
    } finally {
      setBusy(false)
    }
  }

  const title = doc.title[locale] || doc.title.nl || slug

  function settingsPanel() {
    if (selectedId === "chrome_header" || selectedId === "chrome_footer") {
      return (
        <p className="text-sm text-wf-600">
          Dit onderdeel is sitebreed beheerd — niet per categorie.
        </p>
      )
    }
    if (selectedId === "seo") {
      return (
        <CmsSeoFields
          title={doc.seoTitle}
          description={doc.seoDescription}
          canonical={`/categorie/${slug}`}
          onTitle={(seoTitle) => setDoc((d) => ({ ...d, seoTitle }))}
          onDescription={(seoDescription) =>
            setDoc((d) => ({ ...d, seoDescription }))
          }
          onCanonical={() => undefined}
          meta={meta}
          onMeta={setMeta}
        />
      )
    }
    if (selectedId === "hero") {
      return (
        <div className="space-y-4">
          <CmsLocalizedField
            label="H1 / titel"
            field="title"
            value={doc.title}
            onChange={(next) => setDoc((d) => ({ ...d, title: next }))}
            meta={meta}
            onMetaChange={setMeta}
          />
          <CmsLocalizedField
            label="Subtitel"
            field="subtitle"
            value={doc.subtitle}
            onChange={(subtitle) => setDoc((d) => ({ ...d, subtitle }))}
            meta={meta}
            onMetaChange={setMeta}
          />
          <CmsImageField
            label="Categorie-afbeelding / hero"
            url={doc.heroImage}
            large
            placement="homepage_hero"
            onChange={(heroImage) => setDoc((d) => ({ ...d, heroImage }))}
            onError={setError}
          />
          <label className="flex items-center gap-2 text-sm text-wf-800">
            <input
              type="checkbox"
              checked={doc.heroVisible}
              onChange={(e) =>
                setDoc((d) => ({ ...d, heroVisible: e.target.checked }))
              }
            />
            Hero zichtbaar
          </label>
        </div>
      )
    }
    if (selectedId === "intro") {
      return (
        <div className="space-y-4">
          <CmsLocalizedField
            label="Intro"
            field="intro"
            value={doc.intro}
            onChange={(intro) => setDoc((d) => ({ ...d, intro }))}
            meta={meta}
            onMetaChange={setMeta}
            multiline
          />
          <CmsLocalizedField
            label="Beschrijving"
            field="description"
            value={doc.description}
            onChange={(description) => setDoc((d) => ({ ...d, description }))}
            meta={meta}
            onMetaChange={setMeta}
            multiline
          />
          <CmsLocalizedField
            label="Made in Europe / USP-tekst"
            field="madeInEurope"
            value={doc.madeInEurope}
            onChange={(madeInEurope) =>
              setDoc((d) => ({ ...d, madeInEurope }))
            }
            meta={meta}
            onMetaChange={setMeta}
            multiline
          />
        </div>
      )
    }
    if (selectedId === "banner") {
      const selectedBannerId = doc.bannerId || doc.banner?.id || ""
      return (
        <div className="space-y-4">
          <label className="block text-sm font-semibold">
            Banner uit bibliotheek
            <select
              className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs"
              value={selectedBannerId}
              onChange={(e) => {
                const id = e.target.value
                const banner = banners.find((b) => b.id === id)
                setDoc((d) => ({
                  ...d,
                  bannerId: id || null,
                  banner: banner
                    ? {
                        id: banner.id,
                        title: banner.title,
                        subtitle: banner.subtitle,
                        cta_label: banner.cta_label,
                        image_url: banner.image_url,
                        destination_url: banner.destination_url,
                        background: banner.background,
                        presentation: banner.presentation ?? null,
                        published: banner.published,
                      }
                    : null,
                }))
              }}
            >
              <option value="">— Geen banner —</option>
              {banners.map((b) => (
                <option key={b.id} value={b.id}>
                  {(b.title.nl || b.id).slice(0, 40)} ·{" "}
                  {b.published ? "Live" : "Concept"} · pos {b.position}
                </option>
              ))}
            </select>
          </label>
          {doc.banner?.image_url ? (
            <div className="relative aspect-[4/1] w-full overflow-hidden rounded-2xl border border-wf-200 bg-wf-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.banner.image_url}
                alt=""
                className="absolute inset-0 h-full w-full"
                style={{
                  objectFit: doc.banner.presentation?.fit === "contain" ? "contain" : "cover",
                  objectPosition: `${doc.banner.presentation?.positionX ?? 50}% ${doc.banner.presentation?.positionY ?? 50}%`,
                }}
              />
            </div>
          ) : null}
          {doc.banner ? (
            <div className="rounded-lg border border-wf-200 bg-wf-50 p-3 text-[12px] text-wf-700">
              <p className="font-semibold">{doc.banner.title.nl || doc.banner.id}</p>
              <p className="mt-1 break-all">{doc.banner.destination_url}</p>
              <p className="mt-1">
                {doc.banner.published ? "Gepubliceerd" : "Concept"}
              </p>
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-wf-800">
            <input
              type="checkbox"
              checked={doc.bannerVisible}
              onChange={(e) =>
                setDoc((d) => ({ ...d, bannerVisible: e.target.checked }))
              }
            />
            Banner zichtbaar
          </label>
          <a
            href="/cms/banners"
            className="inline-block text-sm font-semibold text-sky-700 hover:underline"
          >
            Bannerbibliotheek openen
          </a>
        </div>
      )
    }
    if (selectedId === "products") {
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-wf-200 bg-wf-50 p-3 text-[12px] text-wf-700">
            Producten komen dynamisch uit Product Cloud. CMS bepaalt presentatie,
            niet prijzen of voorraad.
          </div>
          <CmsLocalizedField
            label="Sectietitel (optioneel)"
            field="productsTitle"
            value={doc.productsTitle}
            onChange={(productsTitle) =>
              setDoc((d) => ({ ...d, productsTitle }))
            }
            meta={meta}
            onMetaChange={setMeta}
          />
          <label className="block text-sm font-semibold">
            Sortering
            <select
              className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs"
              value={doc.productsSort}
              onChange={(e) =>
                setDoc((d) => ({
                  ...d,
                  productsSort: e.target.value as CmsCategoryEditorial["productsSort"],
                }))
              }
            >
              <option value="relevance">Relevantie</option>
              <option value="newest">Nieuwste</option>
              <option value="price_asc">Prijs oplopend</option>
              <option value="price_desc">Prijs aflopend</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Aantal tonen
            <input
              className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
              type="number"
              min={4}
              max={96}
              value={String(doc.productsLimit)}
              onChange={(e) =>
                setDoc((d) => ({
                  ...d,
                  productsLimit: Number(e.target.value) || 24,
                }))
              }
            />
          </label>
          <p className="text-[11px] text-wf-500">
            Limiet en sortering worden toegepast op de storefront-productlijst.
            Productdata blijft uit Product Cloud komen.
          </p>
        </div>
      )
    }
    if (selectedId === "filters") {
      return (
        <div className="space-y-3">
          <p className="text-[12px] text-wf-600">
            Alleen filters die bij echte productattributen horen worden getoond.
            Verborgen filters en filters zonder producten verdwijnen.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void fetchPublicCategoryAttributes(slug).then((attributes) => {
                setDoc((current) => {
                  const known = new Set(current.filterControls.map((row) => row.attributeKey))
                  const extra = [
                    { code: "brand", name: "Merk" },
                    ...attributes,
                  ].filter((attribute) => attribute.code && !known.has(attribute.code))
                  return {
                    ...current,
                    filterControls: [
                      ...current.filterControls,
                      ...extra.map((attribute, index) => ({
                        attributeKey: attribute.code,
                        visible: true,
                        label: {
                          ...emptyLocalized(),
                          nl: attribute.name,
                        },
                        sortOrder: current.filterControls.length + index,
                      })),
                    ],
                  }
                })
              })
            }}
          >
            Filters uit productgegevens laden
          </Button>
          {doc.filterControls.map((control, index) => (
            <div key={control.attributeKey} className="rounded-lg border border-wf-100 p-2">
              <p className="text-[11px] text-wf-500">{control.attributeKey}</p>
              <label className="mt-1 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={control.visible}
                  onChange={(e) =>
                    setDoc((d) => ({
                      ...d,
                      filterControls: d.filterControls.map((row) =>
                        row.attributeKey === control.attributeKey
                          ? { ...row, visible: e.target.checked }
                          : row
                      ),
                    }))
                  }
                />
                Tonen
              </label>
              <CmsLocalizedField
                label="Naam"
                field={`filter.${control.attributeKey}`}
                value={control.label}
                onChange={(label) =>
                  setDoc((d) => ({
                    ...d,
                    filterControls: d.filterControls.map((row) =>
                      row.attributeKey === control.attributeKey ? { ...row, label } : row
                    ),
                  }))
                }
                meta={meta}
                onMetaChange={setMeta}
              />
              <div className="mt-1 flex gap-2 text-[11px]">
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    setDoc((d) => {
                      const rows = [...d.filterControls]
                      if (index === 0) return d
                      const previous = rows[index - 1]
                      const current = rows[index]
                      if (!previous || !current) return d
                      rows[index - 1] = { ...current, sortOrder: index - 1 }
                      rows[index] = { ...previous, sortOrder: index }
                      return { ...d, filterControls: rows }
                    })
                  }
                >
                  Omhoog
                </button>
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    setDoc((d) => {
                      const rows = [...d.filterControls]
                      if (index >= rows.length - 1) return d
                      const next = rows[index + 1]
                      const current = rows[index]
                      if (!next || !current) return d
                      rows[index + 1] = { ...current, sortOrder: index + 1 }
                      rows[index] = { ...next, sortOrder: index }
                      return { ...d, filterControls: rows }
                    })
                  }
                >
                  Omlaag
                </button>
              </div>
            </div>
          ))}
        </div>
      )
    }
    if (selectedId === "usps") {
      return (
        <div className="space-y-3">
          <p className="text-[12px] text-wf-600">
            Een voorstel gebruikt alleen productaantallen, merknamen en filterbare
            eigenschappen van deze categorie. Overnemen voegt een nieuw item toe
            en overschrijft bestaande tekst niet.
          </p>
          <Button type="button" variant="secondary" onClick={() => void generateProposal()}>
            Genereer nieuw voorstel
          </Button>
          {proposalError ? <p className="text-[12px] text-amber-800">{proposalError}</p> : null}
          {proposal?.usps.map((item, index) => (
            <div key={`usp-proposal-${index}`} className="rounded-lg border border-dashed border-wf-300 p-2">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-[12px] text-wf-700">{item.body}</p>
              <button
                type="button"
                className="mt-1 text-[12px] font-semibold underline"
                onClick={() =>
                  setDoc((d) => ({
                    ...d,
                    usps: [
                      ...d.usps,
                      {
                        id: `usp_${Date.now()}_${index}`,
                        title: applyText(emptyLocalized(), item.title),
                        body: applyText(emptyLocalized(), item.body),
                      },
                    ],
                  }))
                }
              >
                Overnemen
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setDoc((d) => ({
                ...d,
                usps: [
                  ...d.usps,
                  {
                    id: `usp_${Date.now()}`,
                    title: emptyLocalized(),
                    body: emptyLocalized(),
                  },
                ],
              }))
            }
          >
            USP toevoegen
          </Button>
          {doc.usps.map((usp) => (
            <div key={usp.id} className="rounded-lg border border-wf-100 p-2">
              <CmsLocalizedField
                label="Titel"
                field={`usp.${usp.id}.title`}
                value={usp.title}
                onChange={(nextTitle) =>
                  setDoc((d) => ({
                    ...d,
                    usps: d.usps.map((u) =>
                      u.id === usp.id ? { ...u, title: nextTitle } : u
                    ),
                  }))
                }
                meta={meta}
                onMetaChange={setMeta}
              />
              <CmsLocalizedField
                label="Tekst"
                field={`usp.${usp.id}.body`}
                value={usp.body}
                onChange={(body) =>
                  setDoc((d) => ({
                    ...d,
                    usps: d.usps.map((u) =>
                      u.id === usp.id ? { ...u, body } : u
                    ),
                  }))
                }
                meta={meta}
                onMetaChange={setMeta}
                multiline
              />
              <button
                type="button"
                className="mt-1 text-[11px] text-red-700 underline"
                onClick={() =>
                  setDoc((d) => ({
                    ...d,
                    usps: d.usps.filter((u) => u.id !== usp.id),
                  }))
                }
              >
                Verwijderen
              </button>
            </div>
          ))}
        </div>
      )
    }
    if (selectedId === "faq") {
      return (
        <div className="space-y-3">
          <p className="text-[12px] text-wf-600">
            Een voorstel gebruikt alleen productaantallen, merknamen en filterbare
            eigenschappen van deze categorie. Overnemen voegt een nieuwe vraag toe
            en overschrijft bestaande tekst niet.
          </p>
          <Button type="button" variant="secondary" onClick={() => void generateProposal()}>
            Genereer nieuw voorstel
          </Button>
          {proposalError ? <p className="text-[12px] text-amber-800">{proposalError}</p> : null}
          {proposal?.faq.map((item, index) => (
            <div key={`faq-proposal-${index}`} className="rounded-lg border border-dashed border-wf-300 p-2">
              <p className="text-sm font-semibold">{item.question}</p>
              <p className="text-[12px] text-wf-700">{item.answer}</p>
              <button
                type="button"
                className="mt-1 text-[12px] font-semibold underline"
                onClick={() =>
                  setDoc((d) => ({
                    ...d,
                    faq: [
                      ...d.faq,
                      {
                        id: `faq_${Date.now()}_${index}`,
                        question: applyText(emptyLocalized(), item.question),
                        answer: applyText(emptyLocalized(), item.answer),
                      },
                    ],
                  }))
                }
              >
                Overnemen
              </button>
            </div>
          ))}
          <FaqEditor doc={doc} setDoc={setDoc} meta={meta} setMeta={setMeta} />
        </div>
      )
    }
    return <p className="text-sm text-wf-500">Selecteer een sectie.</p>
  }

  return (
    <CmsEditorShell
      breadcrumb={
        <CmsBreadcrumb
          items={[
            { href: "/cms", label: "CMS" },
            { href: "/cms/categories", label: "Categorieën" },
            { label: slug },
          ]}
        />
      }
      title={title}
      templateLabel="Categoriepagina"
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
      childrenPreview={
        <CmsLivePreview
          kind="category"
          path={`/cms-preview/category/${encodeURIComponent(slug)}`}
          viewport={viewport}
          locale={locale}
          selectedId={selectedId}
          document={doc}
          slug={slug}
          banners={banners}
          theme={null}
          onSelect={setSelectedId}
        />
      }
      childrenSettings={settingsPanel()}
    />
  )
}

export function CmsCategoryStudio({ slug }: { slug: string }) {
  return (
    <CmsLocaleProvider>
      <Inner slug={slug} />
    </CmsLocaleProvider>
  )
}
