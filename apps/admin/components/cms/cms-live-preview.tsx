"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  CMS_PREVIEW_SOURCE,
  type CmsPreviewDraftMessage,
  type CmsPreviewKind,
  type CmsThemeDocument,
} from "@europmade/utils"
import type { CmsViewport } from "./cms-editor-shell"

import { storefrontOrigin } from "../../lib/medusa-backend-url"

const VIEWPORT_PX: Record<CmsViewport, number> = {
  desktop: 1160,
  tablet: 834,
  mobile: 390,
}

export function CmsLivePreview({
  kind,
  path,
  viewport,
  locale,
  selectedId,
  document,
  banners,
  paidSlots,
  theme,
  slug,
  onSelect,
  previewScale = "fit",
}: {
  kind: CmsPreviewKind
  path: string
  viewport: CmsViewport
  locale: "nl" | "en" | "de" | "fr"
  selectedId: string
  document: unknown
  banners?: unknown[]
  paidSlots?: unknown[]
  theme: CmsThemeDocument | null
  slug?: string
  onSelect: (id: string) => void
  previewScale?: "fit" | "100"
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const webOrigin = storefrontOrigin()
  const src = `${webOrigin}${path}`

  const payload: CmsPreviewDraftMessage = useMemo(
    () => ({
      source: CMS_PREVIEW_SOURCE,
      type: "draft",
      kind,
      locale,
      selectedId,
      theme,
      document,
      banners,
      paidSlots,
      slug,
    }),
    [banners, document, kind, locale, paidSlots, selectedId, slug, theme]
  )
  const payloadRef = useRef(payload)
  payloadRef.current = payload

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== webOrigin && event.origin !== "http://127.0.0.1:3000") {
        return
      }
      const data = event.data as { source?: string; type?: string; selectedId?: string }
      if (data?.source !== CMS_PREVIEW_SOURCE) return
      if (data.type === "ready") {
        // Always push the latest draft when the iframe signals readiness.
        // iframe.onLoad alone is too early (React in the child may not listen yet);
        // a second ready with ready already true would otherwise be a no-op.
        setReady(true)
        iframeRef.current?.contentWindow?.postMessage(
          payloadRef.current,
          webOrigin
        )
      }
      if (data.type === "select" && typeof data.selectedId === "string") {
        onSelect(data.selectedId)
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [onSelect, webOrigin])

  useEffect(() => {
    if (!ready) return
    iframeRef.current?.contentWindow?.postMessage(payload, webOrigin)
  }, [payload, ready, webOrigin])

  const width = VIEWPORT_PX[viewport]
  const openHref = `${src}?cms_preview=1`

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
          Storefront-preview · {viewport} · concept in deze editor
        </p>
        <a
          href={openHref}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-semibold text-sky-700 hover:underline"
        >
          Preview-route in nieuw venster
        </a>
      </div>
      <p className="mb-2 shrink-0 text-[11px] leading-snug text-wf-500">
        De preview toont de echte storefront-layout met conceptgegevens. Niet
        pixel-perfect. Een nieuw venster laadt de preview-route zonder wat je
        nét getypt hebt maar nog niet is doorgestuurd.
      </p>
      {/* Fill the editor column exactly once; scroll happens inside the iframe. */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-wf-200 bg-wf-200/80 p-2">
        <div
          className="mx-auto h-full origin-top overflow-hidden bg-white shadow-md"
          style={{
            width,
            maxWidth: previewScale === "fit" ? "100%" : width,
          }}
        >
          <iframe
            ref={iframeRef}
            title="CMS storefront preview"
            src={src}
            className="h-full w-full border-0"
            onLoad={() => {
              iframeRef.current?.contentWindow?.postMessage(
                payloadRef.current,
                webOrigin
              )
            }}
          />
        </div>
      </div>
    </div>
  )
}
