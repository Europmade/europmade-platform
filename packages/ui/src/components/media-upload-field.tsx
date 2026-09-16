"use client"

import * as React from "react"
import type { MediaPlacement } from "@europmade/types"
import {
  formatMediaRequirementSummary,
  getMediaRequirements,
  mediaAcceptAttribute,
  readImageDimensions,
  validateMedia,
} from "@europmade/utils"
import { cn } from "@europmade/utils"
import { FileUpload } from "./file-upload"

export type MediaUploadFieldProps = {
  placement: MediaPlacement
  label: string
  value: File | null
  onChange: (file: File | null) => void
  error?: string
  id?: string
  /** Override summary language bits; default Dutch summary from requirements. */
  guidelinesTitle?: string
  transparencyLabels?: Record<string, string>
}

const DEFAULT_TRANSPARENCY: Record<string, string> = {
  required: "transparante achtergrond verplicht",
  recommended: "transparante achtergrond aanbevolen",
  allowed: "transparante achtergrond toegestaan",
  "n/a": "niet van toepassing",
}

/**
 * Herbruikbare upload met centrale MEDIA_REQUIREMENTS + ⓘ details.
 */
export function MediaUploadField({
  placement,
  label,
  value,
  onChange,
  error,
  id,
  guidelinesTitle = "Afbeeldingsrichtlijnen",
  transparencyLabels = DEFAULT_TRANSPARENCY,
}: MediaUploadFieldProps) {
  const req = getMediaRequirements(placement)
  const [open, setOpen] = React.useState(false)
  const [localError, setLocalError] = React.useState<string | null>(null)
  const summary = formatMediaRequirementSummary(req)

  const handleChange = async (file: File | null) => {
    setLocalError(null)
    if (!file) {
      onChange(null)
      return
    }
    const dims = await readImageDimensions(file)
    const result = validateMedia({
      placement,
      mimeType: file.type,
      sizeBytes: file.size,
      width: dims?.width,
      height: dims?.height,
      hasAlpha: null,
      fileName: file.name,
    })
    if (!result.ok) {
      setLocalError(result.message)
      onChange(null)
      return
    }
    onChange(file)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-semibold text-wf-900">{label}</span>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-wf-300 text-[11px] font-bold text-wf-600 hover:bg-wf-50"
          aria-label={guidelinesTitle}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          ⓘ
        </button>
      </div>
      <p className="text-xs text-wf-600">{summary}</p>
      {open ? (
        <div
          className={cn(
            "rounded-lg border border-wf-200 bg-wf-50 px-3 py-2 text-xs text-wf-700"
          )}
          role="region"
          aria-label={guidelinesTitle}
        >
          <p className="font-semibold text-wf-900">{guidelinesTitle}</p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
            {req.recommendedSize ? (
              <li>
                Aanbevolen: {req.recommendedSize.width} ×{" "}
                {req.recommendedSize.height} px
              </li>
            ) : null}
            {req.minSize ? (
              <li>
                Minimum: {req.minSize.width} × {req.minSize.height} px
              </li>
            ) : null}
            {req.maxSize ? (
              <li>
                Maximum: {req.maxSize.width} × {req.maxSize.height} px
              </li>
            ) : null}
            {req.aspectRatio ? <li>Verhouding: {req.aspectRatio}</li> : null}
            <li>Maximaal: {Math.round(req.maxBytes / (1024 * 1024))} MB</li>
            <li>Formaat: {summary.split(" · ").slice(-1)[0]}</li>
            <li>
              Achtergrond:{" "}
              {transparencyLabels[req.transparency] ?? req.transparency}
            </li>
            {req.maxVideoDurationSec != null ? (
              <li>Max. videoduur: {req.maxVideoDurationSec}s</li>
            ) : null}
            {req.notes ? <li>{req.notes}</li> : null}
          </ul>
        </div>
      ) : null}
      <FileUpload
        id={id}
        label={label}
        requirementLabel={summary}
        value={value}
        onChange={handleChange}
        error={error ?? localError ?? undefined}
        accept={mediaAcceptAttribute(req.mimeTypes)}
        maxSizeBytes={req.maxBytes}
      />
    </div>
  )
}
