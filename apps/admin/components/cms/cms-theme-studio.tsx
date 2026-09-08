"use client"

import { useEffect, useState } from "react"
import { Input } from "@europmade/ui"
import {
  applyCmsThemePreset,
  defaultCmsTheme,
  parseCmsTheme,
  type CmsThemeDocument,
  type CmsThemePreset,
} from "@europmade/utils"
import { getCmsHomepage, getCmsTheme, putCmsTheme } from "../../lib/cms-admin-api"
import {
  CmsBreadcrumb,
  CmsEditorShell,
  type CmsViewport,
} from "./cms-editor-shell"
import { CmsLivePreview } from "./cms-live-preview"
import { CmsLocaleProvider } from "./cms-locale-toolbar"
import { emptyHomepageDocument, normalizeHomepageDocument } from "../../lib/cms-homepage-document"

function Inner() {
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [published, setPublished] = useState(false)
  const [viewport, setViewport] = useState<CmsViewport>("desktop")
  const [selectedId, setSelectedId] = useState("colors")
  const [theme, setTheme] = useState<CmsThemeDocument>(defaultCmsTheme())
  const [homepageDoc, setHomepageDoc] = useState(emptyHomepageDocument())

  useEffect(() => {
    getCmsHomepage()
      .then(({ homepage }) => {
        if (homepage?.document) {
          setHomepageDoc(normalizeHomepageDocument(homepage.document))
        }
      })
      .catch(() => undefined)
    getCmsTheme()
      .then(({ theme: row }) => {
        if (!row) return
        setTheme(parseCmsTheme(row.document))
        setPublished(row.published)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  async function save(nextPublished: boolean) {
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      await putCmsTheme({ document: theme, published: nextPublished })
      setPublished(nextPublished)
      setOk(nextPublished ? "Theme gepubliceerd." : "Theme-concept opgeslagen.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opslaan mislukt")
    } finally {
      setBusy(false)
    }
  }

  const structure = [
    { id: "presets", label: "Presets", locked: true },
    { id: "colors", label: "Kleuren", locked: true },
    { id: "buttons", label: "Buttons", locked: true },
    { id: "cards", label: "Kaarten", locked: true },
    { id: "spacing", label: "Spacing", locked: true },
    { id: "type", label: "Typografie", locked: true },
  ]

  return (
    <CmsEditorShell
      breadcrumb={<CmsBreadcrumb items={[{ href: "/cms", label: "CMS" }, { label: "Design" }]} />}
      title="Design / Theme"
      templateLabel="Centraal"
      published={published}
      busy={busy}
      error={error}
      ok={ok}
      viewport={viewport}
      onViewport={setViewport}
      onSaveDraft={() => void save(false)}
      onPublish={() => void save(true)}
      structure={structure}
      selectedId={selectedId}
      onSelect={setSelectedId}
      childrenPreview={
        <CmsLivePreview
          kind="theme"
          path="/cms-preview/homepage"
          viewport={viewport}
          locale="nl"
          selectedId="hero"
          document={homepageDoc}
          theme={theme}
          onSelect={setSelectedId}
        />
      }
      childrenSettings={
        selectedId === "presets" ? (
          <div className="space-y-2">
            {(["standard", "compact", "modern", "soft"] as CmsThemePreset[]).map((p) => (
              <button
                key={p}
                type="button"
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  theme.preset === p ? "border-sky-400 bg-sky-50" : "border-wf-200"
                }`}
                onClick={() => setTheme(applyCmsThemePreset(p, theme))}
              >
                {p === "standard"
                  ? "Standaard"
                  : p === "compact"
                    ? "Compact"
                    : p === "modern"
                      ? "Modern"
                      : "Zacht"}
              </button>
            ))}
          </div>
        ) : selectedId === "colors" ? (
          <div className="space-y-3">
            {(
              [
                ["primary", "Primaire kleur"],
                ["secondary", "Secundaire kleur"],
                ["accent", "Accentkleur"],
                ["background", "Achtergrond"],
                ["card", "Kaartachtergrond"],
                ["text", "Tekstkleur"],
                ["muted", "Subtiele tekst"],
                ["border", "Borderkleur"],
                ["cta", "CTA kleur"],
                ["link", "Linkkleur"],
                ["hover", "Hoverkleur"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm font-semibold">
                {label}
                <Input
                  className="mt-1"
                  type="color"
                  value={theme.colors[key]}
                  onChange={(e) =>
                    setTheme((t) => ({
                      ...t,
                      colors: { ...t.colors, [key]: e.target.value },
                    }))
                  }
                />
              </label>
            ))}
          </div>
        ) : selectedId === "buttons" ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Vorm</p>
            {(["square", "rounded", "pill"] as const).map((shape) => (
              <label key={shape} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={theme.buttons.shape === shape}
                  onChange={() =>
                    setTheme((t) => ({
                      ...t,
                      buttons: { ...t.buttons, shape },
                    }))
                  }
                />
                {shape === "square" ? "Vierkant" : shape === "rounded" ? "Licht afgerond" : "Rond"}
              </label>
            ))}
            <label className="block text-sm font-semibold">
              Border radius (px)
              <Input
                className="mt-1"
                type="number"
                min={0}
                max={48}
                value={theme.buttons.radius}
                onChange={(e) =>
                  setTheme((t) => ({
                    ...t,
                    buttons: { ...t.buttons, radius: Number(e.target.value) },
                  }))
                }
              />
            </label>
            <p className="text-sm font-semibold">Stijl</p>
            {(["filled", "outline"] as const).map((style) => (
              <label key={style} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={theme.buttons.style === style}
                  onChange={() =>
                    setTheme((t) => ({
                      ...t,
                      buttons: { ...t.buttons, style },
                    }))
                  }
                />
                {style === "filled" ? "Gevuld" : "Outline"}
              </label>
            ))}
          </div>
        ) : selectedId === "cards" ? (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={theme.cards.border}
                onChange={(e) =>
                  setTheme((t) => ({
                    ...t,
                    cards: { ...t.cards, border: e.target.checked },
                  }))
                }
              />
              Border
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={theme.cards.shadow}
                onChange={(e) =>
                  setTheme((t) => ({
                    ...t,
                    cards: { ...t.cards, shadow: e.target.checked },
                  }))
                }
              />
              Shadow
            </label>
            <label className="block text-sm font-semibold">
              Radius
              <Input
                className="mt-1"
                type="number"
                value={theme.cards.radius}
                onChange={(e) =>
                  setTheme((t) => ({
                    ...t,
                    cards: { ...t.cards, radius: Number(e.target.value) },
                  }))
                }
              />
            </label>
          </div>
        ) : selectedId === "spacing" ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Sectie-spacing</p>
            {(["compact", "normal", "relaxed"] as const).map((section) => (
              <label key={section} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={theme.spacing.section === section}
                  onChange={() =>
                    setTheme((t) => ({
                      ...t,
                      spacing: { ...t.spacing, section },
                    }))
                  }
                />
                {section}
              </label>
            ))}
            <p className="text-sm font-semibold">Contentbreedte</p>
            {(["standard", "wide"] as const).map((contentWidth) => (
              <label key={contentWidth} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={theme.spacing.contentWidth === contentWidth}
                  onChange={() =>
                    setTheme((t) => ({
                      ...t,
                      spacing: { ...t.spacing, contentWidth },
                    }))
                  }
                />
                {contentWidth === "standard" ? "Standaard" : "Breed"}
              </label>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Heading-stijl</p>
            {(["bold", "semibold"] as const).map((headingWeight) => (
              <label key={headingWeight} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={theme.typography.headingWeight === headingWeight}
                  onChange={() =>
                    setTheme((t) => ({
                      ...t,
                      typography: { headingWeight },
                    }))
                  }
                />
                {headingWeight}
              </label>
            ))}
          </div>
        )
      }
    />
  )
}

export function CmsThemeStudio() {
  return (
    <CmsLocaleProvider>
      <Inner />
    </CmsLocaleProvider>
  )
}
