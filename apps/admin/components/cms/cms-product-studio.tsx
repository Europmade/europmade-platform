"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CMS_PRODUCT_INTRO_MAX_CHARS,
  truncateAtWordBoundary,
} from "@europmade/utils"
import { Button } from "@europmade/ui"
import {
  getCmsEditorialProduct,
  listCmsBanners,
  putCmsEditorialProduct,
  type CmsBannerDto,
} from "../../lib/cms-admin-api"
import {
  emptyLocalized,
  emptyProductEditorial,
  buildProductEditorialOverride,
  mergeProductEditorialFromRaw,
  parseProductEditorial,
  serializeProductEditorialForSave,
  type CmsProductEditorial,
  type GalleryThumbnailPosition,
  type LocalizedCms,
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

function clampIntroLocalized(value: LocalizedCms): LocalizedCms {
  return {
    nl: truncateAtWordBoundary(value.nl, CMS_PRODUCT_INTRO_MAX_CHARS),
    en: truncateAtWordBoundary(value.en, CMS_PRODUCT_INTRO_MAX_CHARS),
    de: truncateAtWordBoundary(value.de, CMS_PRODUCT_INTRO_MAX_CHARS),
    fr: truncateAtWordBoundary(value.fr, CMS_PRODUCT_INTRO_MAX_CHARS),
  }
}

function Inner({ productId }: { productId: string }) {
  const isTemplate = productId === "template"
  const { locale } = useCmsLocale()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [published, setPublished] = useState(false)
  const [viewport, setViewport] = useState<CmsViewport>("desktop")
  const [doc, setDoc] = useState<CmsProductEditorial>(emptyProductEditorial())
  const [templateDoc, setTemplateDoc] = useState<CmsProductEditorial>(
    emptyProductEditorial()
  )
  const [meta, setMeta] = useState<CmsI18nMeta>({})
  const [selectedId, setSelectedId] = useState("gallery")
  const [pc, setPc] = useState<AdminProductDetail | null>(null)
  const [banners, setBanners] = useState<CmsBannerDto[]>([])

  useEffect(() => {
    let cancelled = false

    if (!isTemplate) {
      getAdminProduct(productId)
        .then((product) => {
          if (!cancelled) setPc(product)
        })
        .catch((e: Error) => {
          if (!cancelled) setError(e.message)
        })
    }

    async function loadEditorial() {
      try {
        if (isTemplate) {
          const { product } = await getCmsEditorialProduct("template")
          if (cancelled) return
          const parsed = parseProductEditorial(product.document)
          setDoc(parsed)
          setTemplateDoc(parsed)
          setPublished(product.published)
          setMeta((product.i18n_meta as CmsI18nMeta) ?? {})
          return
        }

        const [templateRes, productRes] = await Promise.all([
          getCmsEditorialProduct("template"),
          getCmsEditorialProduct(productId),
        ])
        if (cancelled) return
        const template = parseProductEditorial(templateRes.product.document)
        setTemplateDoc(template)
        setDoc(
          mergeProductEditorialFromRaw(template, productRes.product.document)
        )
        setPublished(productRes.product.published)
        setMeta((productRes.product.i18n_meta as CmsI18nMeta) ?? {})
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Laden mislukt")
        }
      }
    }

    void loadEditorial()
    listCmsBanners()
      .then((r) => {
        if (!cancelled) setBanners(r.banners ?? [])
      })
      .catch(() => {
        if (!cancelled) setBanners([])
      })

    return () => {
      cancelled = true
    }
  }, [isTemplate, productId])

  const structure = useMemo(
    () => [
      { id: "chrome_header", label: "Header", hint: "Centraal beheerd", locked: true },
      { id: "gallery", label: "Product gallery", locked: true },
      { id: "buybox", label: "Productinformatie / Buy Box", locked: true },
      {
        id: "trust",
        label: "Trust / USP-badges",
        hint: "EuropMade-platformcontent",
        locked: true,
      },
      { id: "intro", label: "Introductie (CMS)", locked: true },
      { id: "usps", label: "USP's", locked: true },
      { id: "why", label: "Waarom dit product?", locked: true },
      { id: "usage", label: "Gebruik / toepassing", locked: true },
      {
        id: "sellers",
        label: "Aanbieders",
        hint: "Commerce Cloud (optioneel zichtbaar)",
        locked: true,
      },
      { id: "description", label: "Omschrijving / tabs", locked: true },
      {
        id: "related",
        label: "Vergelijkbare producten",
        hint: "Alleen zichtbaarheid",
        locked: true,
      },
      {
        id: "frequently_bought",
        label: "Vaak samen gekocht",
        hint: "Alleen zichtbaarheid",
        locked: true,
      },
      { id: "faq", label: "FAQ", locked: true },
      { id: "banner", label: "Banner", locked: true },
      { id: "chrome_footer", label: "Footer", hint: "Centraal beheerd", locked: true },
      { id: "seo", label: "SEO", locked: true },
    ],
    []
  )

  const previewDocument = useMemo(() => {
    if (isTemplate) return serializeProductEditorialForSave(doc)
    return buildProductEditorialOverride(templateDoc, doc)
  }, [doc, isTemplate, templateDoc])

  async function save(nextPublished: boolean) {
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      const document = isTemplate
        ? serializeProductEditorialForSave(doc)
        : buildProductEditorialOverride(templateDoc, doc)
      await putCmsEditorialProduct(productId, {
        document,
        published: nextPublished,
        i18n_meta: meta,
      })
      if (isTemplate) {
        const full = serializeProductEditorialForSave(doc)
        setDoc(full)
        setTemplateDoc(full)
      } else {
        setDoc(mergeProductEditorialFromRaw(templateDoc, document))
      }
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

  const introCount = (doc.intro[locale] || "").length

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
            Gallery zichtbaar
          </label>
          <label className="block text-sm font-semibold">
            Thumbnailpositie
            <select
              className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs"
              value={doc.gallery.thumbnailPosition}
              onChange={(e) => {
                const thumbnailPosition: GalleryThumbnailPosition =
                  e.target.value === "under" ? "under" : "left"
                setDoc((d) => ({
                  ...d,
                  gallery: { ...d.gallery, thumbnailPosition },
                }))
              }}
            >
              <option value="left">Links</option>
              <option value="under">Onder</option>
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
    if (selectedId === "trust") {
      return (
        <div className="space-y-3">
          <p className="text-sm text-wf-600">
            EuropMade-platformbadges (geen seller-content). Bepaal alleen
            zichtbaarheid. Teksten lopen via i18n.
          </p>
          {(
            [
              ["showSafePayment", "Veilig betalen"],
              ["show30DayReturn", "30 dagen retour"],
              ["showMadeInEurope", "Geproduceerd in Europa"],
              ["showVerifiedInfo", "Geverifieerde productinformatie"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={doc.trust[key]}
                onChange={(e) =>
                  setDoc((d) => ({
                    ...d,
                    trust: { ...d.trust, [key]: e.target.checked },
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
          canonical={doc.seoCanonical ?? ""}
          onTitle={(seoTitle) => setDoc((d) => ({ ...d, seoTitle }))}
          onDescription={(seoDescription) =>
            setDoc((d) => ({ ...d, seoDescription }))
          }
          onCanonical={(seoCanonical) =>
            setDoc((d) => ({
              ...d,
              seoCanonical: seoCanonical.trim() ? seoCanonical.trim() : null,
            }))
          }
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
            onChange={(intro) =>
              setDoc((d) => ({ ...d, intro: clampIntroLocalized(intro) }))
            }
            meta={meta}
            onMetaChange={setMeta}
            multiline
          />
          <p className="text-[11px] text-wf-500">
            {introCount} / {CMS_PRODUCT_INTRO_MAX_CHARS} tekens ({locale.toUpperCase()},
            platte tekst)
          </p>
        </div>
      )
    }
    if (selectedId === "why") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-wf-600">
            Inhoud is seller-content (productniveau). EuropMade bepaalt alleen
            structuur en zichtbaarheid. Lege inhoud → sectie blijft leeg; geen
            platformtekst.
          </p>
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
            label="Waarom dit product? (interim CMS tot seller-backoffice)"
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
          <p className="text-sm text-wf-600">
            Inhoud is seller-content (productniveau). EuropMade bepaalt alleen
            structuur en zichtbaarheid. Lege inhoud → sectie blijft leeg.
          </p>
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
            label="Gebruik / toepassing (interim CMS tot seller-backoffice)"
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
    if (selectedId === "sellers") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-wf-600">
            Aanbieders komen uit Commerce Cloud / Buy Box. CMS bepaalt alleen
            of het blok op de productpagina zichtbaar is.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={doc.sections.sellersVisible}
              onChange={(e) =>
                setDoc((d) => ({
                  ...d,
                  sections: {
                    ...d.sections,
                    sellersVisible: e.target.checked,
                  },
                }))
              }
            />
            Aanbieders-sectie zichtbaar
          </label>
        </div>
      )
    }
    if (selectedId === "related") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-wf-600">
            Producten komen uit de catalogus. CMS bepaalt alleen zichtbaarheid.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={doc.sections.relatedVisible}
              onChange={(e) =>
                setDoc((d) => ({
                  ...d,
                  sections: {
                    ...d.sections,
                    relatedVisible: e.target.checked,
                  },
                }))
              }
            />
            Vergelijkbare producten zichtbaar
          </label>
        </div>
      )
    }
    if (selectedId === "frequently_bought") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-wf-600">
            Producten komen uit de catalogus. CMS bepaalt alleen zichtbaarheid.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={doc.sections.frequentlyBoughtVisible}
              onChange={(e) =>
                setDoc((d) => ({
                  ...d,
                  sections: {
                    ...d.sections,
                    frequentlyBoughtVisible: e.target.checked,
                  },
                }))
              }
            />
            Vaak samen gekocht zichtbaar
          </label>
        </div>
      )
    }
    if (selectedId === "description") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-wf-600">
            Productomschrijving komt uit Product Cloud. Vul hieronder optioneel
            CMS-HTML in als overlay; als gevuld, gebruikt de storefront deze
            tekst (gesanitized).
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
          <CmsLocalizedField
            label="CMS-omschrijving (HTML, optioneel)"
            field="descriptionHtml"
            value={doc.descriptionHtml}
            onChange={(descriptionHtml) =>
              setDoc((d) => ({ ...d, descriptionHtml }))
            }
            meta={meta}
            onMetaChange={setMeta}
            multiline
            rows={8}
          />
          <p className="text-[11px] text-wf-500">
            HTML toegestaan: p, headings, bold, italic, lists, links. Wordt op
            de storefront gesanitized. Product Cloud blijft leidend wanneer dit
            veld leeg is.
          </p>
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
          <p className="text-sm text-wf-600">
            FAQ-inhoud is seller-content. Later: algemene seller-FAQ +
            product-FAQ gecombineerd in één storefront-sectie. Dit CMS-veld is
            interim product-FAQ tot de seller-backoffice klaar is. Geen
            EuropMade-platformvragen als fallback.
          </p>
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
              value={doc.bannerId ?? ""}
              onChange={(e) => {
                const next = e.target.value
                setDoc((d) => ({
                  ...d,
                  bannerId: next ? next : null,
                }))
              }}
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
          document={previewDocument}
          templateDocument={
            isTemplate ? undefined : serializeProductEditorialForSave(templateDoc)
          }
          banners={banners}
          theme={null}
          slug={productId}
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
