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
  onUploaded,
  placement = "cms_banner",
  onError,
  previewFit = "cover",
  previewRatio,
}: {
  label: string
  url: string | null
  hint?: string
  /** Recommended size / aspect derived from the real storefront frame. */
  advice?: string
  large?: boolean
  onChange: (url: string | null) => void
  onUploaded?: (asset: { id: string; url: string }) => void
  placement?: MediaPlacement | string
  onError?: (message: string | null) => void
  /** How the editor thumbnail should fit the preview box. */
  previewFit?: "cover" | "contain"
  /** CSS aspect-ratio for the preview, for example "2.85 / 1". */
  previewRatio?: string
}) {
  const req = getMediaRequirements(placement as MediaPlacement)
  const accept = mediaAcceptAttribute(req.mimeTypes)
  const formatsHint = `Toegestaan: ${formatAllowedImageTypes(req.mimeTypes)}.`
  const [localError, setLocalError] = useState<string | null>(null)
  const [localOk, setLocalOk] = useState<string | null>(null)

  async function onFile(file: File | null) {
    setLocalError(null)
    setLocalOk(null)
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
      if (onUploaded) onUploaded({ id: uploaded.asset.id, url: uploaded.asset.url })
      else onChange(uploaded.asset.url)
      setLocalOk("Afbeelding geüpload. Sla op als concept om te bewaren.")
      onError?.(null)
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
      {localOk ? (
        <p className="mb-2 text-[12px] text-emerald-800" role="status">
          {localOk}
        </p>
      ) : null}
      {display ? (
        <div className="mb-2 overflow-hidden rounded-xl border border-wf-200 bg-wf-50">
          <div
            className={
              previewRatio
                ? `relative w-full ${
                    previewFit === "contain"
                      ? "bg-[linear-gradient(45deg,#e7e9ee_25%,transparent_25%,transparent_75%,#e7e9ee_75%),linear-gradient(45deg,#e7e9ee_25%,transparent_25%,transparent_75%,#e7e9ee_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px]"
                      : "bg-wf-100"
                  }`
                : undefined
            }
            style={previewRatio ? { aspectRatio: previewRatio } : undefined}
          >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={display}
            alt=""
            className={
              previewRatio
                ? `absolute inset-0 h-full w-full ${
                    previewFit === "contain" ? "object-contain" : "object-cover"
                  }`
                : `w-full ${
                    previewFit === "contain" ? "object-contain" : "object-cover"
                  } ${large ? "max-h-56" : "max-h-36"}`
            }
          />
          </div>
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
