"use client"

import { useEffect, useState } from "react"
import {
  CMS_PREVIEW_SOURCE,
  parseCmsTheme,
  type CmsPreviewDraftMessage,
  type CmsThemeDocument,
} from "@europmade/utils"

export function useCmsPreviewHost() {
  const [draft, setDraft] = useState<CmsPreviewDraftMessage | null>(null)
  const [draftOrigin, setDraftOrigin] = useState<string | null>(null)

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as CmsPreviewDraftMessage | undefined
      if (!data || data.source !== CMS_PREVIEW_SOURCE) return
      if (data.type !== "draft") return
      setDraftOrigin(event.origin)
      setDraft(data)
    }
    window.addEventListener("message", onMessage)

    function announceReady() {
      window.parent?.postMessage(
        { source: CMS_PREVIEW_SOURCE, type: "ready" },
        "*"
      )
    }
    // Parent may attach after first paint; announce immediately and once more shortly after.
    announceReady()
    const retry = window.setTimeout(announceReady, 250)

    return () => {
      window.clearTimeout(retry)
      window.removeEventListener("message", onMessage)
    }
  }, [])

  useEffect(() => {
    const id = draft?.selectedId
    if (!id) return
    const el = document.querySelector(`[data-cms-section="${CSS.escape(id)}"]`)
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [draft?.selectedId])

  const theme: CmsThemeDocument | null = draft?.theme
    ? parseCmsTheme(draft.theme)
    : null

  return { draft, draftOrigin, theme }
}

export function postPreviewSelect(id: string) {
  window.parent?.postMessage(
    { source: CMS_PREVIEW_SOURCE, type: "select", selectedId: id },
    "*"
  )
}
