"use client"

import type { CampaignCardStyle } from "@europmade/utils"
import { CmsImageField } from "./cms-image-field"
import { CmsHeroCtaStyleFields } from "./cms-hero-style-fields"

const fieldClass =
  "mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm"

function pickerValue(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#151515"
}

export function CmsCampaignCardFields(props: {
  value: CampaignCardStyle
  onChange: (next: CampaignCardStyle) => void
  onError: (message: string) => void
  previewRatio?: string
}) {
  const { value, onChange, onError, previewRatio = "2.4 / 1" } = props

  function patch(partial: Partial<CampaignCardStyle>) {
    onChange({ ...value, ...partial })
  }

  return (
    <div className="space-y-3 rounded-lg border border-wf-200 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-wf-500">
        Logo en tekst over de afbeelding
      </p>
      <CmsImageField
        label="Merklogo"
        url={value.logo}
        advice="PNG of WebP met transparante achtergrond. Het logo wordt niet bijgesneden."
        hint="PNG of WebP."
        previewFit="contain"
        previewRatio={previewRatio}
        placement="campaign_logo"
        onChange={(logo) => patch({ logo })}
        onError={(message) => {
          if (message) onError(message)
        }}
      />
      <label className="block text-sm font-semibold">
        Logobreedte ({value.logoWidth} px)
        <input
          type="range"
          min={48}
          max={220}
          value={value.logoWidth}
          className="mt-1 w-full"
          onChange={(e) => patch({ logoWidth: Number(e.target.value) })}
        />
      </label>
      {value.logo ? (
        <div
          className="flex items-center rounded-lg border border-dashed border-wf-300 p-2"
          style={{
            backgroundImage:
              "linear-gradient(45deg, #e4e4e4 25%, transparent 25%), linear-gradient(-45deg, #e4e4e4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e4e4e4 75%), linear-gradient(-45deg, transparent 75%, #e4e4e4 75%)",
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value.logo}
            alt=""
            className="h-auto object-contain"
            style={{ width: value.logoWidth, maxWidth: "100%" }}
          />
        </div>
      ) : null}
      <div className="grid gap-2 tablet:grid-cols-3">
        <label className="block text-sm font-semibold">
          Positie
          <select
            className={fieldClass}
            value={value.horizontal}
            onChange={(e) =>
              patch({
                horizontal: e.target.value as CampaignCardStyle["horizontal"],
              })
            }
          >
            <option value="left">Links</option>
            <option value="center">Midden</option>
            <option value="right">Rechts</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Verticaal
          <select
            className={fieldClass}
            value={value.vertical}
            onChange={(e) =>
              patch({
                vertical: e.target.value as CampaignCardStyle["vertical"],
              })
            }
          >
            <option value="top">Boven</option>
            <option value="center">Midden</option>
            <option value="bottom">Onder</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Tekstuitlijning
          <select
            className={fieldClass}
            value={value.textAlign}
            onChange={(e) =>
              patch({
                textAlign: e.target.value as CampaignCardStyle["textAlign"],
              })
            }
          >
            <option value="left">Links</option>
            <option value="center">Midden</option>
            <option value="right">Rechts</option>
          </select>
        </label>
      </div>
      <div className="grid gap-2 tablet:grid-cols-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
          Titelkleur
          <input
            type="color"
            aria-label="Titelkleur"
            className="h-9 w-14 cursor-pointer rounded border border-wf-400 bg-white p-1"
            value={pickerValue(value.titleColor)}
            onChange={(e) => patch({ titleColor: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          Beschrijvingskleur
          <input
            type="color"
            aria-label="Beschrijvingskleur"
            className="h-9 w-14 cursor-pointer rounded border border-wf-400 bg-white p-1"
            value={pickerValue(value.descriptionColor)}
            onChange={(e) => patch({ descriptionColor: e.target.value })}
          />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Tekstachtergrond
        <select
          className={fieldClass}
          value={value.overlay}
          onChange={(e) =>
            patch({ overlay: e.target.value as CampaignCardStyle["overlay"] })
          }
        >
          <option value="none">Geen</option>
          <option value="light">Licht, achter de tekst</option>
          <option value="dark">Donker, achter de tekst</option>
        </select>
      </label>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={value.showCta}
            onChange={(e) => patch({ showCta: e.target.checked })}
          />
          Knop tonen
        </label>
        <p className="text-[11px] text-wf-500">
          Uit: de knop verdwijnt. De hele kaart blijft één link naar de ingestelde pagina.
        </p>
        {value.showCta ? (
          <>
            <p className="text-xs font-bold uppercase tracking-wide text-wf-500">
              CTA-knop
            </p>
            <CmsHeroCtaStyleFields
              value={value.cta}
              onChange={(cta) => patch({ cta })}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}
