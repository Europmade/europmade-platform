"use client"

import { useEffect, useRef, useState } from "react"
import {
  formatAllowedImageTypes,
  getMediaRequirements,
  mediaAcceptAttribute,
  persistMediaReference,
  readImageDimensions,
  validateMedia,
} from "@europmade/utils"
import { Button } from "@europmade/ui"
import {
  deleteCommercialNavIcon,
  listCommercialNavIcons,
  saveCommercialNavIcon,
  uploadCmsMedia,
  type CommercialNavIconDto,
} from "../../lib/cms-admin-api"
import { displayMediaUrl } from "../../lib/media-url"

const HINT =
  "PNG of WebP. Aanbevolen: 256 × 256 px, vierkant. Duidelijke, contrastrijke lijntekening. Maximaal 500 KB. SVG is niet beschikbaar omdat de media-pipeline geen veilige SVG-sanitizer heeft. Niet-vierkante bestanden worden in een vierkant vlak geplaatst zonder uitrekken."

export function CommercialNavIconsSettings() {
  const req = getMediaRequirements("commercial_nav_icon")
  const accept = mediaAcceptAttribute(req.mimeTypes)
  const [icons, setIcons] = useState<CommercialNavIconDto[]>([])
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function reload() {
    const body = await listCommercialNavIcons()
    setIcons(body.icons)
  }

  useEffect(() => {
    let cancelled = false
    listCommercialNavIcons()
      .then((body) => {
        if (!cancelled) setIcons(body.icons)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Iconen laden mislukt.")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function onFile(key: string, file: File | null) {
    setError(null)
    setOk(null)
    if (!file) return
    setBusyKey(key)
    try {
      const dims = await readImageDimensions(file)
      const validation = validateMedia({
        placement: "commercial_nav_icon",
        mimeType: file.type,
        sizeBytes: file.size,
        width: dims?.width,
        height: dims?.height,
        fileName: file.name,
      })
      if (!validation.ok) {
        setError(validation.message)
        return
      }
      const uploaded = await uploadCmsMedia(file, "commercial_nav_icon")
      const ref = persistMediaReference(uploaded.asset.url)
      if (!ref) {
        setError("Upload is gelukt, maar er is geen geldige media-referentie.")
        return
      }
      await saveCommercialNavIcon(key, ref)
      await reload()
      setOk("Icoon opgeslagen.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload mislukt.")
    } finally {
      setBusyKey(null)
    }
  }

  async function onDelete(key: string) {
    setError(null)
    setOk(null)
    setBusyKey(key)
    try {
      await deleteCommercialNavIcon(key)
      await reload()
      setOk("Icoon verwijderd.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verwijderen mislukt.")
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-wf-300 bg-white p-4">
      <h2 className="text-sm font-bold text-wf-900">Categorie-icoon</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-wf-600">{HINT}</p>
      <p className="mt-1 text-[11px] text-wf-500">
        Aanbevolen: 256 × 256 px, vierkant. Toegestane formaten:{" "}
        {formatAllowedImageTypes(req.mimeTypes)}. Maximaal 500 KB. Duidelijke,
        contrastrijke afbeelding. Iconen horen bij de commerciële
        navigatiekeys, niet bij Product Cloud-producten.
      </p>
      {error ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="mt-2 text-xs text-emerald-800" role="status">
          {ok}
        </p>
      ) : null}
      {loading ? (
        <p className="mt-3 text-xs text-wf-500">Iconen laden…</p>
      ) : (
        <ul className="mt-4 divide-y divide-wf-200">
          {icons.map((row) => {
            const preview = displayMediaUrl(row.icon_url || row.storage_reference)
            const busy = busyKey === row.key
            return (
              <li
                key={row.key}
                className="flex flex-wrap items-center gap-3 py-3"
              >
                <span
                  className="inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-wf-100"
                  aria-hidden
                >
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-wf-400">—</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-wf-900">{row.name}</p>
                  <p className="text-[11px] text-wf-500">
                    key/slug: <code>{row.slug}</code>
                  </p>
                  <p className="text-[11px] text-wf-500">
                    {row.has_icon
                      ? "Actief icoon ingesteld"
                      : "Geen icoon ingesteld"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={(el) => {
                      inputRefs.current[row.key] = el
                    }}
                    type="file"
                    accept={accept}
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      e.target.value = ""
                      void onFile(row.key, file)
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => inputRefs.current[row.key]?.click()}
                  >
                    {row.has_icon ? "Icoon vervangen" : "Icoon uploaden"}
                  </Button>
                  {row.has_icon ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void onDelete(row.key)}
                    >
                      Icoon verwijderen
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
