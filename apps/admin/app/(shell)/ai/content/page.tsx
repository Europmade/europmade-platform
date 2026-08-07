"use client"

import { useCallback, useEffect, useState } from "react"
import { Button, Notice } from "@europmade/ui"

const STOREFRONT =
  process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000"

type AiDocSummary = {
  entityId: string
  generationStatus: string
  lastGenerated: string | null
  promptVersion: string
  generatedBy: string
  published: boolean
  errorMessage?: string | null
}

type ListResponse = {
  documents: Array<{
    entityId: string
    generationStatus: string
    lastGenerated: string | null
    promptVersion: string
    generatedBy: string
    published: boolean
    errorMessage?: string | null
  }>
  providers: { id: string; label: string; configured: boolean }[]
  entitiesEnabled: string[]
  entitiesSprint4: string[]
}

/**
 * AI Content CMS — generate / regenerate / translations / publish.
 * Calls storefront AI Content Engine API (offline-first, ADR-0036).
 */
export default function AiContentAdminPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [selected, setSelected] = useState("elektronica")
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`${STOREFRONT}/api/ai-content`, {
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`Laden mislukt (${res.status})`)
      const json = (await res.json()) as ListResponse
      setData(json)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "AI Content API niet bereikbaar (start storefront)."
      )
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function runAction(
    action: "generate" | "regenerate" | "translations" | "publish" | "preview",
    entityId: string
  ) {
    setBusy(`${action}:${entityId}`)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch(
        `${STOREFRONT}/api/ai-content/category/${encodeURIComponent(entityId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      )
      const json = (await res.json()) as { error?: string; document?: AiDocSummary }
      if (!res.ok) throw new Error(json.error ?? `Actie mislukt (${res.status})`)
      setMessage(
        `${action} · ${entityId} · ${json.document?.generationStatus ?? "ok"} · ${json.document?.generatedBy ?? ""}`
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Actie mislukt")
    } finally {
      setBusy(null)
    }
  }

  async function seedAll() {
    setBusy("seed")
    setMessage(null)
    setError(null)
    try {
      const res = await fetch(`${STOREFRONT}/api/ai-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      })
      const json = (await res.json()) as { count?: number; error?: string }
      if (!res.ok) throw new Error(json.error ?? "Seed mislukt")
      setMessage(`Seed voltooid · ${json.count ?? 0} categorieën`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seed mislukt")
    } finally {
      setBusy(null)
    }
  }

  if (error && !data) {
    return (
      <div>
        <h1 className="text-[19px] font-bold text-wf-900">AI Content Engine</h1>
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
        <p className="mt-3 text-xs text-wf-600">
          Zet <code>NEXT_PUBLIC_STOREFRONT_URL</code> (nu {STOREFRONT}) en start
          de marketplace-frontend.
        </p>
        <Button className="mt-3" onClick={() => void load()}>
          Opnieuw proberen
        </Button>
      </div>
    )
  }

  if (!data) {
    return <p className="text-xs text-wf-600">AI Content laden…</p>
  }

  const docs = data.documents

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        AI Content &gt; <b className="font-semibold text-wf-800">Categorieën</b>
      </p>
      <h1 className="text-[19px] font-bold text-wf-900">AI Content Engine</h1>
      <p className="mb-4 mt-1.5 max-w-2xl text-xs text-wf-600">
        Offline-first CMS (ADR-0036). Generatie via jobs/admin — nooit tijdens
        page load. Providers:{" "}
        {data.providers.map((p) => p.id).join(", ")}. Sprint 4-entiteiten:{" "}
        {data.entitiesSprint4.join(", ")}.
      </p>

      {error ? (
        <Notice variant="warning" className="mb-3">
          {error}
        </Notice>
      ) : null}
      {message ? (
        <Notice variant="info" className="mb-3">
          {message}
        </Notice>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        <Button
          disabled={busy != null}
          onClick={() => void seedAll()}
        >
          {busy === "seed" ? "Seeden…" : "Seed / genereer alle"}
        </Button>
        <Button variant="secondary" disabled={busy != null} onClick={() => void load()}>
          Vernieuwen
        </Button>
      </div>

      <div className="mb-6 rounded-xl border border-wf-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-[12px] font-bold text-wf-900">
          Categorie
        </label>
        <select
          className="mb-3 h-9 w-full max-w-sm rounded-xl border border-wf-300 px-2.5 text-[12.5px]"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {["elektronica", "tuin", "wonen", "mode", "voeding", "schoenen", "sport", "keuken"].map(
            (s) => (
              <option key={s} value={s}>
                {s}
              </option>
            )
          )}
        </select>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={busy != null}
            onClick={() => void runAction("generate", selected)}
          >
            Genereer AI-content
          </Button>
          <Button
            variant="secondary"
            disabled={busy != null}
            onClick={() => void runAction("regenerate", selected)}
          >
            Opnieuw genereren
          </Button>
          <Button
            variant="secondary"
            disabled={busy != null}
            onClick={() => void runAction("translations", selected)}
          >
            Vertalingen opnieuw
          </Button>
          <Button
            variant="secondary"
            disabled={busy != null}
            onClick={() => void runAction("preview", selected)}
          >
            Preview
          </Button>
          <Button
            variant="secondary"
            disabled={busy != null}
            onClick={() => void runAction("publish", selected)}
          >
            Publiceren
          </Button>
        </div>
      </div>

      <h2 className="mb-2 text-[14px] font-bold text-wf-900">
        Opgeslagen documenten ({docs.length})
      </h2>
      <div className="overflow-x-auto rounded-xl border border-wf-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-[12px]">
          <thead className="border-b border-wf-100 bg-wf-50 text-wf-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Entity</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Provider</th>
              <th className="px-3 py-2 font-semibold">Prompt</th>
              <th className="px-3 py-2 font-semibold">Generated</th>
              <th className="px-3 py-2 font-semibold">Published</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.entityId} className="border-b border-wf-50">
                <td className="px-3 py-2 font-semibold text-wf-900">
                  {d.entityId}
                </td>
                <td className="px-3 py-2">{d.generationStatus}</td>
                <td className="px-3 py-2">{d.generatedBy}</td>
                <td className="px-3 py-2">{d.promptVersion}</td>
                <td className="px-3 py-2">
                  {d.lastGenerated
                    ? new Date(d.lastGenerated).toLocaleString("nl-NL")
                    : "—"}
                </td>
                <td className="px-3 py-2">{d.published ? "ja" : "nee"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
