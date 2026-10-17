"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { Button, Notice } from "@europmade/ui"
import { CmsLocaleToolbar } from "./cms-locale-toolbar"
import { CmsStatusBadge } from "./cms-preview-frame"

export type CmsViewport = "desktop" | "tablet" | "mobile"

export type CmsStructureItem = {
  id: string
  label: string
  hint?: string
  visible?: boolean
  locked?: boolean
}

export function CmsEditorShell({
  breadcrumb,
  title,
  templateLabel,
  published,
  statusExtra,
  busy,
  error,
  ok,
  viewport,
  onViewport,
  onSaveDraft,
  onPublish,
  structure,
  selectedId,
  onSelect,
  onMove,
  onToggleVisible,
  onRemove,
  onAddSection,
  addLabel = "+ Sectie toevoegen",
  childrenPreview,
  childrenSettings,
  onOpenPreview,
  previewScale,
  onPreviewScale,
}: {
  breadcrumb: ReactNode
  title: string
  templateLabel: string
  published: boolean
  /** Extra status, for example a saved concept while the live page stays online. */
  statusExtra?: string
  busy: boolean
  error: string | null
  ok: string | null
  viewport: CmsViewport
  onViewport: (v: CmsViewport) => void
  onSaveDraft: () => void
  onPublish: () => void
  structure: CmsStructureItem[]
  selectedId: string
  onSelect: (id: string) => void
  onMove?: (id: string, dir: -1 | 1) => void
  onToggleVisible?: (id: string) => void
  onRemove?: (id: string) => void
  onAddSection?: () => void
  addLabel?: string
  childrenPreview: ReactNode
  childrenSettings: ReactNode
  onOpenPreview?: () => void
  previewScale?: "fit" | "100"
  onPreviewScale?: (v: "fit" | "100") => void
}) {
  return (
    <div className="flex h-[calc(100vh-53px)] min-h-[560px] flex-col bg-wf-100">
      <header className="sticky top-0 z-20 shrink-0 border-b border-wf-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 tablet:px-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
              {breadcrumb}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[16px] font-bold text-wf-950">{title}</h1>
              <span className="rounded-full border border-wf-200 bg-wf-50 px-2 py-0.5 text-[10px] font-semibold text-wf-600">
                {templateLabel}
              </span>
              <CmsStatusBadge published={published} extra={statusExtra} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-wf-200 bg-wf-50 p-0.5">
              {(["desktop", "tablet", "mobile"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onViewport(v)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                    viewport === v ? "bg-wf-900 text-white" : "text-wf-600"
                  }`}
                >
                  {v === "desktop" ? "Desktop" : v === "tablet" ? "Tablet" : "Mobiel"}
                </button>
              ))}
            </div>
            {onPreviewScale ? (
              <div className="flex rounded-lg border border-wf-200 bg-wf-50 p-0.5">
                {(["100", "fit"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onPreviewScale(v)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                      previewScale === v ? "bg-wf-900 text-white" : "text-wf-600"
                    }`}
                  >
                    {v === "100" ? "100%" : "Fit"}
                  </button>
                ))}
              </div>
            ) : null}
            {onOpenPreview ? (
              <button
                type="button"
                onClick={onOpenPreview}
                className="rounded-lg border border-wf-200 px-2.5 py-1 text-[11px] font-semibold text-wf-700"
              >
                Preview in nieuw venster
              </button>
            ) : null}
            <Button variant="secondary" disabled={busy} onClick={onSaveDraft}>
              Opslaan als concept
            </Button>
            <Button disabled={busy} onClick={onPublish}>
              Publiceren
            </Button>
          </div>
        </div>
        <div className="border-t border-wf-100 px-3 py-2 tablet:px-4">
          <CmsLocaleToolbar compact />
        </div>
        {error ? (
          <div className="px-3 pb-2 tablet:px-4">
            <Notice variant="warning">{error}</Notice>
          </div>
        ) : null}
        {ok ? (
          <div className="px-3 pb-2 tablet:px-4">
            <Notice variant="info">{ok}</Notice>
          </div>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[250px] shrink-0 overflow-y-auto border-r border-wf-200 bg-white desktop:block">
          <p className="px-3 pt-3 text-[10px] font-semibold uppercase tracking-wide text-wf-400">
            Pagina-opbouw
          </p>
          <ul className="space-y-0.5 p-2">
            {structure.map((item) => {
              const selected = item.id === selectedId
              return (
                <li key={item.id}>
                  <div
                    className={`flex items-center gap-1 rounded-lg px-1.5 py-1.5 ${
                      selected ? "bg-sky-50 ring-1 ring-sky-300" : "hover:bg-wf-50"
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onSelect(item.id)}
                    >
                      <p className="truncate text-[12.5px] font-semibold text-wf-900">
                        {item.label}
                      </p>
                      {item.hint ? (
                        <p className="truncate text-[10px] text-wf-500">{item.hint}</p>
                      ) : null}
                    </button>
                    {onToggleVisible && item.visible != null ? (
                      <button
                        type="button"
                        title={item.visible ? "Verbergen" : "Tonen"}
                        className="rounded px-1 text-[11px] text-wf-500"
                        onClick={() => onToggleVisible(item.id)}
                      >
                        {item.visible ? "◉" : "○"}
                      </button>
                    ) : null}
                    {onMove && !item.locked ? (
                      <>
                        <button
                          type="button"
                          className="rounded px-1 text-[11px] text-wf-500"
                          onClick={() => onMove(item.id, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded px-1 text-[11px] text-wf-500"
                          onClick={() => onMove(item.id, 1)}
                        >
                          ↓
                        </button>
                      </>
                    ) : null}
                    {onRemove && !item.locked ? (
                      <button
                        type="button"
                        className="rounded px-1 text-[11px] text-wf-400 hover:text-red-600"
                        onClick={() => onRemove(item.id)}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
          {onAddSection ? (
            <div className="px-3 pb-4">
              <button
                type="button"
                onClick={onAddSection}
                className="w-full rounded-lg border border-dashed border-sky-300 px-3 py-2 text-left text-[12px] font-semibold text-sky-700 hover:bg-sky-50"
              >
                {addLabel}
              </button>
            </div>
          ) : null}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-wf-100 p-3 tablet:p-4">
          <div className="mb-2 desktop:hidden">
            <label className="text-[11px] font-semibold text-wf-600">
              Sectie
              <select
                className="mt-1 w-full rounded-lg border border-wf-300 bg-white px-2 py-1.5 text-sm"
                value={selectedId}
                onChange={(e) => onSelect(e.target.value)}
              >
                {structure.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">{childrenPreview}</div>
        </div>

        <aside className="hidden w-[380px] shrink-0 overflow-y-auto border-l border-wf-200 bg-white desktop:block">
          <div className="sticky top-0 border-b border-wf-100 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-wf-400">
              Instellingen
            </p>
            <p className="text-sm font-bold text-wf-900">
              {structure.find((s) => s.id === selectedId)?.label ?? "Sectie"}
            </p>
          </div>
          <div className="space-y-4 px-4 py-4">{childrenSettings}</div>
        </aside>
      </div>

      <div className="border-t border-wf-200 bg-white p-3 desktop:hidden">
        <p className="mb-2 text-[10px] font-semibold uppercase text-wf-400">Instellingen</p>
        {childrenSettings}
        {onAddSection ? (
          <Button type="button" variant="secondary" className="mt-3" onClick={onAddSection}>
            {addLabel}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function CmsBreadcrumb({
  items,
}: {
  items: Array<{ href?: string; label: string }>
}) {
  return (
    <>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`}>
          {i > 0 ? " / " : null}
          {item.href ? (
            <Link href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ) : (
            item.label
          )}
        </span>
      ))}
    </>
  )
}
