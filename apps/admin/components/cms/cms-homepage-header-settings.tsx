"use client"

import {
  DEFAULT_CMS_HEADER,
  headerWithBackground,
  type CmsThemeDocument,
  type CmsThemeHeader,
} from "@europmade/utils"
import { CmsImageField } from "./cms-image-field"
import { displayMediaUrl } from "../../lib/media-url"

function pickerHex(value: string, fallback: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
  }
  return fallback
}

function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string
  value: string
  fallback: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-sm font-semibold text-wf-900">
      {label}
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-12 cursor-pointer rounded border border-wf-300 bg-white p-0.5"
          value={pickerHex(value, fallback)}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        />
        <input
          type="text"
          className="h-9 w-full rounded border border-wf-400 bg-white px-2 font-mono text-xs font-normal"
          value={value}
          onChange={(e) => {
            const next = e.target.value.trim()
            if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(next)) return
            onChange(next)
          }}
          spellCheck={false}
        />
      </div>
    </label>
  )
}

function SizeField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block text-sm font-semibold text-wf-900">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        className="mt-1.5 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm font-normal"
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value)
          if (!Number.isFinite(next)) return
          onChange(Math.min(max, Math.max(min, Math.round(next))))
        }}
      />
    </label>
  )
}

/**
 * Homepage CMS — header chrome (stored on the sitewide theme document).
 */
export function CmsHomepageHeaderSettings({
  theme,
  onChange,
  onError,
}: {
  theme: CmsThemeDocument
  onChange: (next: CmsThemeDocument) => void
  onError?: (message: string) => void
}) {
  const header = theme.header ?? DEFAULT_CMS_HEADER
  const logoUrl = displayMediaUrl(header.logo)

  function patch(partial: Partial<CmsThemeHeader>) {
    onChange({ ...theme, header: { ...header, ...partial } })
  }

  return (
    <div className="space-y-4 text-sm text-wf-700">
      <div>
        <p className="font-semibold text-wf-900">Header</p>
        <p className="mt-1 text-[12px] text-wf-500">
          Kleuren en groottes gelden voor logo, zoeken, navigatie, categorieën,
          taal, valuta en iconen. De preview werkt direct. De live storefront
          volgt pas na publiceren.
        </p>
      </div>

      <CmsImageField
        label="Logo"
        url={logoUrl}
        placement="cms_site_logo"
        previewFit="contain"
        advice="Aanbevolen ~480 × 120 px (of SVG). PNG, SVG of WebP. Transparante achtergrond aanbevolen."
        onChange={(url) => patch({ logo: url })}
        onError={onError}
      />
      <SizeField
        label="Logohoogte (px)"
        value={header.logoHeight}
        min={20}
        max={72}
        onChange={(logoHeight) => patch({ logoHeight })}
      />

      <ColorField
        label="Achtergrondkleur"
        value={header.backgroundColor}
        fallback={DEFAULT_CMS_HEADER.backgroundColor}
        onChange={(backgroundColor) =>
          onChange({
            ...theme,
            header: headerWithBackground(header, backgroundColor),
          })
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ColorField
          label="Tekstkleur"
          value={header.textColor}
          fallback={DEFAULT_CMS_HEADER.textColor}
          onChange={(textColor) => patch({ textColor })}
        />
        <SizeField
          label="Navigatielettergrootte (px)"
          value={header.navFontSize}
          min={10}
          max={24}
          onChange={(navFontSize) => patch({ navFontSize })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ColorField
          label="Categorielinks"
          value={header.categoryColor}
          fallback={DEFAULT_CMS_HEADER.categoryColor}
          onChange={(categoryColor) => patch({ categoryColor })}
        />
        <SizeField
          label="Categorielettergrootte (px)"
          value={header.categoryFontSize}
          min={10}
          max={24}
          onChange={(categoryFontSize) => patch({ categoryFontSize })}
        />
      </div>

      <p className="text-[12px] font-semibold uppercase tracking-wide text-wf-500">
        Zoekbalk
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <ColorField
          label="Achtergrond"
          value={header.searchBackground}
          fallback={DEFAULT_CMS_HEADER.searchBackground}
          onChange={(searchBackground) => patch({ searchBackground })}
        />
        <ColorField
          label="Tekst"
          value={header.searchText}
          fallback={DEFAULT_CMS_HEADER.searchText}
          onChange={(searchText) => patch({ searchText })}
        />
        <ColorField
          label="Rand"
          value={header.searchBorder}
          fallback={DEFAULT_CMS_HEADER.searchBorder}
          onChange={(searchBorder) => patch({ searchBorder })}
        />
        <SizeField
          label="Hoogte (px)"
          value={header.searchHeight}
          min={32}
          max={64}
          onChange={(searchHeight) => patch({ searchHeight })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ColorField
          label="Taalkeuze"
          value={header.localeColor}
          fallback={DEFAULT_CMS_HEADER.localeColor}
          onChange={(localeColor) => patch({ localeColor })}
        />
        <SizeField
          label="Taallettergrootte (px)"
          value={header.localeFontSize}
          min={10}
          max={20}
          onChange={(localeFontSize) => patch({ localeFontSize })}
        />
        <ColorField
          label="Valuta"
          value={header.currencyColor}
          fallback={DEFAULT_CMS_HEADER.currencyColor}
          onChange={(currencyColor) => patch({ currencyColor })}
        />
        <SizeField
          label="Valutalettergrootte (px)"
          value={header.currencyFontSize}
          min={10}
          max={20}
          onChange={(currencyFontSize) => patch({ currencyFontSize })}
        />
        <ColorField
          label="Icoonkleur"
          value={header.iconColor}
          fallback={DEFAULT_CMS_HEADER.iconColor}
          onChange={(iconColor) => patch({ iconColor })}
        />
        <SizeField
          label="Icoongrootte (px)"
          value={header.iconSize}
          min={16}
          max={40}
          onChange={(iconSize) => patch({ iconSize })}
        />
      </div>

      <div className="rounded-lg border border-wf-200 bg-wf-50 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-wf-500">
          Voorbeeld
        </p>
        <div
          className="overflow-hidden rounded-md border border-wf-200"
          style={{ backgroundColor: header.backgroundColor, color: header.textColor }}
        >
          <div className="flex items-center gap-3 px-3 py-2.5">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="w-auto max-w-[140px] object-contain"
                style={{ height: header.logoHeight }}
              />
            ) : (
              <span
                className="font-bold"
                style={{ color: header.textColor, fontSize: 15 }}
              >
                EuropMade
              </span>
            )}
            <span
              className="min-w-0 flex-1 truncate rounded-md border px-2"
              style={{
                backgroundColor: header.searchBackground,
                color: header.searchText,
                borderColor: header.searchBorder,
                height: header.searchHeight,
                lineHeight: `${header.searchHeight}px`,
                fontSize: 13,
              }}
            >
              Zoeken
            </span>
            <span style={{ color: header.localeColor, fontSize: header.localeFontSize }}>
              NL
            </span>
            <span style={{ color: header.currencyColor, fontSize: header.currencyFontSize }}>
              EUR
            </span>
            <span
              className="inline-flex items-center justify-center rounded-full border"
              style={{
                color: header.iconColor,
                borderColor: header.iconColor,
                width: header.iconSize,
                height: header.iconSize,
                fontSize: 11,
              }}
              aria-hidden
            >
              ○
            </span>
          </div>
          <div
            className="flex gap-4 px-3 pb-2"
            style={{ color: header.textColor, fontSize: header.navFontSize }}
          >
            <span>Navigatie</span>
            <span style={{ color: header.categoryColor, fontSize: header.categoryFontSize }}>
              Categorie
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
