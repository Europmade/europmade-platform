"use client"

import { useState } from "react"
import { Button } from "@europmade/ui"
import {
  emptyCategoryLocalized,
  type CategoryCmsImage,
  type CategoryCmsImageFrame,
  type CategoryCmsLocalized,
} from "@europmade/utils"
import {
  listCmsMedia,
  updateCmsMediaText,
  uploadCmsMedia,
  type CmsMediaAssetDto,
} from "../../lib/cms-admin-api"
import type { CmsI18nMeta } from "../../lib/cms-i18n"
import { displayMediaUrl } from "../../lib/media-url"
import { CmsImageField } from "./cms-image-field"
import { CmsLocalizedField } from "./cms-localized-field"

const RATIOS: Array<{ value: CategoryCmsImageFrame["ratio"]; label: string }> = [
  { value: "original", label: "Origineel" },
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" },
  { value: "3:2", label: "3:2" },
]

function frameOf(image: CategoryCmsImage | null | undefined): Required<CategoryCmsImageFrame> {
  return {
    ratio: image?.frame?.ratio ?? "16:9",
    fit: image?.frame?.fit ?? "cover",
    position_x: image?.frame?.position_x ?? "center",
    position_y: image?.frame?.position_y ?? "center",
  }
}

function aspect(ratio: CategoryCmsImageFrame["ratio"]): string | undefined {
  if (ratio === "16:9") return "16 / 9"
  if (ratio === "4:3") return "4 / 3"
  if (ratio === "1:1") return "1 / 1"
  if (ratio === "3:2") return "3 / 2"
  return undefined
}

export function CmsMediaPicker({
  label,
  image,
  onChange,
  meta,
  setMeta,
  fieldPrefix,
  showFrame = true,
  showCaption = false,
  onError,
}: {
  label: string
  image: CategoryCmsImage | null | undefined
  onChange: (image: CategoryCmsImage | null) => void
  meta: CmsI18nMeta
  setMeta: (meta: CmsI18nMeta) => void
  fieldPrefix: string
  showFrame?: boolean
  showCaption?: boolean
  onError?: (message: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [assets, setAssets] = useState<CmsMediaAssetDto[]>([])
  const [query, setQuery] = useState("")
  const [placement, setPlacement] = useState("category_image")
  const [mime, setMime] = useState("")
  const [selected, setSelected] = useState<CmsMediaAssetDto | null>(null)
  const [libraryError, setLibraryError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const current = image ?? {}
  const frame = frameOf(current)
  const preview = displayMediaUrl(current.url)

  async function load() {
    setLibraryError(null)
    try {
      const result = await listCmsMedia({
        q: query,
        placement: placement || undefined,
        mime: mime || undefined,
      })
      setAssets(result.assets ?? [])
      setOpen(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bibliotheek laden mislukt."
      setLibraryError(message)
      onError?.(message)
    }
  }

  function useAsset(asset: CmsMediaAssetDto) {
    onChange({
      ...current,
      asset_id: asset.id,
      url: asset.url,
      alt: current.alt?.nl ? current.alt : asset.alt,
      caption: current.caption?.nl ? current.caption : asset.caption,
      frame: showFrame ? frame : current.frame,
    })
    setSelected(asset)
    setNote("Afbeelding gekoppeld. Sla het concept op om dit te bewaren.")
  }

  async function saveAssetText() {
    if (!selected) return
    setLibraryError(null)
    try {
      const result = await updateCmsMediaText(selected.id, { alt: selected.alt })
      setSelected({ ...result.asset, caption: current.caption })
      setAssets((rows) => rows.map((row) => (row.id === result.asset.id ? result.asset : row)))
      const moved = result.migrated_caption
      const blockHasCaption = Boolean(current.caption?.nl || current.caption?.en || current.caption?.de || current.caption?.fr)
      if (moved && !blockHasCaption) {
        onChange({ ...current, asset_id: current.asset_id, url: current.url, alt: selected.alt, caption: moved })
      }
      setNote("Alt-tekst opgeslagen bij de afbeelding. Het bijschrift blijft bij dit blok.")
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : "Opslaan mislukt.")
    }
  }

  async function replaceAsset(file: File | null) {
    if (!file || !selected) return
    setLibraryError(null)
    try {
      const uploaded = await uploadCmsMedia(file, selected.placement || "category_image", selected.id)
      setSelected(uploaded.asset)
      setAssets((rows) => rows.map((row) => (row.id === uploaded.asset.id ? uploaded.asset : row)))
      if (current.asset_id === uploaded.asset.id) {
        onChange({ ...current, url: uploaded.asset.url, asset_id: uploaded.asset.id })
      }
      setNote("Bronbestand vervangen. Blokken die deze afbeelding net kozen, gebruiken het nieuwe bestand.")
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : "Vervangen mislukt.")
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-wf-200 p-3">
      <p className="text-sm font-semibold text-wf-800">{label}</p>
      <CmsImageField
        label="Uploaden vanaf de computer"
        url={current.url ?? null}
        placement="category_image"
        onUploaded={(asset) =>
          onChange({
            ...current,
            url: asset.url,
            asset_id: asset.id,
            frame: showFrame ? frame : current.frame,
          })
        }
        onChange={(url) => {
          if (!url) onChange(null)
        }}
        onError={onError}
        previewRatio={aspect(frame.ratio)}
        previewFit={frame.fit}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => void load()}>
          Bibliotheek
        </Button>
        {current.url ? (
          <Button type="button" variant="secondary" onClick={() => onChange(null)}>
            Ontkoppelen
          </Button>
        ) : null}
      </div>
      <p className="text-[11px] text-wf-500">
        Ontkoppelen haalt de afbeelding alleen van dit blok. Het bestand blijft in de bibliotheek.
      </p>
      {note ? <p className="text-[12px] text-emerald-800">{note}</p> : null}
      {libraryError ? <p className="text-[12px] text-red-700">{libraryError}</p> : null}
      {open ? (
        <div className="space-y-2 rounded-lg bg-wf-50 p-2">
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              className="rounded-lg border border-wf-300 px-2 py-1.5 text-sm"
              placeholder="Zoek op bestandsnaam"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className="rounded-lg border border-wf-300 px-2 py-1.5 text-sm"
              value={placement}
              onChange={(event) => setPlacement(event.target.value)}
            >
              <option value="">Alle plaatsen</option>
              <option value="category_image">Categorie</option>
              <option value="homepage_hero">Homepage</option>
              <option value="cms_banner">Banner</option>
              <option value="brand_story_photo">Verhaal</option>
            </select>
            <select
              className="rounded-lg border border-wf-300 px-2 py-1.5 text-sm"
              value={mime}
              onChange={(event) => setMime(event.target.value)}
            >
              <option value="">Alle typen</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Zoeken
          </Button>
          {assets.length === 0 ? (
            <p className="text-sm text-wf-500">Geen afbeeldingen voor deze zoekopdracht.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2">
              {assets.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    className="w-full overflow-hidden rounded-lg border border-wf-200 bg-white text-left"
                    onClick={() => useAsset(asset)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={displayMediaUrl(asset.url) ?? ""} alt="" className="h-16 w-full object-cover" />
                    <span className="block truncate px-1 py-1 text-[10px] text-wf-700">
                      {asset.original_filename || asset.id}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selected ? (
            <div className="space-y-2 rounded-lg border border-wf-200 bg-white p-2">
              <p className="text-sm font-semibold text-wf-900">{selected.original_filename || selected.id}</p>
              <p className="text-[11px] text-wf-500">
                {selected.mime_type}
                {selected.width && selected.height ? ` · ${selected.width} × ${selected.height}` : ""}
              </p>
              <CmsLocalizedField
                label="Alt-tekst"
                field={`${fieldPrefix}.library.alt`}
                value={selected.alt}
                onChange={(alt) => setSelected({ ...selected, alt })}
                meta={meta}
                onMetaChange={setMeta}
              />
              <p className="text-[11px] text-wf-500">
                Alt-tekst hoort bij het bestand. Een bijschrift hoort bij dit blok.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => void saveAssetText()}>
                  Alt-tekst opslaan
                </Button>
                <label className="cursor-pointer rounded-lg border border-wf-300 px-3 py-1.5 text-sm font-semibold text-wf-800">
                  Bestand vervangen
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      event.target.value = ""
                      void replaceAsset(file)
                    }}
                  />
                </label>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <CmsLocalizedField
        label="Alt-tekst op dit blok"
        field={`${fieldPrefix}.alt`}
        value={current.alt ?? emptyCategoryLocalized()}
        onChange={(alt) => onChange({ ...current, alt })}
        meta={meta}
        onMetaChange={setMeta}
      />
      {showCaption ? (
        <CmsLocalizedField
          label="Bijschrift"
          field={`${fieldPrefix}.caption`}
          value={current.caption ?? emptyCategoryLocalized()}
          onChange={(caption) => onChange({ ...current, caption })}
          meta={meta}
          onMetaChange={setMeta}
        />
      ) : null}
      {showFrame ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm text-wf-800">
            Beeldverhouding
            <select
              className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5"
              value={frame.ratio}
              onChange={(event) =>
                onChange({ ...current, frame: { ...frame, ratio: event.target.value as CategoryCmsImageFrame["ratio"] } })
              }
            >
              {RATIOS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-wf-800">
            Weergave
            <select
              className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5"
              value={frame.fit}
              onChange={(event) =>
                onChange({ ...current, frame: { ...frame, fit: event.target.value as CategoryCmsImageFrame["fit"] } })
              }
            >
              <option value="cover">Vullen</option>
              <option value="contain">Passend maken</option>
            </select>
          </label>
          <label className="text-sm text-wf-800">
            Horizontaal
            <select
              className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5"
              value={frame.position_x}
              onChange={(event) =>
                onChange({
                  ...current,
                  frame: { ...frame, position_x: event.target.value as CategoryCmsImageFrame["position_x"] },
                })
              }
            >
              <option value="left">Links</option>
              <option value="center">Midden</option>
              <option value="right">Rechts</option>
            </select>
          </label>
          <label className="text-sm text-wf-800">
            Verticaal
            <select
              className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5"
              value={frame.position_y}
              onChange={(event) =>
                onChange({
                  ...current,
                  frame: { ...frame, position_y: event.target.value as CategoryCmsImageFrame["position_y"] },
                })
              }
            >
              <option value="top">Boven</option>
              <option value="center">Midden</option>
              <option value="bottom">Onder</option>
            </select>
          </label>
        </div>
      ) : null}
      {preview && showFrame ? (
        frame.ratio === "original" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="max-h-40 w-full rounded-lg border border-wf-200 bg-wf-100 object-contain"
            style={{ objectPosition: `${frame.position_x} ${frame.position_y}` }}
          />
        ) : (
          <div
            className="relative overflow-hidden rounded-lg border border-wf-200 bg-wf-100"
            style={{ aspectRatio: aspect(frame.ratio) }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt=""
              className="absolute inset-0 h-full w-full"
              style={{
                objectFit: frame.fit,
                objectPosition: `${frame.position_x} ${frame.position_y}`,
              }}
            />
          </div>
        )
      ) : null}
    </div>
  )
}

export function imageFromHeroDesktop(block: {
  image_url: string | null
  image_asset_id?: string | null
  image_alt?: CategoryCmsLocalized
  image_frame?: CategoryCmsImageFrame
}): CategoryCmsImage {
  return {
    asset_id: block.image_asset_id,
    url: block.image_url,
    alt: block.image_alt,
    frame: block.image_frame,
  }
}
