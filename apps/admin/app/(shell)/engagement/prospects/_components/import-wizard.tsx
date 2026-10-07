"use client"

import { useMemo, useState } from "react"
import { Notice } from "@europmade/ui"
import {
  EngagementAdminApiError,
  previewProspectImport,
  runProspectImport,
  type ProspectImportRow,
} from "../../../../../lib/engagement-admin-api"

type ImportColumn = "company_name" | "contact_name" | "email" | "website" | "category" | "role" | "sales_model"

const FIELDS: Array<{ key: ImportColumn; label: string; aliases: string[] }> = [
  { key: "company_name", label: "Bedrijfsnaam", aliases: ["bedrijfsnaam", "bedrijf", "company", "organisation", "organization"] },
  { key: "contact_name", label: "Contactpersoon", aliases: ["contactpersoon", "contact", "contact name"] },
  { key: "email", label: "E-mailadres", aliases: ["e-mailadres", "e-mail", "email", "mail"] },
  { key: "website", label: "Website", aliases: ["website", "url", "site"] },
  { key: "category", label: "Categorie", aliases: ["categorie", "category"] },
  { key: "role", label: "Rol", aliases: ["rol", "role"] },
  { key: "sales_model", label: "Verkoopmodel", aliases: ["verkoopmodel", "sales model", "salesmodel", "sales_model"] },
]

function messageOf(err: unknown): string {
  return err instanceof EngagementAdminApiError ? err.message : "Importeren mislukt."
}

function parseCsv(text: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, "")
  const first = cleaned.split(/\r?\n/, 1)[0] ?? ""
  const delimiter = first.split(";").length > first.split(",").length ? ";" : ","
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  for (let index = 0; index < cleaned.length; index += 1) {
    const char = cleaned[index]
    if (quoted) {
      if (char === '"') {
        if (cleaned[index + 1] === '"') {
          cell += '"'
          index += 1
        } else quoted = false
      } else cell += char
      continue
    }
    if (char === '"') {
      quoted = true
      continue
    }
    if (char === delimiter) {
      row.push(cell.trim())
      cell = ""
      continue
    }
    if (char === "\n") {
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ""
      continue
    }
    if (char !== "\r") cell += char
  }
  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

async function readTable(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase()
  if (name.endsWith(".csv") || file.type.includes("csv") || name.endsWith(".txt")) {
    return parseCsv(await file.text())
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx")
    const book = XLSX.read(await file.arrayBuffer(), { type: "array" })
    const sheetName = book.SheetNames[0]
    const sheet = sheetName ? book.Sheets[sheetName] : undefined
    if (!sheet) return []
    const grid = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
    })
    return grid
      .map((line) => line.map((cell) => String(cell ?? "").trim()))
      .filter((line) => line.some(Boolean))
  }
  throw new Error("Kies een Excel-bestand (.xlsx) of een CSV-bestand.")
}

function guessMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  const used = new Set<string>()
  for (const field of FIELDS) {
    const index = headers.findIndex((header) => {
      const key = header.trim().toLowerCase()
      return field.aliases.includes(key) && !used.has(header)
    })
    const header = index >= 0 ? headers[index] : undefined
    if (header) {
      mapping[field.key] = header
      used.add(header)
    }
  }
  return mapping
}

function buildRows(
  headers: string[],
  lines: string[][],
  mapping: Record<string, string>
): ProspectImportRow[] {
  return lines.map((line) => {
    const record: ProspectImportRow = {
      company_name: "",
      contact_name: "",
      email: "",
      website: "",
      category: "",
      role: "",
      sales_model: "",
    }
    for (const field of FIELDS) {
      const header = mapping[field.key]
      const index = headers.indexOf(header ?? "")
      record[field.key] = index >= 0 ? line[index] ?? "" : ""
    }
    return record
  })
}

export function ProspectImportWizard({
  onClose,
  onImported,
}: {
  onClose: () => void
  onImported: (count: number) => void
}) {
  const [step, setStep] = useState(1)
  const [fileName, setFileName] = useState("")
  const [headers, setHeaders] = useState<string[]>([])
  const [lines, setLines] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState<ProspectImportRow[]>([])
  const [summary, setSummary] = useState({ new: 0, existing: 0, possible_duplicate: 0, invalid: 0 })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<number | null>(null)

  const rows = useMemo(
    () => buildRows(headers, lines, mapping),
    [headers, lines, mapping]
  )
  const mappedEnough = Boolean(mapping.company_name && mapping.email)

  async function choose(file: File | undefined) {
    if (!file) {
      setError("Kies eerst een Excel- of CSV-bestand.")
      return
    }
    setError(null)
    setBusy(true)
    try {
      const table = await readTable(file)
      if (table.length < 2) throw new Error("Het bestand heeft geen regels om te importeren.")
      const headerRow = table[0]
      if (!headerRow) throw new Error("Het bestand heeft geen kolomkoppen.")
      const nextHeaders = headerRow.map((header, index) => header || `Kolom ${index + 1}`)
      setFileName(file.name)
      setHeaders(nextHeaders)
      setLines(table.slice(1))
      setMapping(guessMapping(nextHeaders))
      setStep(2)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bestand lezen mislukt.")
    } finally {
      setBusy(false)
    }
  }

  async function review() {
    if (!mappedEnough) {
      setError("Koppel minimaal bedrijfsnaam en e-mailadres.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await previewProspectImport({ file_name: fileName, rows })
      setChecked(result.rows)
      setSummary(result.summary)
      setStep(3)
    } catch (err: unknown) {
      setError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  async function commit() {
    setBusy(true)
    setError(null)
    try {
      const result = await runProspectImport({ file_name: fileName, rows })
      setDone(result.imported)
      setStep(4)
    } catch (err: unknown) {
      setError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-wf-300 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-wf-900">Prospects importeren</h2>
            <p className="mt-1 text-[11px] text-wf-600">
              Stap {step} van 4 — {["Bestand", "Kolommen koppelen", "Controleren", "Importeren"][step - 1]}
            </p>
          </div>
          <button type="button" className="text-[11px] text-wf-600 underline" onClick={onClose}>
            Sluiten
          </button>
        </div>
        {error ? (
          <div className="mt-3">
            <Notice variant="warning">{error}</Notice>
          </div>
        ) : null}
        {step === 1 ? (
          <label
            className="mt-4 block rounded-lg border border-dashed border-wf-400 bg-wf-50 px-4 py-8 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              void choose(event.dataTransfer.files[0])
            }}
          >
            <p className="text-sm text-wf-800">Sleep hier een Excel- of CSV-bestand naartoe</p>
            <p className="mt-1 text-[11px] text-wf-600">of</p>
            <span className="mt-2 inline-block h-8 rounded bg-wf-900 px-3 py-2 text-[11px] font-medium text-white">
              Bestand kiezen
            </span>
            <input
              className="sr-only"
              type="file"
              accept=".xlsx,.xls,.csv,text/csv"
              onChange={(event) => void choose(event.target.files?.[0])}
            />
            <p className="mt-3 text-[11px] text-wf-500">
              Verplicht: bedrijfsnaam en e-mailadres. Website, categorie, rol en verkoopmodel zijn optioneel.
            </p>
          </label>
        ) : null}
        {step === 2 ? (
          <div className="mt-4">
            <p className="text-xs text-wf-700">{fileName}</p>
            <div className="mt-2 overflow-hidden rounded border border-wf-300">
              {FIELDS.map((field) => (
                <label key={field.key} className="grid grid-cols-2 items-center gap-2 border-b border-wf-200 px-3 py-2 text-xs last:border-b-0">
                  <span className="text-wf-800">{field.label}</span>
                  <select
                    className="h-8 rounded border border-wf-400 bg-white px-2"
                    value={mapping[field.key] ?? ""}
                    onChange={(event) =>
                      setMapping((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                  >
                    <option value="">Niet koppelen</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className="h-8 rounded border border-wf-300 px-3 text-[11px]" onClick={() => setStep(1)}>
                Terug
              </button>
              <button
                type="button"
                disabled={busy}
                className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
                onClick={() => void review()}
              >
                Controleren
              </button>
            </div>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="mt-4">
            <div className="overflow-hidden rounded border border-wf-300">
              <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] bg-wf-50 px-2 py-1.5 text-[11px] font-semibold text-wf-600">
                <span>Bedrijf</span>
                <span>Contact</span>
                <span>E-mail</span>
                <span>Website</span>
                <span>Rol</span>
                <span>Verkoopmodel</span>
                <span>Resultaat</span>
              </div>
              {checked.slice(0, 10).map((row, index) => (
                <div
                  key={`${row.email}-${index}`}
                  className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] border-t border-wf-200 px-2 py-1.5 text-[11px] text-wf-800"
                >
                  <span className="truncate">{row.company_name || "—"}</span>
                  <span className="truncate">{row.contact_name || "—"}</span>
                  <span className="truncate">{row.email || "—"}</span>
                  <span className="truncate">{row.website || "—"}</span>
                  <span className="truncate">{row.role || "—"}</span>
                  <span className="truncate">{row.sales_model || "—"}</span>
                  <span className="font-medium">{row.message}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-wf-500">
              {checked.length > 10 ? `Eerste 10 van ${checked.length} regels. ` : ""}
              Bestaande prospects worden niet overschreven.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className="h-8 rounded border border-wf-300 px-3 text-[11px]" onClick={() => setStep(2)}>
                Terug
              </button>
              <button
                type="button"
                disabled={summary.new === 0}
                className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
                onClick={() => setStep(4)}
              >
                Naar importeren
              </button>
            </div>
          </div>
        ) : null}
        {step === 4 ? (
          <div className="mt-4">
            {done == null ? (
              <>
                <ul className="space-y-1 text-sm text-wf-800">
                  <li>{summary.new} nieuwe prospects</li>
                  <li>{summary.existing} bestaande prospects</li>
                  <li>{summary.possible_duplicate} mogelijke dubbele</li>
                  <li>{summary.invalid} {summary.invalid === 1 ? "regel met fout" : "regels met fout"}</li>
                </ul>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    disabled={busy}
                    className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
                    onClick={() => void commit()}
                  >
                    Importeren
                  </button>
                </div>
              </>
            ) : (
              <div>
                <p className="text-sm text-wf-900">
                  {done === 1 ? "1 prospect geïmporteerd." : `${done} prospects geïmporteerd.`}
                </p>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white"
                    onClick={() => onImported(done)}
                  >
                    Naar de lijst
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
        {busy ? <p className="mt-3 text-[11px] text-wf-500">Bezig…</p> : null}
      </div>
    </div>
  )
}
