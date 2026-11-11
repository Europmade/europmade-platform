"use client"

import { useCallback, useEffect, useState } from "react"
import { ProductSectionNav } from "../../../../components/product-cloud/product-section-nav"
import {
  commitBrandImport,
  downloadBrandWorkbook,
  listBrandImportBatches,
  previewBrandImport,
  type BrandColumnLink,
  type BrandPreviewPayload,
} from "../../../../lib/brand-import-admin-api"
import { ProductApprovalAdminApiError } from "../../../../lib/product-approval-admin-api"

const LANGUAGES = [
  { code: "nl", label: "Nederlands" },
  { code: "en", label: "Engels" },
  { code: "de", label: "Duits" },
  { code: "fr", label: "Frans" },
]

const TEXT_FIELDS = new Set([
  "title",
  "description",
  "short_description",
  "usps",
  "specifications",
])

function brandKey(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export default function ProductDeliveriesPage() {
  const [sourceKey, setSourceKey] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState("")
  const [languageConfirmed, setLanguageConfirmed] = useState(false)
  const [enqueue, setEnqueue] = useState(false)
  const [links, setLinks] = useState<BrandColumnLink[]>([])
  const [preview, setPreview] = useState<BrandPreviewPayload | null>(null)
  const [batches, setBatches] = useState<
    Array<{ id: string; source_key: string; status: string; file_name: string | null; summary: { error_rows?: number; new_products?: number } | null }>
  >([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [brandChoices, setBrandChoices] = useState<
    Record<string, { action: "use"; id: string } | { action: "create"; name: string }>
  >({})
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({})
  const [categoryDecisions, setCategoryDecisions] = useState<
    Array<{
      kind: "category" | "subcategory"
      raw: string
      action: "create" | "link" | "skip"
      name?: string
      parent_name?: string
      id?: string
    }>
  >([])
  const [attributeOverrides, setAttributeOverrides] = useState<
    Record<string, Record<string, string>>
  >({})

  const loadBatches = useCallback(async () => {
    try {
      const res = await listBrandImportBatches()
      setBatches(res.batches)
    } catch {
      setBatches([])
    }
  }, [])

  useEffect(() => {
    void loadBatches()
  }, [loadBatches])

  function mappingFromLinks(rows: BrandColumnLink[]) {
    const mapping: Record<string, string | null> = {}
    const columnLanguages: Record<string, string | null> = {}
    for (const link of rows) {
      if (!link.field || !link.imported) continue
      mapping[link.field] = link.source
      if (link.language_code) columnLanguages[link.field] = link.language_code
    }
    return { mapping, columnLanguages }
  }

  async function runPreview(confirmed = false) {
    if (!file) {
      setError("Kies een Excel- of CSV-bestand.")
      return
    }
    if (!sourceKey.trim()) {
      setError("Vul de bron of het merk in.")
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const mapped = mappingFromLinks(links)
      const res = await previewBrandImport({
        file,
        source_key: sourceKey.trim(),
        source_language_code: language || undefined,
        language_confirmed: confirmed && Boolean(language),
        mapping_confirmed: confirmed,
        mapping: confirmed ? mapped.mapping : undefined,
        column_languages: confirmed ? mapped.columnLanguages : undefined,
        manual_links: confirmed ? links : undefined,
        brand_choices: brandChoices,
        category_decisions: categoryDecisions,
        attribute_overrides: attributeOverrides,
      })
      setPreview(res)
      setLinks(res.preview.links)
      if (!language && res.preview.language.suggested) setLanguage(res.preview.language.suggested)
      setLanguageConfirmed(confirmed && Boolean(language || res.preview.language.suggested))
      const nextOverrides: Record<string, Record<string, string>> = {}
      for (const row of res.preview.preview) {
        const fields: Record<string, string> = {
          ...(attributeOverrides[String(row.row)] || {}),
        }
        for (const field of res.preview.category_fields || []) {
          if (fields[field.code] === undefined) fields[field.code] = ""
        }
        if (Object.keys(fields).length) nextOverrides[String(row.row)] = fields
      }
      setAttributeOverrides(nextOverrides)
    } catch (err) {
      setError(err instanceof ProductApprovalAdminApiError ? err.message : "Preview mislukt.")
    } finally {
      setBusy(false)
    }
  }

  async function runCommit() {
    if (!file || !preview) return
    setBusy(true)
    setError(null)
    try {
      const mapped = mappingFromLinks(links)
      const res = await commitBrandImport({
        file,
        source_key: sourceKey.trim(),
        source_language_code: language,
        language_confirmed: true,
        mapping_confirmed: true,
        enqueue_translations: enqueue,
        mapping: mapped.mapping,
        column_languages: mapped.columnLanguages,
        manual_links: links,
        brand_choices: brandChoices,
        category_decisions: categoryDecisions,
        attribute_overrides: attributeOverrides,
      })
      setNotice(
        `Import klaar. ${res.created.length} nieuwe producten, ${res.proposals.length} wijzigingsvoorstellen, ${res.translations_added.length} vertalingen. Offers aangemaakt: ${res.offers_created}.`
      )
      setPreview(null)
      await loadBatches()
    } catch (err) {
      setError(err instanceof ProductApprovalAdminApiError ? err.message : "Import geblokkeerd.")
      await loadBatches()
    } finally {
      setBusy(false)
    }
  }

  const summary = preview?.preview.summary

  return (
    <div>
      <h1 className="text-lg font-bold text-wf-900">Productaanleveringen</h1>
      <p className="mt-1 text-xs text-wf-600">
        Admin-import van centrale Product Cloud-informatie (Excel, Engels). Prijs,
        voorraad, verzendkosten en seller-SKU horen niet in dit bestand en worden
        niet geïmporteerd; er wordt geen Seller-aanbod aangemaakt.
      </p>
      <div className="mt-3">
        <button
          type="button"
          className="rounded border border-wf-400 px-3 py-1.5 text-xs font-semibold"
          onClick={() => void downloadBrandWorkbook().catch(() => setError("Importbestand downloaden mislukt."))}
        >
          Download Admin producttemplate (.xlsx)
        </button>
      </div>
      <div className="mt-4">
        <ProductSectionNav active="deliveries" counts={{ deliveries: batches.length }} />
      </div>
      {error ? <p className="mb-3 text-xs text-amber-800">{error}</p> : null}
      {notice ? <p className="mb-3 text-xs text-wf-800">{notice}</p> : null}

      <div className="rounded border border-wf-300 bg-white p-3">
        <label className="block text-xs font-semibold text-wf-800">
          Bron / merk
          <input
            value={sourceKey}
            onChange={(e) => setSourceKey(e.target.value)}
            className="mt-1 h-8 w-full max-w-md rounded border border-wf-400 px-2 text-xs font-normal"
            placeholder="Bijvoorbeeld Bosch"
          />
        </label>
        <label className="mt-3 block text-xs font-semibold text-wf-800">
          Taal van de aangeleverde productgegevens
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value)
              setLanguageConfirmed(false)
            }}
            className="mt-1 h-8 w-full max-w-md rounded border border-wf-400 px-2 text-xs font-normal"
          >
            <option value="">— kies of bevestig de taal —</option>
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-1 text-[11px] text-wf-600">
          Dit is de taal van het bestand. Een kolom kan daarnaast een eigen taal hebben, bijvoorbeeld een Nederlandse en een Duitse productnaam.
        </p>
        <input
          type="file"
          accept=".csv,.xlsx,text/csv"
          className="mt-3 block text-xs"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null)
            setPreview(null)
            setLinks([])
            setAttributeOverrides({})
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void runPreview(false)}
          className="mt-3 rounded bg-wf-800 px-3 py-1.5 text-xs font-semibold text-white"
        >
          {busy ? "Bezig…" : "Kolommen en voorbeeld laden"}
        </button>
      </div>

      {preview ? (
        <div className="mt-4 space-y-3">
          <div className="rounded border border-wf-300 bg-white p-3 text-xs">
            <p>{preview.preview.language.reason}</p>
            {preview.preview.language.needs_confirmation ? (
              <p className="mt-1 text-amber-800">Bevestig de taal. Zonder bevestiging wordt er niet geïmporteerd.</p>
            ) : null}
            {preview.preview.profile_review_required ? (
              <p className="mt-1 text-amber-800">{preview.preview.profile_reason}</p>
            ) : null}
            {preview.preview.profile_applied ? <p className="mt-1">Opgeslagen koppelprofiel toegepast.</p> : null}
            <p className="mt-2">
              {summary?.rows} rijen · {summary?.new_products} nieuw · {summary?.existing_products} bestaand ·{" "}
              {summary?.error_rows} fouten · {summary?.duplicates} duplicaten
            </p>
            {preview.preview.commercial_columns.length ? (
              <p className="mt-1">
                Niet geïmporteerd: {preview.preview.commercial_columns.join(", ")}
              </p>
            ) : null}
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={enqueue} onChange={(e) => setEnqueue(e.target.checked)} />
              Ontbrekende talen daarna machinevertalen. Bestaande vertalingen blijven staan.
            </label>
          </div>

          <div className="overflow-x-auto rounded border border-wf-300 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {["Bronkolom", "Voorbeeld", "EuropMade-veld", "Taal", "Status"].map((h) => (
                    <th key={h} className="border-b border-wf-400 px-3 py-2 text-left text-[10px] uppercase text-wf-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id}>
                    <td className="border-b border-wf-200 px-3 py-2">{link.source}</td>
                    <td className="border-b border-wf-200 px-3 py-2 text-wf-600">{link.sample || "—"}</td>
                    <td className="border-b border-wf-200 px-3 py-2">
                      <select
                        value={link.imported ? link.field || "" : ""}
                        onChange={(e) => {
                          const field = e.target.value || null
                          setLinks((cur) =>
                            cur.map((row) =>
                              row.id === link.id
                                ? {
                                    ...row,
                                    field,
                                    imported: Boolean(field),
                                    confidence: field ? "certain" : "unmapped",
                                    label: field || "Niet gekoppeld",
                                  }
                                : row
                            )
                          )
                        }}
                        className="h-7 rounded border border-wf-400 bg-white px-1"
                      >
                        <option value="">Niet gekoppeld</option>
                        {Object.entries(
                          (preview.preview.target_fields || []).reduce<Record<string, Array<{ field: string; label: string }>>>(
                            (groups, target) => {
                              const list = groups[target.group] || []
                              list.push(target)
                              groups[target.group] = list
                              return groups
                            },
                            {}
                          )
                        ).map(([group, fields]) => (
                          <optgroup key={group} label={group}>
                            {fields.map((field) => (
                              <option key={field.field} value={field.field}>
                                {field.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2">
                      {link.field && TEXT_FIELDS.has(link.field) ? (
                        <select
                          value={link.language_code || language}
                          onChange={(e) =>
                            setLinks((cur) =>
                              cur.map((row) =>
                                row.id === link.id ? { ...row, language_code: e.target.value } : row
                              )
                            )
                          }
                          className="h-7 rounded border border-wf-400 bg-white px-1"
                        >
                          {LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                              {lang.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2">
                      {link.confidence === "commercial"
                        ? "Niet geïmporteerd"
                        : link.confidence === "review"
                          ? "Controle nodig"
                          : link.confidence === "certain"
                            ? "Gekoppeld"
                            : "Niet gekoppeld"}
                      {link.message ? <span className="mt-1 block text-[11px] text-wf-600">{link.message}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 text-xs">
            {preview.preview.preview.map((row) => (
              <li key={row.row} className="rounded border border-wf-200 bg-white p-2">
                <p>
                  Rij {row.row}: {row.title || "geen naam"} · {row.status}
                  {row.ean ? ` · EAN ${row.ean}` : ""}
                  {row.match ? ` · bestaand product ${row.match.product_id}` : ""}
                </p>
                {row.texts.map((text) => (
                  <p key={`${text.field}-${text.language_code}`} className="text-wf-600">
                    {text.field} ({text.language_code}): {text.value}
                  </p>
                ))}
                {row.issues.map((issue) => (
                  <p key={`${issue.field}-${issue.message}`} className="text-amber-800">
                    {issue.message}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          {preview.preview.conflicts.map((conflict) => (
            <p key={conflict} className="text-xs text-amber-800">
              {conflict}
            </p>
          ))}
          {(preview.preview.brand_proposals || []).map((proposal) => (
            <div key={proposal.name} className="rounded border border-wf-300 bg-white p-2 text-xs">
              <p className="font-semibold">
                {proposal.status === "create"
                  ? `Nieuw merk: ${proposal.name}`
                  : `Merk '${proposal.name}' is niet eenduidig`}
              </p>
              {proposal.status === "ambiguous" ? (
                <select
                  className="mt-1 h-8 rounded border border-wf-400 px-1"
                  value={
                    brandChoices[brandKey(proposal.name)]?.action === "use"
                      ? brandChoices[brandKey(proposal.name)] &&
                        "id" in brandChoices[brandKey(proposal.name)]
                        ? (brandChoices[brandKey(proposal.name)] as { id: string }).id
                        : ""
                      : brandChoices[brandKey(proposal.name)]?.action === "create"
                        ? "create"
                        : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value
                    setBrandChoices((cur) => ({
                      ...cur,
                      [brandKey(proposal.name)]:
                        value === "create"
                          ? { action: "create", name: proposal.name }
                          : { action: "use", id: value },
                    }))
                  }}
                >
                  <option value="">Bevestig het merk</option>
                  {proposal.candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      Bestaand merk: {candidate.name}
                    </option>
                  ))}
                  <option value="create">Nieuw merk aanmaken: {proposal.name}</option>
                </select>
              ) : (
                <p className="text-wf-600">Dit merk wordt aangemaakt en is niet automatisch geverifieerd.</p>
              )}
            </div>
          ))}
          {(preview.preview.category_fields || []).length ? (
            <div className="rounded border border-wf-300 bg-white p-3">
              <h2 className="text-xs font-bold text-wf-900">Categoriekenmerken</h2>
              <p className="mt-1 text-[11px] text-wf-600">
                Herkend: {(preview.preview.detected_categories || []).join(", ") || "—"}.
                Vul alleen relevante kenmerken in; lege optionele velden blijven leeg.
                Bij hergebruik van een bestaande EAN worden alleen ontbrekende kenmerken
                aangevuld (geen stille overschrijving).
              </p>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-wf-500">
                      <th className="pr-2">Rij</th>
                      {(preview.preview.category_fields || []).map((field) => (
                        <th key={field.code} className="pr-2">
                          {field.name}
                          {field.requirement_tier === "category_required"
                            ? " (voorwaardelijk verplicht)"
                            : " (optioneel)"}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.preview.map((row) => (
                      <tr key={row.row}>
                        <td className="pr-2 align-top">{row.row}</td>
                        {(preview.preview.category_fields || []).map((field) => {
                          const options = field.option_values || []
                          const value =
                            attributeOverrides[String(row.row)]?.[field.code] ?? ""
                          const onChange = (next: string) =>
                            setAttributeOverrides((prev) => ({
                              ...prev,
                              [String(row.row)]: {
                                ...(prev[String(row.row)] || {}),
                                [field.code]: next,
                              },
                            }))
                          return (
                            <td key={field.code} className="pr-2 pb-1">
                              {options.length ? (
                                <select
                                  className="h-7 w-full rounded border border-wf-400 px-1"
                                  value={value}
                                  onChange={(e) => onChange(e.target.value)}
                                >
                                  <option value="">—</option>
                                  {options.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  className="h-7 w-full rounded border border-wf-400 px-1"
                                  value={value}
                                  onChange={(e) => onChange(e.target.value)}
                                />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {(preview.preview.category_proposals || []).map((proposal) => {
            const key = `${proposal.kind}:${brandKey(proposal.raw)}`
            const decision = categoryDecisions.find(
              (item) => item.kind === proposal.kind && brandKey(item.raw) === brandKey(proposal.raw)
            )
            return (
              <div key={key} className="rounded border border-wf-300 bg-white p-2 text-xs">
                <p>{proposal.message}</p>
                {proposal.parent_name ? (
                  <p className="text-wf-600">Hoofdcategorie: {proposal.parent_name}</p>
                ) : null}
                <input
                  value={categoryNames[key] ?? proposal.raw}
                  onChange={(e) => setCategoryNames((cur) => ({ ...cur, [key]: e.target.value }))}
                  className="mt-1 h-8 w-full max-w-sm rounded border border-wf-400 px-2"
                />
                <div className="mt-1 flex flex-wrap gap-2">
                  {proposal.candidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      className="rounded border border-wf-400 px-2 py-1"
                      onClick={() =>
                        setCategoryDecisions((cur) => [
                          ...cur.filter((item) => !(item.kind === proposal.kind && brandKey(item.raw) === brandKey(proposal.raw))),
                          { kind: proposal.kind, raw: proposal.raw, action: "link", id: candidate.id, name: candidate.name },
                        ])
                      }
                    >
                      Gebruik {candidate.name}
                    </button>
                  ))}
                  {proposal.parent_name || proposal.kind === "category" ? (
                    <button
                      type="button"
                      className="rounded border border-wf-400 px-2 py-1"
                      onClick={() =>
                        setCategoryDecisions((cur) => [
                          ...cur.filter((item) => !(item.kind === proposal.kind && brandKey(item.raw) === brandKey(proposal.raw))),
                          {
                            kind: proposal.kind,
                            raw: proposal.raw,
                            action: "create",
                            name: categoryNames[key] ?? proposal.raw,
                            parent_name: proposal.parent_name || undefined,
                          },
                        ])
                      }
                    >
                      {proposal.parent_name
                        ? `Toevoegen onder ${proposal.parent_name}`
                        : "Toevoegen na bevestiging"}
                    </button>
                  ) : (
                    <p className="text-amber-800">Kies of voeg eerst de hoofdcategorie toe.</p>
                  )}
                </div>
                {decision ? <p className="mt-1 text-wf-600">Gekozen: {decision.action}</p> : null}
              </div>
            )
          })}
          <button
            type="button"
            disabled={busy}
            onClick={() => void runPreview(Boolean(language))}
            className="rounded border border-wf-400 px-3 py-1.5 text-xs font-semibold"
          >
            Voorbeeld bijwerken
          </button>
          <button
            type="button"
            disabled={busy || !language || !preview.preview.commit_allowed}
            onClick={() => void runCommit()}
            className="rounded bg-wf-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Importeren na bevestiging
          </button>
        </div>
      ) : null}

      <h2 className="mb-2 mt-6 text-sm font-bold text-wf-900">Importgeschiedenis</h2>
      {batches.length === 0 ? (
        <p className="text-xs text-wf-600">Nog geen aanleveringen.</p>
      ) : (
        <ul className="space-y-1 text-xs">
          {batches.map((batch) => (
            <li key={batch.id} className="rounded border border-wf-200 px-2 py-1">
              {batch.source_key} · {batch.file_name || "bestand"} · {batch.status}
              {batch.summary?.error_rows != null ? ` · ${batch.summary.error_rows} fouten` : ""}
              {batch.summary?.new_products != null ? ` · ${batch.summary.new_products} nieuw` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
