"use client"

import {
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"
import {
  isHeroWhiteColor,
  brandCardStyleFromLegacy,
  parseBrandCardPresentation,
  parseCampaignCardStyle,
  rewriteCollectionHrefToAction,
  SECTION_TITLE_COLOR,
  type CampaignCardStyle,
} from "@europmade/utils"
import { Button } from "@europmade/ui"
import {
  emptyLocalized,
  fetchPublicCatalogBrands,
  type CmsBannerDto,
  type LocalizedCms,
} from "../../lib/cms-admin-api"
import type { CmsI18nMeta } from "../../lib/cms-i18n"
import {
  type HomepageCmsDoc,
  type HomepagePartnerDoc,
  type HomepageSectionDoc,
  type HomepageWhyItemDoc,
} from "../../lib/cms-homepage-document"
import { CmsCampaignCardFields } from "./cms-campaign-card-fields"
import { CmsHeroCtaStyleFields, CmsHeroTextStyleField } from "./cms-hero-style-fields"
import { CmsLocalizedField } from "./cms-localized-field"
import { CmsImageField } from "./cms-image-field"
import { CmsHomepageProductRailSettings } from "./cms-homepage-product-rail-settings"
import {
  listTaxonomyCategories,
  type AdminTaxonomyCategory,
} from "../../lib/category-admin-api"

const BRAND_BACKGROUNDS: Array<{
  key: HomepagePartnerDoc["backgroundKey"]
  label: string
  swatch: string
}> = [
  {
    key: "light",
    label: "Licht",
    swatch: "linear-gradient(155deg, #f8f9fb 0%, #eef1f5 48%, #e4e9ef 100%)",
  },
  {
    key: "dark",
    label: "Donker",
    swatch: "linear-gradient(155deg, #3d434b 0%, #2a2f35 45%, #1c2025 100%)",
  },
  {
    key: "green",
    label: "Groen",
    swatch: "linear-gradient(155deg, #e4efe7 0%, #c5d9cb 50%, #9fbfab 100%)",
  },
  {
    key: "beige",
    label: "Beige",
    swatch: "linear-gradient(155deg, #f7f1e6 0%, #eadfcb 48%, #dcc9a8 100%)",
  },
  {
    key: "earth",
    label: "Aarde / bruin",
    swatch: "linear-gradient(155deg, #ebe0d4 0%, #cbb59a 52%, #a8896c 100%)",
  },
]

type CampaignDoc = {
  id: string
  slug: string
  visible: boolean
  sortOrder: number
  title: LocalizedCms
  subtitle: LocalizedCms
  ctaLabel: LocalizedCms
  href: string
  image?: string | null
  imageAlt: LocalizedCms
  accentHue: number
  card: CampaignCardStyle
}

function asCampaigns(raw: unknown[]): CampaignDoc[] {
  return raw.map((item, i) => {
    const c = (item ?? {}) as Record<string, unknown>
    return {
      ...c,
      id: typeof c.id === "string" ? c.id : `camp_${i}`,
      slug: typeof c.slug === "string" ? c.slug : "",
      visible: c.visible !== false,
      sortOrder: Number(c.sortOrder ?? i * 10) || 0,
      title: locObj(c.title),
      subtitle: locObj(c.subtitle),
      ctaLabel: locObj(c.ctaLabel),
      href: typeof c.href === "string" ? c.href : "",
      image: typeof c.image === "string" ? c.image : null,
      imageAlt: locObj(c.imageAlt),
      accentHue: Number(c.accentHue ?? 200) || 200,
      card: parseCampaignCardStyle(c.card),
    } as CampaignDoc
  })
}

function locObj(value: unknown): LocalizedCms {
  if (!value || typeof value !== "object") return emptyLocalized()
  const v = value as Record<string, unknown>
  return {
    nl: typeof v.nl === "string" ? v.nl : "",
    en: typeof v.en === "string" ? v.en : "",
    de: typeof v.de === "string" ? v.de : "",
    fr: typeof v.fr === "string" ? v.fr : "",
  }
}

function campaignHrefForSlug(href: string, slug: string): string {
  const next = slug.trim().toLowerCase()
  if (!next) return href
  const rewritten = rewriteCollectionHrefToAction(href, next)
  if (rewritten !== href) return rewritten
  if (!href.trim() || href === "/zoeken" || href.startsWith("/acties/")) {
    return `/acties/${next}`
  }
  return href
}

type PartnerDoc = HomepagePartnerDoc

function asPartners(raw: HomepagePartnerDoc[] | unknown[]): PartnerDoc[] {
  return (raw as unknown[]).map((item, i) => {
    const p = (item ?? {}) as Record<string, unknown>
    const title =
      p.title && typeof p.title === "object"
        ? (p.title as LocalizedCms)
        : emptyLocalized()
    const subtitle =
      p.subtitle && typeof p.subtitle === "object"
        ? (p.subtitle as LocalizedCms)
        : emptyLocalized()
    const country =
      p.country && typeof p.country === "object"
        ? (p.country as LocalizedCms)
        : emptyLocalized()
    const bg = p.backgroundKey
    return {
      id: typeof p.id === "string" ? p.id : `partner_${i}`,
      slug: typeof p.slug === "string" ? p.slug : "",
      visible: p.visible !== false,
      sortOrder: Number(p.sortOrder ?? i * 10) || 0,
      title: {
        nl: title.nl || "",
        en: title.en || "",
        de: title.de || "",
        fr: title.fr || "",
      },
      subtitle: {
        nl: subtitle.nl || "",
        en: subtitle.en || "",
        de: subtitle.de || "",
        fr: subtitle.fr || "",
      },
      image: typeof p.image === "string" ? p.image : null,
      logo: typeof p.logo === "string" ? p.logo : null,
      backgroundKey:
        bg === "dark" ||
        bg === "green" ||
        bg === "beige" ||
        bg === "earth" ||
        bg === "light"
          ? bg
          : "light",
      country: {
        nl: country.nl || "",
        en: country.en || "",
        de: country.de || "",
        fr: country.fr || "",
      },
      rating: Number(p.rating ?? 0) || 0,
      productCount: Number(p.productCount ?? 0) || 0,
      ...parseBrandCardPresentation(p),
      card:
        p.card && typeof p.card === "object"
          ? parseCampaignCardStyle(p.card)
          : undefined,
      ctaLabel: locObj(p.ctaLabel),
      href: typeof p.href === "string" ? p.href : "",
    }
  })
}

function sectionTitlePicker(color: string | undefined): string {
  const value = color || SECTION_TITLE_COLOR
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
  }
  return SECTION_TITLE_COLOR
}

function SectionTitleStyle(props: {
  section: HomepageSectionDoc
  onPatch: (patch: Partial<HomepageSectionDoc>) => void
}) {
  const { section, onPatch } = props
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-wf-900">
        Titelkleur
        <div className="mt-1.5 flex items-center gap-2">
          <input
            type="color"
            className="h-9 w-12 cursor-pointer rounded border border-wf-300 bg-white p-0.5"
            value={sectionTitlePicker(section.titleColor)}
            onChange={(e) => onPatch({ titleColor: e.target.value })}
            aria-label="Titelkleur"
          />
          <input
            type="text"
            className="h-9 w-full rounded border border-wf-400 bg-white px-2 font-mono text-xs font-normal"
            value={section.titleColor || SECTION_TITLE_COLOR}
            onChange={(e) => {
              const color = e.target.value.trim()
              if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) return
              onPatch({ titleColor: color })
            }}
            spellCheck={false}
          />
        </div>
      </label>
      <label className="block text-sm font-semibold text-wf-900">
        Lettergrootte (px)
        <input
          type="number"
          min={12}
          max={40}
          className="mt-1.5 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm font-normal"
          value={section.titleSize ?? ""}
          placeholder="16 / 18"
          onChange={(e) => {
            const raw = e.target.value.trim()
            if (!raw) {
              onPatch({ titleSize: null })
              return
            }
            const size = Number(raw)
            if (!Number.isFinite(size)) return
            onPatch({
              titleSize: Math.min(40, Math.max(12, Math.round(size))),
            })
          }}
        />
        <span className="mt-1 block text-[11px] font-normal text-wf-500">
          Leeg laat de huidige grootte staan (16px, vanaf tablet 18px).
        </span>
      </label>
    </div>
  )
}

function SectionBasics(props: {
  section: HomepageSectionDoc
  meta: CmsI18nMeta
  onMeta: (m: CmsI18nMeta) => void
  onPatch: (patch: Partial<HomepageSectionDoc>) => void
  onError: (msg: string) => void
  showImage?: boolean
  showHref?: boolean
  showBody?: boolean
  /** Media placement for section image (default homepage_hero for editorial photos). */
  imagePlacement?: "homepage_hero" | "brand_story_photo" | "cms_banner"
  imageAdvice?: string
  imageHint?: string
  imageLabel?: string
  imagePreviewFit?: "cover" | "contain"
}) {
  const { section, meta, onMeta, onPatch, onError } = props
  return (
    <>
      <CmsLocalizedField
        label="Titel"
        field={`${section.id}.title`}
        value={section.title}
        onChange={(title) => onPatch({ title })}
        meta={meta}
        onMetaChange={onMeta}
      />
      <SectionTitleStyle section={section} onPatch={onPatch} />
      <CmsLocalizedField
        label="Subtitel / beschrijving"
        field={`${section.id}.subtitle`}
        value={section.subtitle}
        onChange={(subtitle) => onPatch({ subtitle })}
        meta={meta}
        onMetaChange={onMeta}
        multiline
      />
      {props.showBody ? (
        <CmsLocalizedField
          label="Tekst"
          field={`${section.id}.body`}
          value={section.body || emptyLocalized()}
          onChange={(body) => onPatch({ body })}
          meta={meta}
          onMetaChange={onMeta}
          multiline
        />
      ) : null}
      {props.showHref ? (
        <label className="block text-sm font-semibold">
          Link (URL)
          <input
            className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
            value={section.href || ""}
            onChange={(e) => onPatch({ href: e.target.value })}
            placeholder="/pad-of-https://…"
          />
        </label>
      ) : null}
      {props.showImage !== false ? (
        <CmsImageField
          label={props.imageLabel ?? "Afbeelding"}
          hint={props.imageHint ?? "Optioneel. Algemene sectie-afbeelding."}
          advice={props.imageAdvice}
          url={section.image ?? null}
          placement={props.imagePlacement ?? "homepage_hero"}
          previewFit={props.imagePreviewFit ?? "cover"}
          onChange={(image) => onPatch({ image })}
          onError={onError}
        />
      ) : null}
      <label className="flex items-center gap-2 text-sm text-wf-800">
        <input
          type="checkbox"
          checked={section.visible}
          onChange={(e) => onPatch({ visible: e.target.checked })}
        />
        Sectie zichtbaar
      </label>
    </>
  )
}

function ItemListActions(props: {
  onAdd: () => void
  addLabel: string
  children: ReactNode
}) {
  return (
    <div className="space-y-3">
      <Button type="button" variant="secondary" onClick={props.onAdd}>
        {props.addLabel}
      </Button>
      {props.children}
    </div>
  )
}

export function CmsHomepageHeroSettings(props: {
  doc: HomepageCmsDoc
  setDoc: Dispatch<SetStateAction<HomepageCmsDoc>>
  meta: CmsI18nMeta
  setMeta: Dispatch<SetStateAction<CmsI18nMeta>>
  onError: (msg: string) => void
}) {
  const { doc, setDoc, meta, setMeta, onError } = props
  const cta2HasLabel = Boolean(
    doc.hero.cta2.label.nl ||
      doc.hero.cta2.label.en ||
      doc.hero.cta2.label.de ||
      doc.hero.cta2.label.fr
  )

  return (
    <div className="space-y-4">
      <CmsImageField
        label="Linker banner — achtergrondafbeelding"
        url={doc.hero.backgroundImage ?? null}
        large
        advice="Aanbevolen 1800 × 630 px (2,85:1). De banner houdt deze verhouding; de hoogte schaalt met de breedte."
        previewRatio="2.85 / 1"
        hint="JPEG, PNG of WEBP."
        placement="homepage_hero"
        onChange={(backgroundImage) =>
          setDoc((d) => ({ ...d, hero: { ...d.hero, backgroundImage } }))
        }
        onError={onError}
      />
      <div className="grid gap-3 tablet:grid-cols-2">
        <CmsHeroTextStyleField
          label="Titelkleur"
          role="title"
          value={doc.hero.titleColor}
          onChange={(titleColor) =>
            setDoc((d) => ({
              ...d,
              hero: {
                ...d.hero,
                titleColor,
                textColor: isHeroWhiteColor(titleColor.color) ? "white" : "black",
              },
            }))
          }
        />
        <CmsHeroTextStyleField
          label="Subtitelkleur"
          role="subtitle"
          value={doc.hero.subtitleColor}
          onChange={(subtitleColor) =>
            setDoc((d) => ({ ...d, hero: { ...d.hero, subtitleColor } }))
          }
        />
        <label className="block text-sm font-semibold">
          Afbeelding passen
          <select
            className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
            value={doc.hero.imageFit === "contain" ? "contain" : "cover"}
            onChange={(e) =>
              setDoc((d) => ({
                ...d,
                hero: {
                  ...d.hero,
                  imageFit: e.target.value === "contain" ? "contain" : "cover",
                },
              }))
            }
          >
            <option value="cover">Cover — sfeerbeeld vult de banner</option>
            <option value="contain">Contain — afbeelding blijft volledig zichtbaar</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Afbeeldingspositie
          <input
            className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
            value={doc.hero.imagePosition || "50% 50%"}
            onChange={(e) =>
              setDoc((d) => ({
                ...d,
                hero: { ...d.hero, imagePosition: e.target.value },
              }))
            }
          />
        </label>
      </div>
      <CmsImageField
        label="Rechter productbanner"
        url={doc.hero.heroImage ?? null}
        large
        advice="Aanbevolen 1800 × 630 px (2,85:1). De banner houdt deze verhouding; de hoogte schaalt met de breedte."
        previewRatio="2.85 / 1"
        previewFit="contain"
        hint="Aanbevolen: breed beeld, JPEG/JPG, PNG of WEBP."
        placement="homepage_hero"
        onChange={(heroImage) =>
          setDoc((d) => ({ ...d, hero: { ...d.hero, heroImage } }))
        }
        onError={onError}
      />
      <CmsLocalizedField
        label="Afbeelding alt-tekst"
        field="hero.heroImageAlt"
        value={doc.hero.heroImageAlt}
        onChange={(heroImageAlt) =>
          setDoc((d) => ({ ...d, hero: { ...d.hero, heroImageAlt } }))
        }
        meta={meta}
        onMetaChange={setMeta}
      />
      <CmsLocalizedField
        label="Titel"
        field="hero.title"
        value={doc.hero.title}
        onChange={(title) => setDoc((d) => ({ ...d, hero: { ...d.hero, title } }))}
        meta={meta}
        onMetaChange={setMeta}
      />
      <CmsLocalizedField
        label="Subtitel"
        field="hero.subtitle"
        value={doc.hero.subtitle}
        onChange={(subtitle) =>
          setDoc((d) => ({ ...d, hero: { ...d.hero, subtitle } }))
        }
        meta={meta}
        onMetaChange={setMeta}
        multiline
      />
      <label className="block text-sm font-semibold">
        Achtergrond (CSS gradient of kleur)
        <input
          className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
          value={doc.hero.backgroundGradient}
          onChange={(e) =>
            setDoc((d) => ({
              ...d,
              hero: { ...d.hero, backgroundGradient: e.target.value },
            }))
          }
        />
      </label>
      <div className="space-y-2 rounded-lg border border-wf-200 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-wf-500">
          CTA 1
        </p>
        <CmsLocalizedField
          label="Tekst"
          field="hero.cta1"
          value={doc.hero.cta1.label}
          onChange={(label) =>
            setDoc((d) => ({
              ...d,
              hero: { ...d.hero, cta1: { ...d.hero.cta1, label } },
            }))
          }
          meta={meta}
          onMetaChange={setMeta}
        />
        <label className="block text-sm font-semibold">
          Link
          <input
            className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
            value={doc.hero.cta1.href}
            onChange={(e) =>
              setDoc((d) => ({
                ...d,
                hero: {
                  ...d.hero,
                  cta1: { ...d.hero.cta1, href: e.target.value },
                },
              }))
            }
          />
        </label>
        <CmsHeroCtaStyleFields
          value={doc.hero.cta1.style}
          onChange={(style) =>
            setDoc((d) => ({
              ...d,
              hero: { ...d.hero, cta1: { ...d.hero.cta1, style } },
            }))
          }
        />
      </div>
      <div className="space-y-2 rounded-lg border border-wf-200 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-wf-500">
          CTA 2
        </p>
        <label className="flex items-center gap-2 text-sm text-wf-800">
          <input
            type="checkbox"
            checked={cta2HasLabel || Boolean(doc.hero.cta2.href)}
            onChange={(e) => {
              if (!e.target.checked) {
                setDoc((d) => ({
                  ...d,
                  hero: {
                    ...d.hero,
                    cta2: { ...d.hero.cta2, label: emptyLocalized(), href: "" },
                  },
                }))
              } else if (!doc.hero.cta2.href) {
                setDoc((d) => ({
                  ...d,
                  hero: {
                    ...d.hero,
                    cta2: {
                      ...d.hero.cta2,
                      label: {
                        nl: "Word verkoper",
                        en: "Become a seller",
                        de: "Verkäufer werden",
                        fr: "Devenir vendeur",
                      },
                      href: "/waarom-verkopen",
                    },
                  },
                }))
              }
            }}
          />
          CTA 2 tonen
        </label>
        <CmsLocalizedField
          label="Tekst"
          field="hero.cta2"
          value={doc.hero.cta2.label}
          onChange={(label) =>
            setDoc((d) => ({
              ...d,
              hero: { ...d.hero, cta2: { ...d.hero.cta2, label } },
            }))
          }
          meta={meta}
          onMetaChange={setMeta}
        />
        <label className="block text-sm font-semibold">
          Link
          <input
            className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
            value={doc.hero.cta2.href}
            onChange={(e) =>
              setDoc((d) => ({
                ...d,
                hero: {
                  ...d.hero,
                  cta2: { ...d.hero.cta2, href: e.target.value },
                },
              }))
            }
          />
        </label>
        <CmsHeroCtaStyleFields
          value={doc.hero.cta2.style}
          onChange={(style) =>
            setDoc((d) => ({
              ...d,
              hero: { ...d.hero, cta2: { ...d.hero.cta2, style } },
            }))
          }
        />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-wf-500">
          USP / trust-bullets
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setDoc((d) => ({
              ...d,
              hero: {
                ...d.hero,
                trustBullets: [...d.hero.trustBullets, emptyLocalized()],
              },
            }))
          }
        >
          Bullet toevoegen
        </Button>
        {doc.hero.trustBullets.map((bullet, index) => (
          <div key={index} className="rounded-lg border border-wf-100 p-2">
            <CmsLocalizedField
              label={`Bullet ${index + 1}`}
              field={`hero.trust.${index}`}
              value={bullet}
              onChange={(next) =>
                setDoc((d) => ({
                  ...d,
                  hero: {
                    ...d.hero,
                    trustBullets: d.hero.trustBullets.map((b, i) =>
                      i === index ? next : b
                    ),
                  },
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
                  hero: {
                    ...d.hero,
                    trustBullets: d.hero.trustBullets.filter(
                      (_, i) => i !== index
                    ),
                  },
                }))
              }
            >
              Verwijderen
            </button>
          </div>
        ))}
      </div>
      <div className="space-y-2 rounded-lg border border-wf-200 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-wf-500">
          Rechter banner
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={doc.hero.productBanner?.visible !== false}
            onChange={(e) =>
              setDoc((d) => ({
                ...d,
                hero: {
                  ...d.hero,
                  productBanner: {
                    visible: e.target.checked,
                    title: d.hero.productBanner?.title ?? emptyLocalized(),
                    subtitle: d.hero.productBanner?.subtitle ?? emptyLocalized(),
                    ctaLabel: d.hero.productBanner?.ctaLabel ?? emptyLocalized(),
                    href: d.hero.productBanner?.href ?? "",
                    image: d.hero.productBanner?.image ?? null,
                    background: d.hero.productBanner?.background ?? "",
                    textColor: d.hero.productBanner?.textColor ?? "black",
                    buttonColor: d.hero.productBanner?.buttonColor ?? "black",
                    imageFit: d.hero.productBanner?.imageFit ?? "contain",
                    imagePosition: d.hero.productBanner?.imagePosition ?? "center",
                  },
                },
              }))
            }
          />
          Rechter banner zichtbaar
        </label>
        <p className="text-[12px] text-wf-600">
          Zonder titel blijft de huidige productcompositie of geüploade afbeelding staan.
        </p>
        <CmsLocalizedField
          label="Titel"
          field="hero.productBanner.title"
          value={doc.hero.productBanner?.title ?? emptyLocalized()}
          onChange={(title) =>
            setDoc((d) => ({
              ...d,
              hero: {
                ...d.hero,
                productBanner: {
                  visible: d.hero.productBanner?.visible !== false,
                  title,
                  subtitle: d.hero.productBanner?.subtitle ?? emptyLocalized(),
                  ctaLabel: d.hero.productBanner?.ctaLabel ?? emptyLocalized(),
                  href: d.hero.productBanner?.href ?? "",
                  image: d.hero.heroImage ?? null,
                  background: d.hero.productBanner?.background ?? "",
                  textColor: d.hero.productBanner?.textColor ?? "black",
                  buttonColor: d.hero.productBanner?.buttonColor ?? "black",
                  imageFit: d.hero.productBanner?.imageFit ?? "contain",
                  imagePosition: d.hero.productBanner?.imagePosition ?? "center",
                },
              },
            }))
          }
          meta={meta}
          onMetaChange={setMeta}
        />
        <CmsLocalizedField
          label="Tekst"
          field="hero.productBanner.subtitle"
          value={doc.hero.productBanner?.subtitle ?? emptyLocalized()}
          onChange={(subtitle) =>
            setDoc((d) => ({
              ...d,
              hero: {
                ...d.hero,
                productBanner: {
                  visible: d.hero.productBanner?.visible !== false,
                  title: d.hero.productBanner?.title ?? emptyLocalized(),
                  subtitle,
                  ctaLabel: d.hero.productBanner?.ctaLabel ?? emptyLocalized(),
                  href: d.hero.productBanner?.href ?? "",
                  image: d.hero.heroImage ?? null,
                  background: d.hero.productBanner?.background ?? "",
                  textColor: d.hero.productBanner?.textColor ?? "black",
                  buttonColor: d.hero.productBanner?.buttonColor ?? "black",
                  imageFit: d.hero.productBanner?.imageFit ?? "contain",
                  imagePosition: d.hero.productBanner?.imagePosition ?? "center",
                },
              },
            }))
          }
          meta={meta}
          onMetaChange={setMeta}
          multiline
        />
        <label className="block text-sm font-semibold">
          Weergave productafbeelding
          <select
            className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
            value={doc.hero.productBanner?.imageFit === "cover" ? "cover" : "contain"}
            onChange={(e) =>
              setDoc((d) => ({
                ...d,
                hero: {
                  ...d.hero,
                  productBanner: {
                    visible: d.hero.productBanner?.visible !== false,
                    title: d.hero.productBanner?.title ?? emptyLocalized(),
                    subtitle: d.hero.productBanner?.subtitle ?? emptyLocalized(),
                    ctaLabel: d.hero.productBanner?.ctaLabel ?? emptyLocalized(),
                    href: d.hero.productBanner?.href ?? "",
                    image: d.hero.heroImage ?? null,
                    background: d.hero.productBanner?.background ?? "",
                    textColor: d.hero.productBanner?.textColor ?? "black",
                    buttonColor: d.hero.productBanner?.buttonColor ?? "black",
                    imageFit: e.target.value === "cover" ? "cover" : "contain",
                    imagePosition: d.hero.productBanner?.imagePosition ?? "center",
                  },
                },
              }))
            }
          >
            <option value="contain">Contain — product blijft volledig zichtbaar</option>
            <option value="cover">Cover — sfeerbeeld vult de banner</option>
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-wf-800">
        <input
          type="checkbox"
          checked={doc.hero.visible}
          onChange={(e) =>
            setDoc((d) => ({
              ...d,
              hero: { ...d.hero, visible: e.target.checked },
            }))
          }
        />
        Hero zichtbaar
      </label>
    </div>
  )
}

export function CmsHomepageSectionSettings(props: {
  section: HomepageSectionDoc
  doc: HomepageCmsDoc
  setDoc: Dispatch<SetStateAction<HomepageCmsDoc>>
  meta: CmsI18nMeta
  setMeta: Dispatch<SetStateAction<CmsI18nMeta>>
  banners: CmsBannerDto[]
  onError: (msg: string) => void
}) {
  const { section, doc, setDoc, meta, setMeta, banners, onError } = props
  const [pcCategories, setPcCategories] = useState<AdminTaxonomyCategory[]>([])
  const [catalogBrands, setCatalogBrands] = useState<
    Array<{ id: string; name: string; slug: string }>
  >([])

  useEffect(() => {
    listTaxonomyCategories()
      .then((r) =>
        setPcCategories(
          (r.categories ?? []).filter((c) => Boolean(c.slug))
        )
      )
      .catch(() => setPcCategories([]))
    if (section.key === "partners") {
      fetchPublicCatalogBrands()
        .then(setCatalogBrands)
        .catch(() => setCatalogBrands([]))
    }
  }, [section.key])

  function patchSection(patch: Partial<HomepageSectionDoc>) {
    setDoc((d) => ({
      ...d,
      sections: d.sections.map((s) =>
        s.id === section.id ? { ...s, ...patch } : s
      ),
    }))
  }

  const partners = asPartners(
    Array.isArray(doc.partnerSpotlight) ? doc.partnerSpotlight : []
  )
  const campaigns = asCampaigns(
    Array.isArray(doc.campaigns) ? doc.campaigns : []
  )

  const basics = (
    <SectionBasics
      section={section}
      meta={meta}
      onMeta={setMeta}
      onPatch={patchSection}
      onError={onError}
      showImage={
        section.key !== "categories" &&
        section.key !== "featured" &&
        section.key !== "newest" &&
        section.key !== "best_sellers" &&
        section.key !== "faq" &&
        section.key !== "newsletter"
      }
      imagePlacement="homepage_hero"
      showHref={section.key === "seller_cta" || section.key === "editorial"}
      showBody={section.key === "intro" || section.key === "editorial"}
    />
  )

  if (section.key === "categories") {
    return (
      <div className="space-y-4">
        {basics}
        <ItemListActions
          addLabel="Categorie toevoegen"
          onAdd={() => {
            const pick = pcCategories[0]
            if (!pick?.slug) return
            setDoc((d) => ({
              ...d,
              categories: [
                ...d.categories,
                {
                  id: `cat_${Date.now()}`,
                  slug: pick.slug!,
                  categoryId: pick.id,
                  visible: true,
                  sortOrder: (d.categories.length + 1) * 10,
                  title: {
                    nl: pick.name,
                    en: pick.name,
                    de: pick.name,
                    fr: pick.name,
                  },
                  subtitle: emptyLocalized(),
                  image: null,
                },
              ],
            }))
          }}
        >
          {doc.categories
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((cat, index, list) => (
              <div
                key={cat.id}
                className="space-y-2 rounded-lg border border-wf-200 p-2"
              >
                <label className="block text-sm font-semibold">
                  Product Cloud-categorie
                  <select
                    className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs"
                    value={cat.categoryId || cat.slug}
                    onChange={(e) => {
                      const value = e.target.value
                      const known =
                        pcCategories.find((c) => c.id === value) ||
                        pcCategories.find((c) => c.slug === value)
                      if (!known?.slug) return
                      setDoc((d) => ({
                        ...d,
                        categories: d.categories.map((c) =>
                          c.id === cat.id
                            ? {
                                ...c,
                                slug: known.slug!,
                                categoryId: known.id,
                                title: {
                                  nl: known.name,
                                  en: known.name,
                                  de: known.name,
                                  fr: known.name,
                                },
                              }
                            : c
                        ),
                      }))
                    }}
                  >
                    {pcCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.slug})
                      </option>
                    ))}
                    {cat.slug &&
                    !pcCategories.some(
                      (c) => c.slug === cat.slug || c.id === cat.categoryId
                    ) ? (
                      <option value={cat.slug}>{cat.slug} (niet in taxonomie)</option>
                    ) : null}
                  </select>
                </label>
                <CmsLocalizedField
                  label="Titel"
                  field={`cat.${cat.id}.title`}
                  value={cat.title}
                  onChange={(title) =>
                    setDoc((d) => ({
                      ...d,
                      categories: d.categories.map((c) =>
                        c.id === cat.id ? { ...c, title } : c
                      ),
                    }))
                  }
                  meta={meta}
                  onMetaChange={setMeta}
                />
                <CmsImageField
                  label="Afbeelding"
                  advice="Aanbevolen 800 × 460 px (1,75:1). De kaart toont de afbeelding in deze verhouding."
                  hint="Sfeer- of productbeeld. De afbeelding vult de kaart (cover)."
                  url={cat.image ?? null}
                  placement="brand_story_photo"
                  previewFit="cover"
                  previewRatio="1.75 / 1"
                  onChange={(image) =>
                    setDoc((d) => ({
                      ...d,
                      categories: d.categories.map((c) =>
                        c.id === cat.id ? { ...c, image } : c
                      ),
                    }))
                  }
                  onError={onError}
                />
                <p className="text-[11px] text-wf-500">
                  Storefront-link: /categorie/{cat.slug || "…"}
                </p>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <button
                    type="button"
                    className="underline"
                    disabled={index === 0}
                    onClick={() =>
                      setDoc((d) => {
                        const list = [...d.categories].sort(
                          (a, b) => a.sortOrder - b.sortOrder
                        )
                        if (index <= 0) return d
                        const tmp = list[index - 1]!
                        list[index - 1] = list[index]!
                        list[index] = tmp
                        return {
                          ...d,
                          categories: list.map((c, i) => ({
                            ...c,
                            sortOrder: (i + 1) * 10,
                          })),
                        }
                      })
                    }
                  >
                    Omhoog
                  </button>
                  <button
                    type="button"
                    className="underline"
                    disabled={index >= list.length - 1}
                    onClick={() =>
                      setDoc((d) => {
                        const list = [...d.categories].sort(
                          (a, b) => a.sortOrder - b.sortOrder
                        )
                        if (index >= list.length - 1) return d
                        const tmp = list[index + 1]!
                        list[index + 1] = list[index]!
                        list[index] = tmp
                        return {
                          ...d,
                          categories: list.map((c, i) => ({
                            ...c,
                            sortOrder: (i + 1) * 10,
                          })),
                        }
                      })
                    }
                  >
                    Omlaag
                  </button>
                  <button
                    type="button"
                    className="text-red-700 underline"
                    onClick={() =>
                      setDoc((d) => ({
                        ...d,
                        categories: d.categories.filter((c) => c.id !== cat.id),
                      }))
                    }
                  >
                    Verwijderen
                  </button>
                </div>
              </div>
            ))}
        </ItemListActions>
        <p className="text-[11px] text-wf-500">
          Lege categorieënlijst: storefront toont populaire categorieën als
          fallback.
        </p>
      </div>
    )
  }

  if (
    section.key === "featured" ||
    section.key === "newest" ||
    section.key === "best_sellers"
  ) {
    return (
      <div className="space-y-4">
        {basics}
        <CmsHomepageProductRailSettings
          section={section}
          onPatch={patchSection}
          allowManualPick={section.key === "featured"}
        />
      </div>
    )
  }

  if (section.key === "campaigns") {
    return (
      <div className="space-y-4">
        {basics}
        <ItemListActions
          addLabel="Campagne toevoegen"
          onAdd={() =>
            setDoc((d) => ({
              ...d,
              campaigns: [
                ...campaigns,
                {
                  id: `camp_${Date.now()}`,
                  slug: `campagne-${campaigns.length + 1}`,
                  visible: true,
                  sortOrder: (campaigns.length + 1) * 10,
                  title: emptyLocalized(),
                  subtitle: emptyLocalized(),
                  ctaLabel: {
                    nl: "Shop nu",
                    en: "Shop now",
                    de: "Jetzt shoppen",
                    fr: "Acheter",
                  },
                  href: "/acties/campagne",
                  image: null,
                  imageAlt: emptyLocalized(),
                  accentHue: 200,
                  card: parseCampaignCardStyle(undefined),
                },
              ],
            }))
          }
        >
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="space-y-2 rounded-lg border border-wf-100 p-2"
            >
              <label className="block text-sm font-semibold">
                Slug
                <input
                  className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
                  value={camp.slug}
                  onChange={(e) =>
                    setDoc((d) => ({
                      ...d,
                      campaigns: campaigns.map((c) =>
                        c.id === camp.id
                          ? {
                              ...c,
                              slug: e.target.value,
                              href: campaignHrefForSlug(c.href, e.target.value),
                            }
                          : c
                      ),
                    }))
                  }
                />
              </label>
              <CmsLocalizedField
                label="Titel"
                field={`camp.${camp.id}.title`}
                value={camp.title}
                onChange={(title) =>
                  setDoc((d) => ({
                    ...d,
                    campaigns: campaigns.map((c) =>
                      c.id === camp.id ? { ...c, title } : c
                    ),
                  }))
                }
                meta={meta}
                onMetaChange={setMeta}
              />
              <CmsLocalizedField
                label="Beschrijving"
                field={`camp.${camp.id}.subtitle`}
                value={camp.subtitle}
                onChange={(subtitle) =>
                  setDoc((d) => ({
                    ...d,
                    campaigns: campaigns.map((c) =>
                      c.id === camp.id ? { ...c, subtitle } : c
                    ),
                  }))
                }
                meta={meta}
                onMetaChange={setMeta}
                multiline
              />
              <CmsLocalizedField
                label="CTA-tekst"
                field={`camp.${camp.id}.cta`}
                value={camp.ctaLabel}
                onChange={(ctaLabel) =>
                  setDoc((d) => ({
                    ...d,
                    campaigns: campaigns.map((c) =>
                      c.id === camp.id ? { ...c, ctaLabel } : c
                    ),
                  }))
                }
                meta={meta}
                onMetaChange={setMeta}
              />
              <label className="block text-sm font-semibold">
                Link
                <input
                  className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
                  value={camp.href}
                  onChange={(e) =>
                    setDoc((d) => ({
                      ...d,
                      campaigns: campaigns.map((c) =>
                        c.id === camp.id ? { ...c, href: e.target.value } : c
                      ),
                    }))
                  }
                  placeholder="/acties/slug"
                />
              </label>
              <p className="text-[11px] text-wf-500">
                Echte actie: /acties/&#123;slug&#125; (geen collectie= query).
                De hele kaart opent deze link. Zet de knop uit om alleen de afbeelding klikbaar te houden.
              </p>
                <CmsImageField
                label="Afbeelding"
                advice="Aanbevolen 1200 × 500 px (2,4:1). De actiekaart houdt deze verhouding."
                hint="De afbeelding vult de kaart. Titel, logo en knop staan er los overheen."
                previewRatio="2.4 / 1"
                url={camp.image ?? null}
                placement="homepage_hero"
                previewFit="cover"
                onChange={(image) =>
                  setDoc((d) => ({
                    ...d,
                    campaigns: campaigns.map((c) =>
                      c.id === camp.id ? { ...c, image } : c
                    ),
                  }))
                }
                onError={onError}
              />
              <CmsCampaignCardFields
                value={camp.card}
                onError={onError}
                onChange={(card) =>
                  setDoc((d) => ({
                    ...d,
                    campaigns: campaigns.map((c) =>
                      c.id === camp.id ? { ...c, card } : c
                    ),
                  }))
                }
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={camp.visible}
                  onChange={(e) =>
                    setDoc((d) => ({
                      ...d,
                      campaigns: campaigns.map((c) =>
                        c.id === camp.id
                          ? { ...c, visible: e.target.checked }
                          : c
                      ),
                    }))
                  }
                />
                Zichtbaar
              </label>
              <button
                type="button"
                className="text-[11px] text-red-700 underline"
                onClick={() =>
                  setDoc((d) => ({
                    ...d,
                    campaigns: campaigns.filter((c) => c.id !== camp.id),
                  }))
                }
              >
                Verwijderen
              </button>
            </div>
          ))}
        </ItemListActions>
      </div>
    )
  }

  if (section.key === "banner") {
    const bannerSections = doc.sections
      .filter((s) => s.key === "banner")
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const slotIndex = Math.max(
      0,
      bannerSections.findIndex((s) => s.id === section.id)
    )
    const slotPosition = (slotIndex === 0 ? 1 : 2) as 1 | 2
    const existing = Array.isArray(doc.banners) ? [...doc.banners] : []
    const current =
      (existing.find(
        (b) =>
          b &&
          typeof b === "object" &&
          Number((b as { position?: number }).position) === slotPosition
      ) as { id?: string } | undefined) ??
      (existing[slotIndex] as { id?: string } | undefined)
    const selectedId =
      typeof current?.id === "string" ? current.id : ""
    return (
      <div className="space-y-4">
        <SectionBasics
          section={section}
          meta={meta}
          onMeta={setMeta}
          onPatch={patchSection}
          onError={onError}
          showImage={false}
        />
        <p className="text-[12px] text-wf-600">
          Banner-slot positie {slotPosition}. Kies een banner uit de bibliotheek.
          Bannerafbeeldingen vullen het hele vak als achtergrond (
          <strong className="font-semibold">advies: 2400 × 600 px, 4:1</strong>
          ). Leeg = &quot;Geen actieve banner&quot; tenzij een betaalde campagne
          dit slot overneemt.
        </p>
        <label className="block text-sm font-semibold">
          Banner uit bibliotheek
          <select
            className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs"
            value={selectedId}
            onChange={(e) => {
              const id = e.target.value
              const banner = banners.find((b) => b.id === id)
              setDoc((d) => {
                const prev = Array.isArray(d.banners)
                  ? ([...d.banners] as Array<Record<string, unknown>>)
                  : []
                const withoutSlot = prev.filter(
                  (b) => Number(b.position) !== slotPosition
                )
                if (!banner) {
                  return { ...d, banners: withoutSlot }
                }
                return {
                  ...d,
                  banners: [
                    ...withoutSlot,
                    {
                      id: banner.id,
                      position: slotPosition,
                      title: banner.title,
                      subtitle: banner.subtitle,
                      cta_label: banner.cta_label,
                      image_url: banner.image_url,
                      destination_url: banner.destination_url,
                      published: banner.published,
                      visible: true,
                    },
                  ],
                }
              })
            }}
          >
            <option value="">— Geen selectie —</option>
            {banners.map((b) => (
              <option key={b.id} value={b.id}>
                {(b.title.nl || b.id).slice(0, 48)} ·{" "}
                {b.published ? "Gepubliceerd" : "Concept"} · lib-pos{" "}
                {b.position}
              </option>
            ))}
          </select>
        </label>
        {selectedId ? (
          <div className="rounded-lg border border-wf-200 bg-wf-50 p-3 text-[12px] text-wf-700">
            {(() => {
              const b = banners.find((x) => x.id === selectedId)
              if (!b) return <p>Banner niet gevonden in bibliotheek.</p>
              return (
                <>
                  <p className="font-semibold">{b.title.nl || b.id}</p>
                  <p className="mt-1 break-all">{b.destination_url}</p>
                  <p className="mt-1">
                    Status: {b.published ? "Gepubliceerd" : "Concept"}
                  </p>
                </>
              )
            })()}
          </div>
        ) : null}
        <a
          href="/cms/banners"
          className="inline-block text-sm font-semibold text-sky-700 hover:underline"
        >
          Bannerbibliotheek openen
        </a>
      </div>
    )
  }

  if (section.key === "why") {
    return (
      <div className="space-y-4">
        <SectionBasics
          section={section}
          meta={meta}
          onMeta={setMeta}
          onPatch={patchSection}
          onError={onError}
          showImage={false}
        />
        <label className="flex items-center gap-2 text-sm text-wf-800">
          <input
            type="checkbox"
            checked={section.showImage !== false}
            onChange={(e) => patchSection({ showImage: e.target.checked })}
          />
          Grote sectie-afbeelding tonen
        </label>
        <CmsImageField
          label="Grote afbeelding (boven de USP's)"
          advice="Adviesformaat: 1600 × 900 px (16:9). Vult het sectiebeeld boven de USP's (object-cover)."
          hint="Optioneel. Wordt boven de USP-vakken getoond wanneer ingeschakeld."
          url={section.image ?? null}
          large
          placement="homepage_hero"
          previewFit="cover"
          onChange={(image) => patchSection({ image })}
          onError={onError}
        />
        <ItemListActions
          addLabel="USP toevoegen"
          onAdd={() =>
            setDoc((d) => ({
              ...d,
              whyItems: [
                ...d.whyItems,
                {
                  id: `why_${Date.now()}`,
                  visible: true,
                  sortOrder: (d.whyItems.length + 1) * 10,
                  title: emptyLocalized(),
                  subtitle: emptyLocalized(),
                  image: null,
                } satisfies HomepageWhyItemDoc,
              ],
            }))
          }
        >
          {doc.whyItems.map((item) => (
            <div
              key={item.id}
              className="space-y-2 rounded-lg border border-wf-100 p-2"
            >
              <CmsLocalizedField
                label="USP-titel"
                field={`why.${item.id}.title`}
                value={item.title}
                onChange={(title) =>
                  setDoc((d) => ({
                    ...d,
                    whyItems: d.whyItems.map((w) =>
                      w.id === item.id ? { ...w, title } : w
                    ),
                  }))
                }
                meta={meta}
                onMetaChange={setMeta}
              />
              <CmsLocalizedField
                label="USP-tekst"
                field={`why.${item.id}.subtitle`}
                value={item.subtitle}
                onChange={(subtitle) =>
                  setDoc((d) => ({
                    ...d,
                    whyItems: d.whyItems.map((w) =>
                      w.id === item.id ? { ...w, subtitle } : w
                    ),
                  }))
                }
                meta={meta}
                onMetaChange={setMeta}
                multiline
              />
              <CmsImageField
                label="USP-afbeelding / icoon"
                advice="Adviesformaat: 640 × 400 px (16:10). Vult het bovenste deel van het USP-vak. Andere verhoudingen worden gecropt."
                hint="Optioneel. Leeg = alleen titel en tekst."
                url={item.image ?? null}
                placement="brand_story_photo"
                previewFit="cover"
                onChange={(image) =>
                  setDoc((d) => ({
                    ...d,
                    whyItems: d.whyItems.map((w) =>
                      w.id === item.id ? { ...w, image } : w
                    ),
                  }))
                }
                onError={onError}
              />
              <button
                type="button"
                className="text-[11px] text-red-700 underline"
                onClick={() =>
                  setDoc((d) => ({
                    ...d,
                    whyItems: d.whyItems.filter((w) => w.id !== item.id),
                  }))
                }
              >
                Verwijderen
              </button>
            </div>
          ))}
        </ItemListActions>
      </div>
    )
  }

  if (section.key === "partners") {
    return (
      <div className="space-y-4">
        <SectionBasics
          section={section}
          meta={meta}
          onMeta={setMeta}
          onPatch={patchSection}
          onError={onError}
          showImage={false}
        />
        <ItemListActions
          addLabel="Merk toevoegen"
          onAdd={() =>
            setDoc((d) => ({
              ...d,
              partnerSpotlight: [
                ...partners,
                {
                  id: `partner_${Date.now()}`,
                  slug: "",
                  visible: true,
                  sortOrder: (partners.length + 1) * 10,
                  title: emptyLocalized(),
                  subtitle: emptyLocalized(),
                  image: null,
                  logo: null,
                  ...parseBrandCardPresentation({}),
                  backgroundKey: "light",
                  ctaLabel: emptyLocalized(),
                  href: "",
                  country: emptyLocalized(),
                  rating: 0,
                  productCount: 0,
                },
              ],
            }))
          }
        >
          {partners.map((partner) => (
            <div
              key={partner.id}
              className="space-y-3 rounded-lg border border-wf-100 p-3"
            >
              <label className="block text-sm font-semibold">
                Merk
                <select
                  className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
                  value={partner.slug}
                  onChange={(e) => {
                    const slug = e.target.value
                    const known = catalogBrands.find((b) => b.slug === slug)
                    setDoc((d) => ({
                      ...d,
                      partnerSpotlight: partners.map((p) => {
                        if (p.id !== partner.id) return p
                        const titleEmpty = !p.title.nl && !p.title.en && !p.title.de && !p.title.fr
                        return {
                          ...p,
                          slug,
                          title:
                            titleEmpty && known
                              ? { ...p.title, nl: known.name }
                              : p.title,
                        }
                      }),
                    }))
                  }}
                >
                  <option value="">Kies een bestaand merk</option>
                  {partner.slug &&
                  !catalogBrands.some((b) => b.slug === partner.slug) ? (
                    <option value={partner.slug}>
                      {partner.slug} (huidige koppeling)
                    </option>
                  ) : null}
                  {catalogBrands.map((brand) => (
                    <option key={brand.id} value={brand.slug}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-[12px] text-wf-600">
                Klikbestemming:{" "}
                {partner.slug.trim()
                  ? `/merk/${partner.slug.trim()}`
                  : "koppel een merk om de hele kaart naar de merkpagina te laten gaan."}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={partner.visible}
                    onChange={(e) =>
                      setDoc((d) => ({
                        ...d,
                        partnerSpotlight: partners.map((p) =>
                          p.id === partner.id
                            ? { ...p, visible: e.target.checked }
                            : p
                        ),
                      }))
                    }
                  />
                  Zichtbaar
                </label>
                <label className="block text-sm font-semibold">
                  Volgorde
                  <input
                    className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
                    type="number"
                    value={String(partner.sortOrder)}
                    onChange={(e) =>
                      setDoc((d) => ({
                        ...d,
                        partnerSpotlight: partners.map((p) =>
                          p.id === partner.id
                            ? { ...p, sortOrder: Number(e.target.value) || 0 }
                            : p
                        ),
                      }))
                    }
                  />
                </label>
              </div>
              <CmsLocalizedField
                label="Merknaam"
                field={`partner.${partner.id}.title`}
                value={partner.title}
                onChange={(title) =>
                  setDoc((d) => ({
                    ...d,
                    partnerSpotlight: partners.map((p) =>
                      p.id === partner.id ? { ...p, title } : p
                    ),
                  }))
                }
                meta={meta}
                onMetaChange={setMeta}
              />
              <CmsLocalizedField
                label="Tekst onder het logo"
                field={`partner.${partner.id}.subtitle`}
                value={partner.subtitle}
                onChange={(subtitle) =>
                  setDoc((d) => ({
                    ...d,
                    partnerSpotlight: partners.map((p) =>
                      p.id === partner.id ? { ...p, subtitle } : p
                    ),
                  }))
                }
                meta={meta}
                onMetaChange={setMeta}
                multiline
              />
              <CmsLocalizedField
                label="Land"
                field={`partner.${partner.id}.country`}
                value={partner.country}
                onChange={(country) =>
                  setDoc((d) => ({
                    ...d,
                    partnerSpotlight: partners.map((p) =>
                      p.id === partner.id ? { ...p, country } : p
                    ),
                  }))
                }
                meta={meta}
                onMetaChange={setMeta}
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm font-semibold">
                  Rating
                  <input
                    className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={String(partner.rating || 0)}
                    onChange={(e) =>
                      setDoc((d) => ({
                        ...d,
                        partnerSpotlight: partners.map((p) =>
                          p.id === partner.id
                            ? { ...p, rating: Number(e.target.value) || 0 }
                            : p
                        ),
                      }))
                    }
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Aantal producten
                  <input
                    className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
                    type="number"
                    min={0}
                    value={String(partner.productCount || 0)}
                    onChange={(e) =>
                      setDoc((d) => ({
                        ...d,
                        partnerSpotlight: partners.map((p) =>
                          p.id === partner.id
                            ? {
                                ...p,
                                productCount: Number(e.target.value) || 0,
                              }
                            : p
                        ),
                      }))
                    }
                  />
                </label>
              </div>
              <CmsImageField
                label="Sfeerachtergrond"
                advice="Aanbevolen 1600 × 470 px (3,4:1). De achtergrond vult de hele merkkaart."
                hint="Eigen sfeerbeeld van dit merk. De afbeelding vult de kaart (cover)."
                url={partner.image ?? null}
                large
                placement="brand_story_photo"
                previewFit="cover"
                previewRatio="3.4 / 1"
                onChange={(image) =>
                  setDoc((d) => ({
                    ...d,
                    partnerSpotlight: partners.map((p) =>
                      p.id === partner.id ? { ...p, image } : p
                    ),
                  }))
                }
                onError={onError}
              />
              <label className="block text-sm font-semibold">
                Link naar merkpagina
                <input
                  className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"
                  value={partner.href}
                  placeholder={
                    partner.slug.trim()
                      ? `/merk/${partner.slug.trim()}`
                      : "/merk/slug"
                  }
                  onChange={(e) =>
                    setDoc((d) => ({
                      ...d,
                      partnerSpotlight: partners.map((p) =>
                        p.id === partner.id ? { ...p, href: e.target.value } : p
                      ),
                    }))
                  }
                />
              </label>
              <p className="text-[11px] text-wf-500">
                Leeg: de hele kaart opent{" "}
                {partner.slug.trim()
                  ? `/merk/${partner.slug.trim()}`
                  : "de merkpagina zodra een merk is gekozen"}
                . Er is één link, ook als de knop zichtbaar is.
              </p>
              <CmsLocalizedField
                label="Knoptekst"
                field={`partner.${partner.id}.cta`}
                value={partner.ctaLabel}
                onChange={(ctaLabel) =>
                  setDoc((d) => ({
                    ...d,
                    partnerSpotlight: partners.map((p) =>
                      p.id === partner.id ? { ...p, ctaLabel } : p
                    ),
                  }))
                }
                meta={meta}
                onMetaChange={setMeta}
              />
              <CmsCampaignCardFields
                value={partner.card ?? brandCardStyleFromLegacy(partner)}
                previewRatio="3.4 / 1"
                onError={onError}
                onChange={(card) =>
                  setDoc((d) => ({
                    ...d,
                    partnerSpotlight: partners.map((p) =>
                      p.id === partner.id
                        ? {
                            ...p,
                            card,
                            logo: card.logo,
                            logoSize: Math.min(160, Math.max(48, card.logoWidth)),
                            logoPosition: card.horizontal,
                            textColor: card.titleColor,
                            overlayStrength:
                              card.overlay === "none"
                                ? 0
                                : card.overlay === "dark"
                                  ? 55
                                  : 62,
                          }
                        : p
                    ),
                  }))
                }
              />
              <fieldset>
                <legend className="text-sm font-semibold">
                  Achtergrondkleur als er geen sfeerbeeld is
                </legend>
                <div className="mt-2 grid grid-cols-1 gap-1.5">
                  {BRAND_BACKGROUNDS.map((opt) => (
                    <label
                      key={opt.key}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        checked={partner.backgroundKey === opt.key}
                        onChange={() =>
                          setDoc((d) => ({
                            ...d,
                            partnerSpotlight: partners.map((p) =>
                              p.id === partner.id
                                ? { ...p, backgroundKey: opt.key }
                                : p
                            ),
                          }))
                        }
                      />
                      <span
                        className="inline-block h-5 w-8 shrink-0 rounded border border-wf-200"
                        style={{ background: opt.swatch }}
                        aria-hidden
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                type="button"
                className="text-[11px] text-red-700 underline"
                onClick={() =>
                  setDoc((d) => ({
                    ...d,
                    partnerSpotlight: partners.filter(
                      (p) => p.id !== partner.id
                    ),
                  }))
                }
              >
                Verwijderen
              </button>
            </div>
          ))}
        </ItemListActions>
      </div>
    )
  }

  if (section.key === "newsletter") {
    return (
      <div className="space-y-4">
        <CmsLocalizedField
          label="Titel"
          field={`${section.id}.title`}
          value={section.title}
          onChange={(title) =>
            setDoc((d) => ({
              ...d,
              sections: d.sections.map((s) =>
                s.id === section.id ? { ...s, title } : s
              ),
              newsletter: { ...d.newsletter, title },
            }))
          }
          meta={meta}
          onMetaChange={setMeta}
        />
        <CmsLocalizedField
          label="Beschrijving (onder de titel)"
          field="newsletter.subtitle"
          value={doc.newsletter.subtitle}
          onChange={(subtitle) =>
            setDoc((d) => ({
              ...d,
              sections: d.sections.map((s) =>
                s.id === section.id ? { ...s, subtitle } : s
              ),
              newsletter: { ...d.newsletter, subtitle },
            }))
          }
          meta={meta}
          onMetaChange={setMeta}
          multiline
        />
        <label className="flex items-center gap-2 text-sm text-wf-800">
          <input
            type="checkbox"
            checked={section.visible}
            onChange={(e) => patchSection({ visible: e.target.checked })}
          />
          Sectie zichtbaar
        </label>
        <p className="text-[12px] text-wf-600">
          De beschrijving is de begeleidende tekst onder de titel van het
          nieuwsbriefblok.
        </p>
        <CmsImageField
          label="Nieuwsbrief-afbeelding"
          advice="Adviesformaat: 800 × 640 px (5:4). Desktop naast tekst; mobiel erboven. Object-cover in het beeldvlak."
          hint="Optioneel. Visueel vlak links van titel, beschrijving en formulier."
          url={doc.newsletter.image ?? null}
          large
          placement="homepage_hero"
          previewFit="cover"
          onChange={(image) =>
            setDoc((d) => ({
              ...d,
              newsletter: { ...d.newsletter, image },
            }))
          }
          onError={onError}
        />
        <CmsLocalizedField
          label="Placeholder e-mailveld"
          field="newsletter.placeholder"
          value={doc.newsletter.placeholder}
          onChange={(placeholder) =>
            setDoc((d) => ({
              ...d,
              newsletter: { ...d.newsletter, placeholder },
            }))
          }
          meta={meta}
          onMetaChange={setMeta}
        />
        <CmsLocalizedField
          label="Knoptekst"
          field="newsletter.submitLabel"
          value={doc.newsletter.submitLabel}
          onChange={(submitLabel) =>
            setDoc((d) => ({
              ...d,
              newsletter: { ...d.newsletter, submitLabel },
            }))
          }
          meta={meta}
          onMetaChange={setMeta}
        />
        <CmsLocalizedField
          label="Foutmelding bij ongeldig e-mailadres"
          field="newsletter.invalidEmail"
          value={doc.newsletter.invalidEmail}
          onChange={(invalidEmail) =>
            setDoc((d) => ({
              ...d,
              newsletter: { ...d.newsletter, invalidEmail },
            }))
          }
          meta={meta}
          onMetaChange={setMeta}
        />
        <CmsLocalizedField
          label="Succesmelding na inschrijving"
          field="newsletter.successMessage"
          value={doc.newsletter.successMessage}
          onChange={(successMessage) =>
            setDoc((d) => ({
              ...d,
              newsletter: { ...d.newsletter, successMessage },
            }))
          }
          meta={meta}
          onMetaChange={setMeta}
          multiline
        />
        <p className="text-[11px] text-wf-500">
          Submit: clientvalidatie + succesfeedback. Backend-nieuwsbriefkoppeling
          volgt later — geen schijn-API.
        </p>
      </div>
    )
  }

  if (section.key === "faq") {
    const faqItems = doc.faqItems || []
    return (
      <div className="space-y-4">
        {basics}
        <ItemListActions
          addLabel="Vraag toevoegen"
          onAdd={() =>
            setDoc((d) => ({
              ...d,
              faqItems: [
                ...(d.faqItems || []),
                {
                  id: `faq_${Date.now()}`,
                  visible: true,
                  sortOrder: ((d.faqItems || []).length + 1) * 10,
                  title: emptyLocalized(),
                  subtitle: emptyLocalized(),
                  image: null,
                },
              ],
            }))
          }
        >
          {faqItems.map((item) => (
            <div
              key={item.id}
              className="space-y-2 rounded-lg border border-wf-100 p-2"
            >
              <CmsLocalizedField
                label="Vraag"
                field={`faq.${item.id}.title`}
                value={item.title}
                onChange={(title) =>
                  setDoc((d) => ({
                    ...d,
                    faqItems: (d.faqItems || []).map((f) =>
                      f.id === item.id ? { ...f, title } : f
                    ),
                  }))
                }
                meta={meta}
                onMetaChange={setMeta}
              />
              <CmsLocalizedField
                label="Antwoord"
                field={`faq.${item.id}.subtitle`}
                value={item.subtitle}
                onChange={(subtitle) =>
                  setDoc((d) => ({
                    ...d,
                    faqItems: (d.faqItems || []).map((f) =>
                      f.id === item.id ? { ...f, subtitle } : f
                    ),
                  }))
                }
                meta={meta}
                onMetaChange={setMeta}
                multiline
              />
              <button
                type="button"
                className="text-[11px] text-red-700 underline"
                onClick={() =>
                  setDoc((d) => ({
                    ...d,
                    faqItems: (d.faqItems || []).filter(
                      (f) => f.id !== item.id
                    ),
                  }))
                }
              >
                Verwijderen
              </button>
            </div>
          ))}
        </ItemListActions>
      </div>
    )
  }

  return <div className="space-y-4">{basics}</div>
}
