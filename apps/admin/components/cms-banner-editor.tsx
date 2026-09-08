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
    <div className="mx-auto max-w-3xl space-y-4 p-6">
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
            <div className="p-6">
              {displayMediaUrl(form.image_url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayMediaUrl(form.image_url) ?? ""} alt="" className="mb-3 max-h-40 w-full object-cover" />
              ) : null}
              <h2 className="text-xl font-bold text-wf-900">{form.title[locale] || form.title.nl}</h2>
              <p className="mt-1 text-sm text-wf-600">{form.subtitle[locale] || form.subtitle.nl}</p>
              <span className="mt-3 inline-flex rounded-xl bg-wf-900 px-3 py-2 text-sm font-semibold text-white">
                {form.cta_label[locale] || form.cta_label.nl}
              </span>
            </div>
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
        {displayMediaUrl(form.image_url) ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayMediaUrl(form.image_url) ?? ""} alt="" className="max-h-40 rounded object-cover" />
            <p className="text-xs text-wf-600">
              Huidige media:{" "}
              <a href={displayMediaUrl(form.image_url) ?? "#"} className="underline" target="_blank" rel="noreferrer">
                openen
              </a>
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setForm((p) => ({ ...p, image_url: "" }))}
            >
              Afbeelding verwijderen
            </Button>
          </div>
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

export default function CmsBannerEditorPage(props: Props) {
  return (
    <CmsLocaleProvider>
      <CmsBannerEditorInner {...props} />
    </CmsLocaleProvider>
  )
}
