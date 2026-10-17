"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getMediaRequirements } from "@europmade/utils"
import { EU_MARKET_CODES } from "@europmade/types"
import { Button, Input, MediaUploadField, Notice } from "@europmade/ui"
import {
  createCmsBanner,
  emptyLocalized,
  getCmsBanner,
  updateCmsBanner,
  uploadCmsMedia,
  type CmsBannerDto,
  type LocalizedCms,
} from "../lib/cms-admin-api"
import { adminMarketOptions } from "../lib/market-labels"
import { displayMediaUrl } from "../lib/media-url"
import { bannerImageStyle, parseBannerPresentation } from "@europmade/utils"
import type { CmsI18nMeta } from "../lib/cms-i18n"
import {
  CmsLocaleProvider,
  CmsLocaleToolbar,
  useCmsLocale,
} from "./cms/cms-locale-toolbar"
import { CmsLocalizedField } from "./cms/cms-localized-field"
import { CmsPreviewFrame, CmsStatusBadge } from "./cms/cms-preview-frame"

type Props = { bannerId?: string }

function CmsBannerEditorInner({ bannerId }: Props) {
  const { locale } = useCmsLocale()
  const bannerMedia = getMediaRequirements("cms_banner")
  const router = useRouter()
  const isNew = !bannerId || bannerId === "new"
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [meta, setMeta] = useState<CmsI18nMeta>({})
  const [tab, setTab] = useState<"edit" | "preview">("edit")
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop")
  const [form, setForm] = useState({
    position: 1 as 1 | 2,
    location: "homepage",
    title: emptyLocalized(),
    subtitle: emptyLocalized(),
    cta_label: emptyLocalized(),
    destination_url: "/categorie",
    link_type: "category",
    image_url: "" as string,
    image_alt: emptyLocalized(),
    background: "",
    presentation: parseBannerPresentation(null),
    market_scope: "all" as "all" | "selected",
    markets: [] as string[],
    visible: true,
    sort_order: 0,
    published: false,
  })

  useEffect(() => {
    if (isNew || !bannerId) return
    getCmsBanner(bannerId)
      .then(({ banner }) => {
        setForm({
          position: banner.position === 2 ? 2 : 1,
          location: banner.location,
          title: banner.title,
          subtitle: banner.subtitle,
          cta_label: banner.cta_label,
          destination_url: banner.destination_url,
          link_type: banner.link_type,
          image_url: banner.image_url ?? "",
          image_alt: banner.image_alt,
          background: banner.background ?? "",
          presentation: parseBannerPresentation(banner.presentation, {
            fit: "cover",
            positionX: 50,
            positionY: 50,
            scale: 1,
            textColor: banner.image_url ? "white" : "black",
            buttonColor: banner.image_url ? "white" : "black",
          }),
          market_scope: banner.market_scope,
          markets: banner.markets,
          visible: banner.visible,
          sort_order: banner.sort_order,
          published: banner.published,
        })
        setMeta((banner.i18n_meta as CmsI18nMeta) ?? {})
      })
      .catch((e: Error) => setError(e.message))
  }, [bannerId, isNew])

  useEffect(() => {
    if (!file) {
      setLocalPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setLocalPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function toggleMarket(code: string) {
    setForm((prev) => {
      const has = prev.markets.includes(code)
      return {
        ...prev,
        markets: has
          ? prev.markets.filter((c) => c !== code)
          : [...prev.markets, code],
      }
    })
  }

  async function persist(nextPublished: boolean) {
    setBusy(true)
    setError(null)
    try {
      let image_url = form.image_url || null
      let asset_id: string | null = null
      if (file) {
        const uploaded = await uploadCmsMedia(file, "cms_banner")
        image_url = uploaded.asset.url
        asset_id = uploaded.asset.id
      }
      const payload: Partial<CmsBannerDto> = {
        position: form.position,
        location: form.location,
        title: form.title,
        subtitle: form.subtitle,
        cta_label: form.cta_label,
        destination_url: form.destination_url,
        link_type: form.link_type,
        image_url,
        image_alt: form.image_alt,
        background: form.background || null,
        presentation: form.presentation,
        market_scope: form.market_scope,
        markets: form.market_scope === "selected" ? form.markets : [],
        visible: form.visible,
        sort_order: form.sort_order,
        published: nextPublished,
        asset_id,
        i18n_meta: meta,
      }
      if (isNew) {
        const { banner } = await createCmsBanner(payload)
        setForm((p) => ({ ...p, published: nextPublished, image_url: image_url || "" }))
        router.replace(`/cms/banners/${banner.id}`)
      } else if (bannerId) {
        await updateCmsBanner(bannerId, payload)
        setForm((p) => ({ ...p, published: nextPublished, image_url: image_url || "" }))
        router.push("/cms/banners")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-wf-500">
          <Link href="/cms" className="hover:underline">
            CMS
          </Link>{" "}
          /{" "}
          <Link href="/cms/banners" className="hover:underline">
            Banners
          </Link>
        </p>
        <h1 className="text-xl font-bold text-wf-950">
          {isNew ? "Nieuwe banner" : "Banner bewerken"}
        </h1>
        <div className="mt-2">
          <CmsStatusBadge
            published={form.published}
            extra={form.visible ? "actief" : "inactief"}
          />
        </div>
      </div>

      {error ? <Notice variant="warning">{error}</Notice> : null}
      <CmsLocaleToolbar />
      <div className="flex gap-2">
        <Button type="button" variant={tab === "edit" ? "primary" : "secondary"} onClick={() => setTab("edit")}>
          Bewerken
        </Button>
        <Button type="button" variant={tab === "preview" ? "primary" : "secondary"} onClick={() => setTab("preview")}>
          Preview
        </Button>
      </div>

      {tab === "preview" ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button type="button" variant={viewport === "desktop" ? "primary" : "secondary"} onClick={() => setViewport("desktop")}>Desktop</Button>
            <Button type="button" variant={viewport === "mobile" ? "primary" : "secondary"} onClick={() => setViewport("mobile")}>Mobiel</Button>
          </div>
          <CmsPreviewFrame viewport={viewport}>
            <BannerSurface
              imageUrl={displayMediaUrl(form.image_url)}
              background={form.background}
              title={form.title[locale] || form.title.nl}
              subtitle={form.subtitle[locale] || form.subtitle.nl}
              cta={form.cta_label[locale] || form.cta_label.nl}
              presentation={form.presentation}
            />
          </CmsPreviewFrame>
        </div>
      ) : (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void persist(form.published)
        }}
        className="space-y-4"
      >
        <div className="grid gap-3 tablet:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Positie</span>
            <select
              className="w-full rounded-lg border border-wf-300 px-3 py-2"
              value={form.position}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  position: Number(e.target.value) === 2 ? 2 : 1,
                }))
              }
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Locatie</span>
            <select
              className="w-full rounded-lg border border-wf-300 px-3 py-2"
              value={form.location}
              onChange={(e) =>
                setForm((p) => ({ ...p, location: e.target.value }))
              }
            >
              <option value="homepage">homepage</option>
              <option value="category">category</option>
              <option value="search">search</option>
              <option value="product">product</option>
            </select>
          </label>
        </div>

        <CmsLocalizedField
          label="Titel"
          field="title"
          value={form.title}
          onChange={(title) => setForm((p) => ({ ...p, title }))}
          meta={meta}
          onMetaChange={setMeta}
        />
        <CmsLocalizedField
          label="Subtitel"
          field="subtitle"
          value={form.subtitle}
          onChange={(subtitle) => setForm((p) => ({ ...p, subtitle }))}
          meta={meta}
          onMetaChange={setMeta}
        />
        <CmsLocalizedField
          label="CTA-label"
          field="cta_label"
          value={form.cta_label}
          onChange={(cta_label) => setForm((p) => ({ ...p, cta_label }))}
          meta={meta}
          onMetaChange={setMeta}
        />

        <label className="block text-sm">
          <span className="mb-1 block font-semibold">Bestemming (URL)</span>
          <Input
            value={form.destination_url}
            onChange={(e) =>
              setForm((p) => ({ ...p, destination_url: e.target.value }))
            }
            required
          />
        </label>

        <section className="space-y-2 rounded-xl border border-wf-200 p-4">
          <h2 className="font-semibold text-wf-900">Markten</h2>
          <p className="text-xs text-wf-600">
            Taal en markt zijn afzonderlijke instellingen.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="marketScope"
              checked={form.market_scope === "all"}
              onChange={() =>
                setForm((p) => ({ ...p, market_scope: "all", markets: [] }))
              }
            />
            Alle markten
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="marketScope"
              checked={form.market_scope === "selected"}
              onChange={() =>
                setForm((p) => ({ ...p, market_scope: "selected" }))
              }
            />
            Geselecteerde markten
          </label>
          {form.market_scope === "selected" ? (
            <div className="mt-2 grid max-h-56 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-wf-100 p-2 text-sm tablet:grid-cols-3">
              {adminMarketOptions().map(({ code, label }) => (
                <label key={code} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.markets.includes(code)}
                    onChange={() => toggleMarket(code)}
                  />
                  {label}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-wf-500">
              Zichtbaar in alle {EU_MARKET_CODES.length} EU-markten.
            </p>
          )}
        </section>

        <p className="text-xs text-wf-600">
          Adviesformaat: 2400 × 600 px (4:1). De afbeelding vult de volledige
          banner als achtergrond. Toegestaan: JPEG/JPG, PNG of WEBP.
        </p>
        <p className="text-xs text-wf-600">
          {bannerMedia.notes}
          {bannerMedia.recommendedSize
            ? ` Aanbevolen ${bannerMedia.recommendedSize.width}×${bannerMedia.recommendedSize.height} px, verhouding ongeveer 4:1.`
            : null}
        </p>
        <MediaUploadField
          placement="cms_banner"
          label="Bannerafbeelding"
          value={file}
          onChange={setFile}
        />
        <BannerSurface
          imageUrl={localPreview || displayMediaUrl(form.image_url)}
          background={form.background}
          title={form.title[locale] || form.title.nl || "Titel"}
          subtitle={form.subtitle[locale] || form.subtitle.nl}
          cta={form.cta_label[locale] || form.cta_label.nl}
          presentation={form.presentation}
        />
        <div className="grid gap-3 tablet:grid-cols-2">
          <label className="text-sm font-semibold">
            Weergave
            <select
              className="mt-1 w-full rounded-lg border border-wf-300 px-3 py-2"
              value={form.presentation.fit}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  presentation: {
                    ...p.presentation,
                    fit: e.target.value === "contain" ? "contain" : "cover",
                  },
                }))
              }
            >
              <option value="cover">Cover — sfeerbeeld vult 2400×600</option>
              <option value="contain">Contain — product blijft volledig zichtbaar</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Achtergrondkleur
            <input
              className="mt-1 w-full rounded-lg border border-wf-300 px-3 py-2"
              value={form.background}
              onChange={(e) => setForm((p) => ({ ...p, background: e.target.value }))}
              placeholder="#10381f of een CSS-kleur"
            />
          </label>
          <label className="text-sm font-semibold">
            Horizontale positie ({form.presentation.positionX}%)
            <input
              className="mt-1 w-full"
              type="range"
              min={0}
              max={100}
              value={form.presentation.positionX}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  presentation: { ...p.presentation, positionX: Number(e.target.value) },
                }))
              }
            />
          </label>
          <label className="text-sm font-semibold">
            Verticale positie ({form.presentation.positionY}%)
            <input
              className="mt-1 w-full"
              type="range"
              min={0}
              max={100}
              value={form.presentation.positionY}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  presentation: { ...p.presentation, positionY: Number(e.target.value) },
                }))
              }
            />
          </label>
          <label className="text-sm font-semibold">
            Schaal ({form.presentation.scale.toFixed(2)})
            <input
              className="mt-1 w-full"
              type="range"
              min={100}
              max={200}
              value={Math.round(form.presentation.scale * 100)}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  presentation: { ...p.presentation, scale: Number(e.target.value) / 100 },
                }))
              }
            />
          </label>
          <label className="text-sm font-semibold">
            Tekstkleur
            <select
              className="mt-1 w-full rounded-lg border border-wf-300 px-3 py-2"
              value={form.presentation.textColor}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  presentation: {
                    ...p.presentation,
                    textColor: e.target.value === "black" ? "black" : "white",
                  },
                }))
              }
            >
              <option value="white">Wit</option>
              <option value="black">Zwart</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Knopkleur
            <select
              className="mt-1 w-full rounded-lg border border-wf-300 px-3 py-2"
              value={form.presentation.buttonColor}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  presentation: {
                    ...p.presentation,
                    buttonColor: e.target.value === "black" ? "black" : "white",
                  },
                }))
              }
            >
              <option value="white">Wit</option>
              <option value="black">Zwart</option>
            </select>
          </label>
        </div>
        {displayMediaUrl(form.image_url) ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setForm((p) => ({ ...p, image_url: "" }))}
          >
            Afbeelding verwijderen
          </Button>
        ) : null}

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.visible}
              onChange={(e) =>
                setForm((p) => ({ ...p, visible: e.target.checked }))
              }
            />
            Zichtbaar
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) =>
                setForm((p) => ({ ...p, published: e.target.checked }))
              }
            />
            Gepubliceerd
          </label>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void persist(false)}
          >
            Opslaan als concept
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() => void persist(true)}
          >
            Publiceren
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/cms/banners")}
          >
            Annuleren
          </Button>
        </div>
      </form>
      )}
    </div>
  )
}

function BannerSurface({
  imageUrl,
  background,
  title,
  subtitle,
  cta,
  presentation,
}: {
  imageUrl: string | null
  background: string
  title: string
  subtitle: string
  cta: string
  presentation: ReturnType<typeof parseBannerPresentation>
}) {
  const imageStyle = bannerImageStyle(presentation)
  const lightText = presentation.textColor === "white"
  const lightButton = presentation.buttonColor === "white"
  return (
    <div
      className="relative aspect-[4/1] w-full overflow-hidden rounded-2xl border border-wf-200"
      style={{ background: background || "#f3f4f6" }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full" style={imageStyle} />
      ) : null}
      <div className="relative z-[1] flex h-full flex-col justify-center px-6">
        <p className={`text-xl font-bold ${lightText ? "text-white" : "text-wf-900"}`}>{title}</p>
        {subtitle ? (
          <p className={`mt-1 max-w-xl text-sm ${lightText ? "text-white/90" : "text-wf-600"}`}>
            {subtitle}
          </p>
        ) : null}
        {cta ? (
          <span
            className={`mt-3 inline-flex h-9 w-fit items-center rounded-lg px-3 text-sm font-semibold ${
              lightButton ? "bg-white text-wf-900" : "bg-wf-900 text-white"
            }`}
          >
            {cta}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default function CmsBannerEditorPage(props: Props) {
  return (
    <CmsLocaleProvider>
      <CmsBannerEditorInner {...props} />
    </CmsLocaleProvider>
  )
}
