"use client"

import { DEFAULT_CMS_HEADER, type CmsThemeDocument } from "@europmade/utils"
import { CmsImageField } from "./cms-image-field"
import { displayMediaUrl } from "../../lib/media-url"

/**
 * Homepage CMS — Header chrome settings (stored on the sitewide theme document).
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

  return (
    <div className="space-y-4 text-sm text-wf-700">
      <div>
        <p className="font-semibold text-wf-900">Header</p>
        <p className="mt-1 text-[12px] text-wf-500">
          Sitebreed: logo en achtergrondkleur gelden voor de hele storefront.
          Navigatie, zoeken, taal, valuta, account en winkelwagen blijven
          ongewijzigd.
        </p>
      </div>

      <CmsImageField
        label="Logo"
        url={logoUrl}
        placement="cms_site_logo"
        previewFit="contain"
        advice="Aanbevolen ~480 × 120 px (of SVG). PNG, SVG of WebP. Transparante achtergrond aanbevolen. Wordt zonder vervorming geschaald (object-contain)."
        onChange={(url) =>
          onChange({
            ...theme,
            header: { ...header, logo: url },
          })
        }
        onError={onError}
      />

      <label className="block text-sm font-semibold text-wf-900">
        Achtergrondkleur
        <div className="mt-1.5 flex items-center gap-2">
          <input
            type="color"
            className="h-10 w-12 cursor-pointer rounded border border-wf-300 bg-white p-0.5"
            value={header.backgroundColor || DEFAULT_CMS_HEADER.backgroundColor}
            onChange={(e) =>
              onChange({
                ...theme,
                header: { ...header, backgroundColor: e.target.value },
              })
            }
            aria-label="Header achtergrondkleur"
          />
          <input
            type="text"
            className="h-9 flex-1 rounded border border-wf-400 bg-white px-2 font-mono text-xs"
            value={header.backgroundColor || DEFAULT_CMS_HEADER.backgroundColor}
            onChange={(e) => {
              const v = e.target.value.trim()
              if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return
              onChange({
                ...theme,
                header: { ...header, backgroundColor: v },
              })
            }}
            spellCheck={false}
          />
          <span
            className="h-9 w-9 shrink-0 rounded border border-wf-300"
            style={{
              backgroundColor:
                header.backgroundColor || DEFAULT_CMS_HEADER.backgroundColor,
            }}
            title={header.backgroundColor}
            aria-hidden
          />
        </div>
      </label>

      <div className="rounded-lg border border-wf-200 bg-wf-50 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-wf-500">
          Voorbeeld
        </p>
        <div
          className="flex items-center gap-3 rounded-md border border-wf-200 px-3 py-2.5"
          style={{
            backgroundColor:
              header.backgroundColor || DEFAULT_CMS_HEADER.backgroundColor,
          }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-7 w-auto max-w-[140px] object-contain"
            />
          ) : (
            <span className="text-[15px] font-bold text-wf-900">
              Europ<span className="text-wf-700">Made</span>
            </span>
          )}
          <span className="ml-auto text-[10px] text-wf-500">Zoeken · Account · Cart</span>
        </div>
      </div>
    </div>
  )
}
