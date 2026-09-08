"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@europmade/ui"
import {
  emptyLocalized,
  getCmsEditorialProduct,
  listCmsBanners,
  putCmsEditorialProduct,
  type CmsBannerDto,
} from "../../lib/cms-admin-api"
import {
  emptyProductEditorial,
  parseProductEditorial,
  type CmsProductEditorial,
} from "../../lib/cms-product-editorial"
import type { CmsI18nMeta } from "../../lib/cms-i18n"
import {
  getAdminProduct,
  type AdminProductDetail,
} from "../../lib/product-approval-admin-api"
import { CmsLocalizedField } from "./cms-localized-field"
import { CmsSeoFields } from "./cms-seo-fields"
import {
  CmsBreadcrumb,
  CmsEditorShell,
  type CmsViewport,
} from "./cms-editor-shell"
import { CmsLivePreview } from "./cms-live-preview"
import { CmsLocaleProvider, useCmsLocale } from "./cms-locale-toolbar"

function Inner({ productId }: { productId: string }) {
  const isTemplate = productId === "template"
  const { locale } = useCmsLocale()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [published, setPublished] = useState(false)
  const [viewport, setViewport] = useState<CmsViewport>("desktop")
  const [doc, setDoc] = useState<CmsProductEditorial>(emptyProductEditorial())
  const [meta, setMeta] = useState<CmsI18nMeta>({})
  const [selectedId, setSelectedId] = useState("gallery")
  const [pc, setPc] = useState<AdminProductDetail | null>(null)
  const [banners, setBanners] = useState<CmsBannerDto[]>([])

  useEffect(() => {
    if (!isTemplate) {
      getAdminProduct(productId)
        .then(setPc)
        .catch((e: Error) => setError(e.message))
    }
    getCmsEditorialProduct(productId)
      .then(({ product }) => {
        setDoc(parseProductEditorial(product.document))
        setPublished(product.published)
        setMeta((product.i18n_meta as CmsI18nMeta) ?? {})
      })
      .catch((e: Error) => setError(e.message))
    listCmsBanners()
      .then((r) => setBanners(r.banners ?? []))
      .catch(() => setBanners([]))
  }, [isTemplate, productId])

  const structure = useMemo(
    () => [
      { id: "chrome_header", label: "Header", hint: "Centraal beheerd", locked: true },
      { id: "gallery", label: "Product gallery", locked: true },
      { id: "buybox", label: "Productinformatie / Buy Box", locked: true },
      { id: "intro", label: "Introductie (CMS)", locked: true },
      { id: "usps", label: "USP's", locked: true },
      { id: "why", label: "Waarom dit product?", locked: true },
      { id: "usage", label: "Gebruik / toepassing", locked: true },
      { id: "description", label: "Omschrijving / tabs", locked: true },
      { id: "faq", label: "FAQ", locked: true },
      { id: "banner", label: "Banner", locked: true },
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
      await putCmsEditorialProduct(productId, {
        document: doc,
        published: nextPublished,
        i18n_meta: meta,
      })
      setPublished(nextPublished)
      setOk(
        nextPublished
          ? "Productpagina-content gepubliceerd."
          : "Concept opgeslagen."
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opslaan mislukt")
    } finally {
      setBusy(false)
    }
  }

  const p = pc?.product
  const title = isTemplate
    ? "Producttemplate"
    : String(p?.title ?? "Product")

  function settingsPanel() {
    if (selectedId === "chrome_header" || selectedId === "chrome_footer") {
      return (
        <p className="text-sm text-wf-600">
          Sitebreed beheerd — niet per producttemplate.
        </p>
      )
    }
    if (selectedId === "gallery") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-wf-600">
            Afbeeldingen komen uit Product Cloud. Onderstaande presentatie-
            instellingen worden opgeslagen op het template/document.
          </p>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-950">
            Storefront-PDP past layout/thumbnail-aantal nog niet toe — alleen
            zichtbaarheid van CMS-secties (intro/USP/FAQ) is al aangesloten.
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={doc.gallery.visible}
              onChange={(e) =>
                setDoc((d) => ({
                  ...d,
                  gallery: { ...d.gallery, visible: e.target.checked },
                }))
              }
            />
            Gallery zichtbaar (opgeslagen)
          </label>
          <label className="block text-sm font-semibold">
            Layout
            <select
              className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs"
              value={doc.gallery.layout}
              onChange={(e) =>
                setDoc((d) => ({
                  ...d,
                  gallery: {
                    ...d.gallery,
                    layout: e.target.value === "top" ? "top" : "left",
                  },
                }))
              }
            >
              <option value="left">Thumbnails links</option>
              <option value="top">Thumbnails boven</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Aantal thumbnails
            <input
              className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
              type="number"
              min={2}
              max={12}
              value={String(doc.gallery.thumbnailCount)}
              onChange={(e) =>
                setDoc((d) => ({
                  ...d,
                  gallery: {
                    ...d.gallery,
                    thumbnailCount: Number(e.target.value) || 5,
                  },
                }))
              }
            />
          </label>
        </div>
      )
    }
    if (selectedId === "buybox") {
      return (
        <div className="space-y-3">
          <p className="text-sm text-wf-600">
            Prijs, voorraad en aanbieders blijven Product Cloud / Commerce Cloud.
          </p>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-950">
            Deze toggles worden opgeslagen in het CMS-document. De live PDP
            toont Buy Box-elementen nog altijd volledig — geen schijn-hide op
            de storefront tot de PDP-chrome deze flags leest.
          </div>
          {(
            [
              ["showReviews", "Reviews tonen"],
              ["showPrice", "Prijs tonen"],
              ["showSellers", "Aanbieders tonen"],
              ["showStock", "Voorraad tonen"],
              ["showDelivery", "Levertijd tonen"],
              ["showBadges", "Badges tonen"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={doc.buybox[key]}
                onChange={(e) =>
                  setDoc((d) => ({
                    ...d,
                    buybox: { ...d.buybox, [key]: e.target.checked },
                  }))
                }
              />
              {label}
            </label>
          ))}
        </div>
      )
    }
    if (selectedId === "seo") {
      return (
        <CmsSeoFields
          title={doc.seoTitle}
          description={doc.seoDescription}
          canonical={`/product/${productId}`}
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
    if (selectedId === "intro") {
      return (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={doc.sections.introVisible}
              onChange={(e) =>
                setDoc((d) => ({
                  ...d,
                  sections: { ...d.sections, introVisible: e.target.checked },
                }))
              }
            />
            Sectie zichtbaar
          </label>
          <CmsLocalizedField
            label="Aanvullende introductie"
            field="intro"
            value={doc.intro}
            onChange={(intro) => setDoc((d) => ({ ...d, intro }))}
            meta={meta}
            onMetaChange={setMeta}
            multiline
          />
        </div>
      )
    }
    if (selectedId === "why") {
      return (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={doc.sections.whyVisible}
              onChange={(e) =>
                setDoc((d) => ({
                  ...d,
                  sections: { ...d.sections, whyVisible: e.target.checked },
                }))
              }
            />
            Sectie zichtbaar
          </label>
          <CmsLocalizedField
            label="Waarom dit product?"
            field="why"
            value={doc.why}
            onChange={(why) => setDoc((d) => ({ ...d, why }))}
            meta={meta}
            onMetaChange={setMeta}
            multiline
          />
        </div>
      )
    }
    if (selectedId === "usage") {
      return (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={doc.sections.usageVisible}
              onChange={(e) =>
                setDoc((d) => ({
                  ...d,
                  sections: { ...d.sections, usageVisible: e.target.checked },
                }))
              }
            />
            Sectie zichtbaar
          </label>
          <CmsLocalizedField
            label="Gebruik / toepassing"
            field="usage"
            value={doc.usage}
            onChange={(usage) => setDoc((d) => ({ ...d, usage }))}
            meta={meta}
            onMetaChange={setMeta}
            multiline
          />
        </div>
      )
    }
    if (selectedId === "description") {
      return (
        <div className="space-y-3">
          <p className="text-sm text-wf-600">
            Productomschrijving komt uit Product Cloud. CMS bepaalt of het
            tabblad/blok zichtbaar is.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={doc.sections.descriptionVisible}
              onChange={(e) =>
                setDoc((d) => ({
                  ...d,
                  sections: {
                    ...d.sections,
                    descriptionVisible: e.target.checked,
                  },
                }))
              }
            />
            Omschrijving / tabs zichtbaar
          </label>
        </div>
      )
    }
    if (selectedId === "usps") {
      return (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={doc.sections.uspsVisible}
              onChange={(e) =>
                setDoc((d) => ({
                  ...d,
                  sections: { ...d.sections, uspsVisible: e.target.checked },
                }))
              }
            />
            Sectie zichtbaar
          </label>
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
                field={`usp.${usp.id}.t`}
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
                field={`usp.${usp.id}.b`}
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={doc.sections.faqVisible}
              onChange={(e) =>
                setDoc((d) => ({
                  ...d,
                  sections: { ...d.sections, faqVisible: e.target.checked },
                }))
              }
            />
            FAQ zichtbaar
          </label>
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
        </div>
      )
    }
    if (selectedId === "banner") {
      return (
        <div className="space-y-4">
          <label className="block text-sm font-semibold">
            Banner uit bibliotheek
            <select
              className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs"
              value={doc.bannerId || ""}
              onChange={(e) =>
                setDoc((d) => ({ ...d, bannerId: e.target.value || null }))
              }
            >
              <option value="">— Geen banner —</option>
              {banners.map((b) => (
                <option key={b.id} value={b.id}>
                  {(b.title.nl || b.id).slice(0, 40)} ·{" "}
                  {b.published ? "Live" : "Concept"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
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
            Bannerbibliotheek
          </a>
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
            { href: "/cms/products", label: "Productpagina's" },
            { label: isTemplate ? "Producttemplate" : title },
          ]}
        />
      }
      title={title}
      templateLabel={isTemplate ? "Producttemplate" : "Productpagina"}
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
          kind="product"
          path="/cms-preview/product"
          viewport={viewport}
          locale={locale}
          selectedId={selectedId}
          document={doc}
          theme={null}
          onSelect={setSelectedId}
        />
      }
      childrenSettings={settingsPanel()}
    />
  )
}

export function CmsProductStudio({ productId }: { productId: string }) {
  return (
    <CmsLocaleProvider>
      <Inner productId={productId} />
    </CmsLocaleProvider>
  )
}
