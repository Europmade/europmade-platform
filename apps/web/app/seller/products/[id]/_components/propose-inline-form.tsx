"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Button } from "@europmade/ui"

type Props = {
  sectionLabel: string
  proposedValue: string
  toelichting: string
  busy: boolean
  onProposedValueChange: (v: string) => void
  onToelichtingChange: (v: string) => void
  onSubmit: (e: FormEvent) => void
  onCancel: () => void
  /** Optional media staging controls */
  mediaMode?: boolean
  onFileChange?: (file: File | null) => void
  stagedRefs?: string[]
  uploadBusy?: boolean
  /** Absolute/relative preview URLs for staged uploads */
  stagedPreviewUrls?: string[]
}

export function ProposeInlineForm(props: Props) {
  const {
    sectionLabel,
    proposedValue,
    toelichting,
    busy,
    onProposedValueChange,
    onToelichtingChange,
    onSubmit,
    onCancel,
    mediaMode,
    onFileChange,
    stagedRefs,
    uploadBusy,
    stagedPreviewUrls,
  } = props

  const [localPreview, setLocalPreview] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 space-y-2 rounded border border-wf-900 bg-wf-50/50 p-3"
    >
      <p className="text-[11px] font-semibold text-wf-900">
        Wijziging voorstellen — {sectionLabel}
      </p>
      {mediaMode ? (
        <>
          <label className="block text-xs text-wf-600">
            Voorgestelde afbeelding (JPG, PNG, WebP, AVIF)
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
              className="mt-1 block w-full text-xs"
              disabled={uploadBusy || busy}
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                e.target.value = ""
                if (localPreview) {
                  URL.revokeObjectURL(localPreview)
                  setLocalPreview(null)
                }
                if (file) {
                  setLocalPreview(URL.createObjectURL(file))
                }
                onFileChange?.(file)
              }}
            />
          </label>
          {(localPreview ||
            (stagedPreviewUrls && stagedPreviewUrls.length > 0)) && (
            <div className="flex flex-wrap gap-2">
              {localPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={localPreview}
                  alt="Lokale preview"
                  className="h-24 w-24 rounded border border-wf-300 object-cover"
                />
              ) : null}
              {(stagedPreviewUrls || []).map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt="Voorgestelde media"
                  className="h-24 w-24 rounded border border-wf-300 object-cover"
                />
              ))}
            </div>
          )}
          {stagedRefs && stagedRefs.length > 0 ? (
            <p className="text-[10px] text-emerald-700">
              {stagedRefs.length} afbeelding(en) klaar voor voorstel (nog niet
              live).
            </p>
          ) : null}
          {uploadBusy ? (
            <p className="text-[10px] text-wf-600">Uploaden…</p>
          ) : null}
        </>
      ) : (
        <label className="block text-xs text-wf-600">
          Voorgestelde waarde
          <textarea
            className="mt-1 w-full rounded border border-wf-300 bg-white px-2 py-1.5 text-sm"
            rows={3}
            value={proposedValue}
            onChange={(e) => onProposedValueChange(e.target.value)}
            required
          />
        </label>
      )}
      <label className="block text-xs text-wf-600">
        Toelichting
        <textarea
          className="mt-1 w-full rounded border border-wf-300 bg-white px-2 py-1.5 text-sm"
          rows={2}
          value={toelichting}
          onChange={(e) => onToelichtingChange(e.target.value)}
          required
          placeholder={
            mediaMode
              ? "Waarom deze afbeelding? (verplicht)"
              : "Toelichting bij het voorstel"
          }
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy || uploadBusy}>
          {busy ? "Indienen…" : "Voorstel indienen"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onCancel}
          disabled={busy}
        >
          Annuleren
        </Button>
      </div>
    </form>
  )
}
