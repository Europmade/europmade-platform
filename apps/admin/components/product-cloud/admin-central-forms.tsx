"use client"

import { useState } from "react"
import { Button } from "@europmade/ui"
import {
  ProductApprovalAdminApiError,
  saveAdminProductSection,
} from "../../lib/product-approval-admin-api"

const CE_CODES = new Set([
  "ce_marking",
  "app_required",
  "collects_data",
  "product_languages",
  "manual_languages",
])

const COMPLIANCE_CODES = new Set([
  "gpsr_manufacturer_name",
  "gpsr_manufacturer_address",
  "gpsr_manufacturer_postal_city",
  "gpsr_manufacturer_country",
  "gpsr_manufacturer_email",
  "gpsr_eu_responsible_name",
  "gpsr_eu_responsible_address",
  "gpsr_eu_responsible_postal_city",
  "gpsr_eu_responsible_country",
  "gpsr_eu_responsible_contact",
  "gpsr_safety_warnings",
  "production_country",
  "production_location",
  "ce_marking",
  "app_required",
  "collects_data",
  "product_languages",
  "manual_languages",
])

const TEXT_FIELDS = [
  ["title", "Productnaam"],
  ["short_description", "Korte omschrijving"],
  ["description", "Uitgebreide beschrijving"],
  ["usps", "Belangrijkste kenmerken / USP's"],
  ["specifications", "Productspecificaties"],
] as const

const inputClass = "mt-1 h-8 w-full rounded border border-wf-400 px-2 text-xs font-normal"
const labelClass = "block text-[11px] font-semibold text-wf-700"

type Choice = { id: string; name: string; parent_id?: string | null }
type Attr = {
  id: string
  code?: string | null
  name: string
  value?: string | null
  option_values?: string[] | null
}
type Catalog = {
  brands?: Choice[]
  manufacturers?: Choice[]
  categories?: Choice[]
  variant_types?: string[]
  languages?: string[]
}

function fieldError(err: unknown): { message: string; field: string | null } {
  if (err instanceof ProductApprovalAdminApiError) {
    const payload = err.payload as { field?: string } | undefined
    return { message: err.message, field: payload?.field || null }
  }
  return { message: "Opslaan mislukt.", field: null }
}

function SaveBar(props: {
  busy: boolean
  notice: string | null
  error: string | null
  onSave: () => void
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button size="sm" type="button" disabled={props.busy} onClick={props.onSave}>
        {props.busy ? "Opslaan…" : "Opslaan"}
      </Button>
      {props.notice ? <p className="text-[11px] text-emerald-800">{props.notice}</p> : null}
      {props.error ? <p className="text-[11px] text-amber-800">{props.error}</p> : null}
    </div>
  )
}

function AttrInputs(props: {
  fields: Attr[]
  values: Record<string, string>
  errorField: string | null
  onChange: (id: string, value: string) => void
}) {
  return (
    <div className="grid gap-2 tablet:grid-cols-2">
      {props.fields.map((field) => (
        <label key={field.id} className={labelClass}>
          {field.name}
          {field.option_values?.length ? (
            <select
              className={inputClass}
              value={props.values[field.id] ?? ""}
              onChange={(e) => props.onChange(field.id, e.target.value)}
            >
              <option value="">—</option>
              {field.option_values.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={inputClass}
              value={props.values[field.id] ?? ""}
              onChange={(e) => props.onChange(field.id, e.target.value)}
            />
          )}
          {props.errorField === field.code || props.errorField === field.id ? (
            <span className="mt-1 block font-normal text-amber-800">Controleer dit veld.</span>
          ) : null}
        </label>
      ))}
    </div>
  )
}

export function CentralInformationForm(props: {
  productId: string
  product: Record<string, unknown>
  catalog: Catalog
  onSaved: () => Promise<void>
}) {
  const schema = (props.product.schema || []) as Attr[]
  const infoFields = schema.filter((field) => !field.code || !COMPLIANCE_CODES.has(field.code))
  const variant = ((props.product.variants || []) as Array<Record<string, unknown>>)[0]
  const categories = props.catalog.categories || []
  const parents = categories.filter((row) => !row.parent_id)
  const [title, setTitle] = useState(String(props.product.title || ""))
  const [brandId, setBrandId] = useState(String(props.product.brand_id || ""))
  const [manufacturerId, setManufacturerId] = useState(String(props.product.manufacturer_id || ""))
  const [ean, setEan] = useState(String(props.product.identifier_value || ""))
  const [mpn, setMpn] = useState(String(props.product.mpn_value || ""))
  const [variantType, setVariantType] = useState(String(variant?.variant_type || "Uitvoering"))
  const [variantValue, setVariantValue] = useState(String(variant?.variant_value || ""))
  const initialCategories = (props.product.category_ids || []) as string[]
  const [parentId, setParentId] = useState(
    initialCategories.find((id) => parents.some((row) => row.id === id)) || ""
  )
  const [childId, setChildId] = useState(
    initialCategories.find((id) => categories.some((row) => row.id === id && row.parent_id)) || ""
  )
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(infoFields.map((field) => [field.id, field.value || ""]))
  )
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<string | null>(null)
  const children = categories.filter((row) => row.parent_id === parentId)

  return (
    <div className="space-y-3">
      <label className={labelClass}>
        Productnaam
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className={labelClass}>
        EAN / GTIN
        <input className={`${inputClass} font-mono`} value={ean} onChange={(e) => setEan(e.target.value)} />
        {errorField === "ean" ? <span className="mt-1 block font-normal text-amber-800">{error}</span> : null}
      </label>
      <label className={labelClass}>
        Fabrikantnummer / MPN
        <input className={`${inputClass} font-mono`} value={mpn} onChange={(e) => setMpn(e.target.value)} />
        {errorField === "mpn" ? <span className="mt-1 block font-normal text-amber-800">{error}</span> : null}
      </label>
      <label className={labelClass}>
        Merk
        <select className={inputClass} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
          <option value="">—</option>
          {(props.catalog.brands || []).map((row) => (
            <option key={row.id} value={row.id}>{row.name}</option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Fabrikant
        <select className={inputClass} value={manufacturerId} onChange={(e) => setManufacturerId(e.target.value)}>
          <option value="">—</option>
          {manufacturerId && !(props.catalog.manufacturers || []).some((row) => row.id === manufacturerId) ? (
            <option value={manufacturerId}>{manufacturerId}</option>
          ) : null}
          {(props.catalog.manufacturers || []).map((row) => (
            <option key={row.id} value={row.id}>{row.name}</option>
          ))}
        </select>
        {errorField === "manufacturer_id" ? (
          <span className="mt-1 block font-normal text-amber-800">{error}</span>
        ) : null}
      </label>
      <div className="grid gap-2 tablet:grid-cols-2">
        <label className={labelClass}>
          Productcategorie
          <select className={inputClass} value={parentId} onChange={(e) => { setParentId(e.target.value); setChildId("") }}>
            <option value="">—</option>
            {parents.map((row) => (
              <option key={row.id} value={row.id}>{row.name}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Subcategorie
          <select className={inputClass} value={childId} onChange={(e) => setChildId(e.target.value)}>
            <option value="">—</option>
            {children.map((row) => (
              <option key={row.id} value={row.id}>{row.name}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Varianttype
          <select className={inputClass} value={variantType} onChange={(e) => setVariantType(e.target.value)}>
            {(props.catalog.variant_types || []).map((row) => (
              <option key={row} value={row}>{row}</option>
            ))}
          </select>
          {errorField === "variant_type" ? <span className="mt-1 block font-normal text-amber-800">{error}</span> : null}
        </label>
        <label className={labelClass}>
          Variantwaarde
          <input className={inputClass} value={variantValue} onChange={(e) => setVariantValue(e.target.value)} />
        </label>
      </div>
      <AttrInputs
        fields={infoFields}
        values={values}
        errorField={errorField}
        onChange={(id, value) => setValues((cur) => ({ ...cur, [id]: value }))}
      />
      <SaveBar
        busy={busy}
        notice={notice}
        error={errorField === "ean" || errorField === "mpn" || errorField === "variant_type" || errorField === "manufacturer_id" ? null : error}
        onSave={() => {
          setBusy(true)
          setNotice(null)
          setError(null)
          setErrorField(null)
          void saveAdminProductSection(props.productId, {
            section: "information",
            title,
            brand_id: brandId,
            manufacturer_id: manufacturerId,
            ean,
            mpn,
            variant_id: variant?.id || null,
            variant_type: variantType,
            variant_value: variantValue,
            category_ids: [parentId, childId].filter(Boolean),
            attributes: infoFields.map((field) => ({
              attribute_definition_id: field.id,
              value: values[field.id] ?? "",
            })),
          })
            .then(async () => {
              setNotice("Productinformatie opgeslagen. De beoordeling is niet gewijzigd.")
              await props.onSaved()
            })
            .catch((err: unknown) => {
              const parsed = fieldError(err)
              setError(parsed.message)
              setErrorField(parsed.field)
            })
            .finally(() => setBusy(false))
        }}
      />
    </div>
  )
}

export function CentralDescriptionForm(props: {
  productId: string
  product: Record<string, unknown>
  onSaved: () => Promise<void>
}) {
  const [description, setDescription] = useState(String(props.product.description ?? ""))
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      <label className={labelClass}>
        Beschrijving
        <textarea
          className="mt-1 min-h-48 w-full resize-y rounded border border-wf-400 px-2 py-2 text-xs font-normal"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <SaveBar
        busy={busy}
        notice={notice}
        error={error}
        onSave={() => {
          setBusy(true)
          setNotice(null)
          setError(null)
          void saveAdminProductSection(props.productId, { section: "description", description })
            .then(async () => {
              setNotice("Beschrijving opgeslagen. De beoordeling is niet gewijzigd.")
              await props.onSaved()
            })
            .catch((err: unknown) => setError(fieldError(err).message))
            .finally(() => setBusy(false))
        }}
      />
    </div>
  )
}

export function CentralMediaForm(props: {
  productId: string
  product: Record<string, unknown>
  onSaved: () => Promise<void>
}) {
  const initialMedia = ((props.product.media || []) as Array<Record<string, string>>).map((row) => ({
    id: row.id || "",
    media_type: row.media_type || "Overige afbeelding",
    storage_reference: row.storage_reference || "",
  }))
  const initialDocs = ((props.product.documents || []) as Array<Record<string, string>>).map((row) => ({
    id: row.id || "",
    document_type: row.document_type || "Handleiding",
    storage_reference: row.storage_reference || "",
  }))
  const [media, setMedia] = useState(initialMedia)
  const [documents, setDocuments] = useState(initialDocs)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="mb-3 space-y-2">
      {media.map((row, index) => (
        <div key={row.id || index} className="grid gap-2 tablet:grid-cols-[180px_1fr]">
          <select
            className={inputClass}
            value={row.media_type}
            onChange={(e) => setMedia((cur) => cur.map((item, i) => i === index ? { ...item, media_type: e.target.value } : item))}
          >
            <option>Hoofdafbeelding</option>
            <option>Overige afbeelding</option>
            <option>Video</option>
          </select>
          <input
            className={inputClass}
            value={row.storage_reference}
            placeholder="https:// of /static/"
            onChange={(e) => setMedia((cur) => cur.map((item, i) => i === index ? { ...item, storage_reference: e.target.value } : item))}
          />
        </div>
      ))}
      <button type="button" className="text-[11px] underline" onClick={() => setMedia((cur) => [...cur, { id: "", media_type: "Overige afbeelding", storage_reference: "" }])}>
        Afbeelding of video toevoegen
      </button>
      {documents.map((row, index) => (
        <div key={row.id || index} className="grid gap-2 tablet:grid-cols-[220px_1fr]">
          <select
            className={inputClass}
            value={row.document_type}
            onChange={(e) => setDocuments((cur) => cur.map((item, i) => i === index ? { ...item, document_type: e.target.value } : item))}
          >
            {["Handleiding", "CE-certificaat", "Veiligheidsinformatieblad", "Conformiteitsverklaring", "Garantiebewijs", "Overig compliance-document"].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <input
            className={inputClass}
            value={row.storage_reference}
            placeholder="Document-URL"
            onChange={(e) => setDocuments((cur) => cur.map((item, i) => i === index ? { ...item, storage_reference: e.target.value } : item))}
          />
        </div>
      ))}
      <button type="button" className="text-[11px] underline" onClick={() => setDocuments((cur) => [...cur, { id: "", document_type: "Handleiding", storage_reference: "" }])}>
        Document toevoegen
      </button>
      <SaveBar
        busy={busy}
        notice={notice}
        error={error}
        onSave={() => {
          setBusy(true)
          setNotice(null)
          setError(null)
          void saveAdminProductSection(props.productId, { section: "media", media, documents })
            .then(async () => {
              setNotice("Media opgeslagen. De beoordeling is niet gewijzigd.")
              await props.onSaved()
            })
            .catch((err: unknown) => setError(fieldError(err).message))
            .finally(() => setBusy(false))
        }}
      />
    </div>
  )
}

export function CentralComplianceForm(props: {
  productId: string
  product: Record<string, unknown>
  group?: "origin" | "ce"
  origin?: { production_country?: string | null; production_location?: string | null } | null
  onSaved: () => Promise<void>
}) {
  const group = props.group || "origin"
  const fields = ((props.product.schema || []) as Attr[]).filter((field) => {
    if (!field.code || !COMPLIANCE_CODES.has(field.code)) return false
    return group === "ce" ? CE_CODES.has(field.code) : !CE_CODES.has(field.code)
  })
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((field) => [
        field.id,
        field.value ||
          (field.code === "production_country" ? props.origin?.production_country || "" : "") ||
          (field.code === "production_location" ? props.origin?.production_location || "" : ""),
      ])
    )
  )
  const [evidenceUrl, setEvidenceUrl] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<string | null>(null)

  return (
    <div className="mb-3 space-y-2">
      <AttrInputs
        fields={fields}
        values={values}
        errorField={errorField}
        onChange={(id, value) => setValues((cur) => ({ ...cur, [id]: value }))}
      />
      {group === "origin" ? (
        <label className={labelClass}>
          EuropMade-bewijs / bewijs van EU-productie
          <input className={inputClass} value={evidenceUrl} placeholder="Nieuwe document-URL, blijft in afwachting" onChange={(e) => setEvidenceUrl(e.target.value)} />
        </label>
      ) : (
        <p className="text-[11px] text-wf-500">
          Documentstatus, reviewstatus en publiceerbaarheid volgen uit de documenten en worden hier niet handmatig gezet.
        </p>
      )}
      <SaveBar
        busy={busy}
        notice={notice}
        error={error}
        onSave={() => {
          setBusy(true)
          setNotice(null)
          setError(null)
          setErrorField(null)
          void saveAdminProductSection(props.productId, {
            section: "compliance",
            evidence_url: evidenceUrl,
            attributes: fields.map((field) => ({
              attribute_definition_id: field.id,
              value: values[field.id] ?? "",
            })),
          })
            .then(async () => {
              setEvidenceUrl("")
              setNotice("Compliance opgeslagen. Bewijs blijft in afwachting en is niet goedgekeurd.")
              await props.onSaved()
            })
            .catch((err: unknown) => {
              const parsed = fieldError(err)
              setError(parsed.message)
              setErrorField(parsed.field)
            })
            .finally(() => setBusy(false))
        }}
      />
    </div>
  )
}

export function CentralTranslationsForm(props: {
  productId: string
  product: Record<string, unknown>
  languages: string[]
  onSaved: () => Promise<void>
}) {
  const existing = (props.product.translations || []) as Array<{
    field_name: string
    language_code: string
    value: string
  }>
  const languages = props.languages.length ? props.languages : ["nl", "en", "de", "fr"]
  const [values, setValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const [field] of TEXT_FIELDS) {
      for (const language of languages) {
        out[`${field}:${language}`] =
          existing.find((row) => row.field_name === field && row.language_code === language)?.value || ""
      }
    }
    return out
  })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      {TEXT_FIELDS.map(([field, label]) => (
        <div key={field}>
          <p className="text-[11px] font-semibold text-wf-800">{label}</p>
          <div className="mt-1 grid gap-2 tablet:grid-cols-2">
            {languages.map((language) => (
              <label key={language} className={labelClass}>
                {language.toUpperCase()}
                <textarea
                  className={`${inputClass} h-16 py-1`}
                  value={values[`${field}:${language}`] || ""}
                  onChange={(e) => setValues((cur) => ({ ...cur, [`${field}:${language}`]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
      <SaveBar
        busy={busy}
        notice={notice}
        error={error}
        onSave={() => {
          setBusy(true)
          setNotice(null)
          setError(null)
          const translations = TEXT_FIELDS.flatMap(([field]) =>
            languages
              .map((language) => ({
                field_name: field,
                language_code: language,
                value: values[`${field}:${language}`] || "",
              }))
              .filter((row) => row.value.trim())
          )
          void saveAdminProductSection(props.productId, { section: "translations", translations })
            .then(async () => {
              setNotice("Vertalingen opgeslagen. Andere talen die je leeg liet, zijn niet overschreven.")
              await props.onSaved()
            })
            .catch((err: unknown) => setError(fieldError(err).message))
            .finally(() => setBusy(false))
        }}
      />
    </div>
  )
}
