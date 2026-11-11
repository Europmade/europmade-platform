"use client"

import { useEffect, useRef, useState } from "react"
import {
  adminParentCategoryOptions,
  normalizeCategoryAssignment,
  resolveCategorySelection,
  sellerChildCategoryOptions,
  sellerL3CategoryOptions,
} from "@europmade/utils"
import { Button } from "@europmade/ui"
import {
  ProductApprovalAdminApiError,
  saveAdminProductCategories,
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

type Choice = {
  id: string
  name: string
  slug?: string | null
  parent_id?: string | null
  link_count?: number
}
type Attr = {
  id: string
  code?: string | null
  name: string
  value?: string | null
  option_values?: string[] | null
  unit?: string | null
  is_product_specification?: boolean
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

/** Same code can exist on parent + child category catalogs — show once. */
function dedupeAttrsByCode(fields: Attr[]): Attr[] {
  const byKey = new Map<string, Attr>()
  for (const field of fields) {
    const key = (field.code || "").trim() || field.id
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, field)
      continue
    }
    if (!(existing.value || "").trim() && (field.value || "").trim()) {
      byKey.set(key, field)
    }
  }
  return [...byKey.values()]
}

const MULTI_SELECT_CODES = new Set(["product_languages", "manual_languages"])

function parseMultiSelectValue(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string")
    }
  } catch {
    /* legacy comma-separated */
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function serializeMultiSelectValue(values: string[]): string {
  return JSON.stringify([...new Set(values.map((v) => v.trim()).filter(Boolean))])
}

function attrDisplayName(field: Attr): string {
  if (field.code === "gpsr_manufacturer_name") {
    return "GPSR-fabrikantnaam (etiket) — niet het catalogusveld Fabrikant"
  }
  return field.name
}

function AttrInputs(props: {
  fields: Attr[]
  values: Record<string, string>
  errorField: string | null
  onChange: (id: string, value: string) => void
}) {
  return (
    <div className="grid gap-2 tablet:grid-cols-2">
      {props.fields.map((field) => {
        const multi =
          Boolean(field.code && MULTI_SELECT_CODES.has(field.code)) &&
          Boolean(field.option_values?.length)
        const selected = multi
          ? parseMultiSelectValue(props.values[field.id] ?? "")
          : []
        return (
          <div key={field.code || field.id} className={labelClass}>
            <span className="block">{attrDisplayName(field)}</span>
            {multi ? (
              <div className="mt-1 max-h-36 space-y-1 overflow-y-auto rounded border border-wf-400 bg-white p-2">
                <p className="text-[10px] font-normal text-wf-500">
                  {selected.length} geselecteerd (zelfde multi-select als Seller)
                </p>
                {(field.option_values || []).map((option) => {
                  const checked = selected.includes(option)
                  return (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-xs font-normal text-wf-800"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...selected, option]
                            : selected.filter((v) => v !== option)
                          props.onChange(field.id, serializeMultiSelectValue(next))
                        }}
                      />
                      {option}
                    </label>
                  )
                })}
              </div>
            ) : field.option_values?.length ? (
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
          </div>
        )
      })}
    </div>
  )
}

export function CentralInformationForm(props: {
  productId: string
  product: Record<string, unknown>
  catalog: Catalog
  onSaved: () => Promise<void>
}) {
  const schema = dedupeAttrsByCode((props.product.schema || []) as Attr[])
  const infoFields = schema.filter((field) => !field.code || !COMPLIANCE_CODES.has(field.code))
  const productSpecFields = infoFields.filter((field) => field.is_product_specification)
  const categoryKenmerkFields = infoFields.filter((field) => !field.is_product_specification)
  const categories = props.catalog.categories || []
  const [title, setTitle] = useState(String(props.product.title || ""))
  const [brandId, setBrandId] = useState(String(props.product.brand_id || ""))
  const [manufacturerId, setManufacturerId] = useState(String(props.product.manufacturer_id || ""))
  const [ean, setEan] = useState(String(props.product.identifier_value || ""))
  const [mpn, setMpn] = useState(String(props.product.mpn_value || ""))
  const initialCategories = (props.product.category_ids || []) as string[]
  const initialResolved = resolveCategorySelection(categories, initialCategories)
  const [parentId, setParentId] = useState(initialResolved.parentId)
  const [childId, setChildId] = useState(initialResolved.childId)
  const [l3Id, setL3Id] = useState(initialResolved.l3Id)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(infoFields.map((field) => [field.id, field.value || ""]))
  )
  const [busy, setBusy] = useState(false)
  const [categoryBusy, setCategoryBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<string | null>(null)
  const valuesByCodeRef = useRef<Map<string, string>>(new Map())
  const fieldIdsKey = infoFields.map((field) => field.id).join("|")
  const parents = adminParentCategoryOptions(categories, [
    ...initialCategories,
    parentId,
    childId,
    l3Id,
  ])
  const selectedCategoryIds = [
    ...initialCategories,
    parentId,
    childId,
    l3Id,
  ]
  const children = sellerChildCategoryOptions(
    categories,
    parentId,
    selectedCategoryIds
  )
  const l3Options = sellerL3CategoryOptions(
    categories,
    childId,
    selectedCategoryIds
  )

  // Keep a durable code→value map so category switches can restore shared specs
  // without assigning a value to a different specification code.
  useEffect(() => {
    for (const field of infoFields) {
      const code = String(field.code || "").trim()
      if (!code) continue
      const raw = values[field.id]
      if (raw == null) continue
      if (String(raw).trim()) valuesByCodeRef.current.set(code, raw)
      else valuesByCodeRef.current.delete(code)
    }
  }, [infoFields, values])

  // When schema fields change (after category reload), show only current fields
  // and restore values for matching codes; never copy onto a different code.
  useEffect(() => {
    const resolved = resolveCategorySelection(categories, initialCategories)
    setParentId(resolved.parentId)
    setChildId(resolved.childId)
    setL3Id(resolved.l3Id)
    setValues((prev) => {
      for (const field of infoFields) {
        const code = String(field.code || "").trim()
        if (!code) continue
        const raw = prev[field.id]
        if (raw != null && String(raw).trim()) {
          valuesByCodeRef.current.set(code, raw)
        }
      }
      const next: Record<string, string> = {}
      for (const field of infoFields) {
        const code = String(field.code || "").trim()
        const fromServer = field.value || ""
        const fromCode = code ? valuesByCodeRef.current.get(code) : undefined
        // Prefer in-progress value for this code over empty server value on new def ids.
        next[field.id] =
          fromCode ??
          (fromServer && String(fromServer).trim() ? fromServer : "") ??
          ""
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when field set / linked categories change
  }, [fieldIdsKey, initialCategories.join("|")])

  function persistCategoryPath(next: {
    parentId: string
    childId: string
    l3Id: string
    filledSpecs: Attr[]
    previous: { parentId: string; childId: string; l3Id: string }
  }) {
    const normalized = normalizeCategoryAssignment(categories, {
      parentId: next.parentId,
      childId: next.childId,
      l3Id: next.l3Id,
    })
    if (!normalized.ok) {
      setParentId(next.previous.parentId)
      setChildId(next.previous.childId)
      setL3Id(next.previous.l3Id)
      setError(normalized.message)
      setErrorField("category_ids")
      return
    }
    setParentId(next.parentId)
    setChildId(next.childId)
    setL3Id(next.l3Id)
    setCategoryBusy(true)
    setError(null)
    setErrorField(null)
    void saveAdminProductCategories(props.productId, normalized.categoryIds)
      .then(async () => {
        setNotice(
          next.filledSpecs.length
            ? "Categorie opgeslagen. Productspecificaties zijn vernieuwd voor de nieuwe categorie; gemeenschappelijke codes behouden hun waarde."
            : "Categorie opgeslagen. Productspecificaties zijn vernieuwd."
        )
        await props.onSaved()
      })
      .catch((err: unknown) => {
        setParentId(next.previous.parentId)
        setChildId(next.previous.childId)
        setL3Id(next.previous.l3Id)
        const parsed = fieldError(err)
        setError(parsed.message)
        setErrorField(parsed.field)
      })
      .finally(() => setCategoryBusy(false))
  }

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
        Fabrikant (catalogusentiteit)
        <select className={inputClass} value={manufacturerId} onChange={(e) => setManufacturerId(e.target.value)}>
          <option value="">—</option>
          {manufacturerId && !(props.catalog.manufacturers || []).some((row) => row.id === manufacturerId) ? (
            <option value={manufacturerId}>{manufacturerId}</option>
          ) : null}
          {(props.catalog.manufacturers || []).map((row) => (
            <option key={row.id} value={row.id}>{row.name}</option>
          ))}
        </select>
        <span className="mt-1 block font-normal text-wf-500">
          Juridische fabrikant in de catalogus. GPSR-etiketnaam staat onder Compliance.
        </span>
        {errorField === "manufacturer_id" ? (
          <span className="mt-1 block font-normal text-amber-800">{error}</span>
        ) : null}
      </label>
      <div className="grid gap-2 tablet:grid-cols-3">
        <label className={labelClass}>
          Niveau 1
          <select
            className={inputClass}
            value={parentId}
            disabled={busy || categoryBusy}
            onChange={(e) => {
              const nextParent = e.target.value
              const previous = { parentId, childId, l3Id }
              const filledSpecs = productSpecFields.filter((field) =>
                Boolean((values[field.id] || field.value || "").trim())
              )
              if (
                filledSpecs.length &&
                parentId &&
                nextParent !== parentId &&
                typeof window !== "undefined" &&
                !window.confirm(
                  `Niveau 1 wijzigen? Ingevulde productspecificaties (${filledSpecs
                    .map((f) => f.name)
                    .join(", ")}) die niet in de nieuwe categorie bestaan, verdwijnen uit dit scherm. Waarden met dezelfde specificatiecode blijven behouden.`
                )
              ) {
                return
              }
              persistCategoryPath({
                parentId: nextParent,
                childId: "",
                l3Id: "",
                filledSpecs,
                previous,
              })
            }}
          >
            <option value="">—</option>
            {parents.map((row) => (
              <option key={row.id} value={row.id}>{row.name}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Niveau 2
          <select
            className={inputClass}
            value={childId}
            disabled={busy || categoryBusy || !parentId}
            onChange={(e) => {
              const nextChild = e.target.value
              const previous = { parentId, childId, l3Id }
              const filledSpecs = productSpecFields.filter((field) =>
                Boolean((values[field.id] || field.value || "").trim())
              )
              if (
                filledSpecs.length &&
                childId &&
                nextChild !== childId &&
                typeof window !== "undefined" &&
                !window.confirm(
                  `Niveau 2 wijzigen? Ingevulde productspecificaties (${filledSpecs
                    .map((f) => f.name)
                    .join(", ")}) die niet in de nieuwe categorie bestaan, verdwijnen uit dit scherm. Waarden met dezelfde specificatiecode blijven behouden.`
                )
              ) {
                return
              }
              persistCategoryPath({
                parentId,
                childId: nextChild,
                l3Id: "",
                filledSpecs,
                previous,
              })
            }}
          >
            <option value="">—</option>
            {children.map((row) => (
              <option key={row.id} value={row.id}>{row.name}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Niveau 3
          <select
            className={inputClass}
            value={l3Id}
            disabled={busy || categoryBusy || !childId}
            onChange={(e) => {
              const nextL3 = e.target.value
              const previous = { parentId, childId, l3Id }
              const filledSpecs = productSpecFields.filter((field) =>
                Boolean((values[field.id] || field.value || "").trim())
              )
              if (
                filledSpecs.length &&
                l3Id &&
                nextL3 !== l3Id &&
                typeof window !== "undefined" &&
                !window.confirm(
                  `Niveau 3 wijzigen? Ingevulde productspecificaties (${filledSpecs
                    .map((f) => f.name)
                    .join(", ")}) die niet in de nieuwe categorie bestaan, verdwijnen uit dit scherm. Waarden met dezelfde specificatiecode blijven behouden.`
                )
              ) {
                return
              }
              persistCategoryPath({
                parentId,
                childId,
                l3Id: nextL3,
                filledSpecs,
                previous,
              })
            }}
          >
            <option value="">—</option>
            {l3Options.map((row) => (
              <option key={row.id} value={row.id}>{row.name}</option>
            ))}
          </select>
        </label>
      </div>
      {categoryBusy ? (
        <p className="text-[11px] text-wf-500">Categorie wordt opgeslagen en specificaties vernieuwd…</p>
      ) : null}
      {productSpecFields.length ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-wf-800">
            Productspecificaties
            <span className="ml-1 font-normal text-wf-500">
              (max. 10, optioneel — namen volgen de gekozen subcategorie)
            </span>
          </p>
          <AttrInputs
            fields={productSpecFields}
            values={values}
            errorField={errorField}
            onChange={(id, value) => setValues((cur) => ({ ...cur, [id]: value }))}
          />
        </div>
      ) : null}
      {categoryKenmerkFields.length ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-wf-800">
            Categoriekenmerken
            <span className="ml-1 font-normal text-wf-500">
              (zoals Maat, Kleur — variantgebonden waar van toepassing)
            </span>
          </p>
          <AttrInputs
            fields={categoryKenmerkFields}
            values={values}
            errorField={errorField}
            onChange={(id, value) => setValues((cur) => ({ ...cur, [id]: value }))}
          />
        </div>
      ) : !productSpecFields.length ? (
        <p className="text-[11px] text-wf-500">
          Geen categoriegebonden kenmerken of productspecificaties voor de huidige categoriekoppeling.
        </p>
      ) : null}
      <SaveBar
        busy={busy}
        notice={notice}
        error={errorField === "ean" || errorField === "mpn" || errorField === "manufacturer_id" ? null : error}
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
            category_ids: [parentId, childId, l3Id].filter(Boolean),
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
  const sourceLanguage = String(props.product.source_language_code || "nl")
  const existing = (props.product.translations || []) as Array<{
    field_name: string
    language_code: string
    value: string
  }>
  const pick = (field: string) =>
    existing.find((row) => row.field_name === field && row.language_code === sourceLanguage)
      ?.value || ""
  const [shortDescription, setShortDescription] = useState(pick("short_description"))
  const [description, setDescription] = useState(String(props.product.description ?? ""))
  const initialUsps = pick("usps")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const [uspFields, setUspFields] = useState<string[]>(() => {
    const cols = Array.from({ length: 5 }, (_, i) => initialUsps[i] || "")
    if (initialUsps.length > 5) {
      cols[4] = initialUsps.slice(4).join("\n")
    }
    return cols
  })
  const [specifications, setSpecifications] = useState(pick("specifications"))
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-wf-600">
        Zelfde tekstvelden als in de importtemplates. Korte omschrijving, USP&apos;s en
        specificaties worden in de brontaal ({sourceLanguage.toUpperCase()}) bewaard;
        de uitgebreide beschrijving staat op de productversie.
      </p>
      <label className={labelClass}>
        Korte omschrijving
        <textarea
          className="mt-1 min-h-20 w-full resize-y rounded border border-wf-400 px-2 py-2 text-xs font-normal"
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
        />
      </label>
      <label className={labelClass}>
        Uitgebreide beschrijving
        <textarea
          className="mt-1 min-h-48 w-full resize-y rounded border border-wf-400 px-2 py-2 text-xs font-normal"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-wf-800">
          Belangrijkste kenmerken / USP&apos;s
        </p>
        <p className="text-[10px] font-normal text-wf-500">
          Elk kenmerk in een apart veld (zelfde structuur als Excel). Geen
          categoriekenmerken zoals maat/kleur.
        </p>
        {uspFields.map((value, idx) => (
          <label key={`usp-${idx + 1}`} className={labelClass}>
            Belangrijkste kenmerk {idx + 1}
            <input
              className="mt-1 h-9 w-full rounded border border-wf-400 px-2 text-xs font-normal"
              value={value}
              onChange={(e) => {
                const next = [...uspFields]
                next[idx] = e.target.value
                setUspFields(next)
              }}
            />
          </label>
        ))}
      </div>
      <label className={labelClass}>
        Productspecificaties
        <textarea
          className="mt-1 min-h-24 w-full resize-y rounded border border-wf-400 px-2 py-2 text-xs font-normal"
          value={specifications}
          onChange={(e) => setSpecifications(e.target.value)}
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
          const usps = uspFields.map((v) => v.trim()).filter(Boolean).join("\n")
          void saveAdminProductSection(props.productId, {
            section: "description",
            description,
            short_description: shortDescription,
            usps,
            specifications,
            source_language_code: sourceLanguage,
          })
            .then(async () => {
              setNotice("Beschrijving en tekstvelden opgeslagen. De beoordeling is niet gewijzigd.")
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
  const fields = dedupeAttrsByCode(
    ((props.product.schema || []) as Attr[]).filter((field) => {
      if (!field.code || !COMPLIANCE_CODES.has(field.code)) return false
      return group === "ce" ? CE_CODES.has(field.code) : !CE_CODES.has(field.code)
    })
  )
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
