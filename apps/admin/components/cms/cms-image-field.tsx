"use client"

import { useState } from "react"
import type { MediaPlacement } from "@europmade/types"
import { Button } from "@europmade/ui"
import {
  formatAllowedImageTypes,
  getMediaRequirements,
  mediaAcceptAttribute,
  readImageDimensions,
  validateMedia,
} from "@europmade/utils"
import { uploadCmsMedia } from "../../lib/cms-admin-api"
import { displayMediaUrl } from "../../lib/media-url"

export function CmsImageField({
  label,
  url,
  hint,
  advice,
  large,
  onChange,
  placement = "cms_banner",
  onError,
  previewFit = "cover",
}: {
  label: string
  url: string | null
  hint?: string
  /** Recommended size / aspect derived from the real storefront frame. */
  advice?: string
  large?: boolean
  onChange: (url: string | null) => void
  placement?: MediaPlacement | string
  onError?: (message: string) => void
  /** How the editor thumbnail should fit the preview box. */
  previewFit?: "cover" | "contain"
}) {
  const req = getMediaRequirements(placement as MediaPlacement)
  const accept = mediaAcceptAttribute(req.mimeTypes)
  const formatsHint = `Toegestaan: ${formatAllowedImageTypes(req.mimeTypes)}.`
  const [localError, setLocalError] = useState<string | null>(null)

  async function onFile(file: File | null) {
    setLocalError(null)
    if (!file) {
      onChange(null)
      return
    }
    try {
      const dims = await readImageDimensions(file)
      const validation = validateMedia({
        placement: placement as MediaPlacement,
        mimeType: file.type,
        sizeBytes: file.size,
        width: dims?.width,
        height: dims?.height,
        hasAlpha: null,
        fileName: file.name,
      })
      if (!validation.ok) {
        setLocalError(validation.message)
        onError?.(validation.message)
        return
      }
      const uploaded = await uploadCmsMedia(file, placement)
      onChange(uploaded.asset.url)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload mislukt"
      setLocalError(message)
      onError?.(message)
    }
  }

  const display = displayMediaUrl(url)
  const name = display
    ? decodeURIComponent(display.split("/").pop() ?? "afbeelding")
    : null

  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-wf-800">{label}</p>
      {advice ? (
        <p className="mb-1 text-[11px] font-medium text-wf-700">{advice}</p>
      ) : null}
      {hint ? <p className="mb-1 text-[11px] text-wf-500">{hint}</p> : null}
      <p className="mb-2 text-[11px] text-wf-500">{formatsHint}</p>
      {localError ? (
        <p className="mb-2 text-[12px] text-red-700" role="alert">
          {localError}
        </p>
      ) : null}
      {display ? (
        <div className="mb-2 overflow-hidden rounded-xl border border-wf-200 bg-wf-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={display}
            alt=""
            className={`w-full ${
              previewFit === "contain" ? "object-contain" : "object-cover"
            } ${large ? "max-h-56" : "max-h-36"}`}
          />
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <p className="truncate text-[11px] text-wf-600">{name}</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setLocalError(null)
                onChange(null)
              }}
            >
              Verwijderen
            </Button>
          </div>
        </div>
      ) : (
        <label className="mb-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-wf-300 bg-wf-50 px-3 py-8 text-center hover:border-wf-400">
          <span className="text-sm font-semibold text-wf-800">Afbeelding uploaden</span>
          <span className="mt-1 text-[11px] text-wf-500">
            Sleep of klik · {formatAllowedImageTypes(req.mimeTypes)}
          </span>
          <input
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(e) => {
              const selected = e.target.files?.[0] ?? null
              e.target.value = ""
              void onFile(selected)
            }}
          />
        </label>
      )}
      {display ? (
        <input
          type="file"
          accept={accept}
          className="text-xs"
          onChange={(e) => {
            const selected = e.target.files?.[0] ?? null
            e.target.value = ""
            void onFile(selected)
          }}
        />
      ) : null}
    </div>
  )
}
