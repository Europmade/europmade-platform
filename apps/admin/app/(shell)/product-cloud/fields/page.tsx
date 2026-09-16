"use client"

import { useEffect, useState } from "react"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import {
  ProductFieldsAdminApiError,
  createCategoryAttribute,
  listAdminCategories,
  listCategoryAttributes,
  patchCategoryAttribute,
  suggestCategoryAttributes,
  type AdminAttribute,
  type AdminCategory,
} from "../../../../lib/product-fields-admin-api"

const TIERS = [
  "category_required",
  "recommended",
  "optional",
  "compliance_required",
] as const

/**
 * Admin beheer van productvelden per categorie.
 */
export default function ProductFieldsPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [categoryId, setCategoryId] = useState("")
  const [fields, setFields] = useState<AdminAttribute[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({
    name: "",
    code: "",
    data_type: "Numeriek",
    requirement_tier: "optional",
    unit: "",
    help_text: "",
    sort_order: "100",
  })

  async function loadCategories() {
    try {
      const res = await listAdminCategories()
      setCategories(res.categories)
      if (!categoryId && res.categories[0]) setCategoryId(res.categories[0].id)
    } catch (err) {
      setError(
        err instanceof ProductFieldsAdminApiError
          ? err.message
          : "Categorieën laden mislukt."
      )
    }
  }

  async function loadFields(id: string) {
    if (!id) return
    try {
      const res = await listCategoryAttributes(id)
      setFields(res.attribute_definitions)
    } catch (err) {
      setError(
        err instanceof ProductFieldsAdminApiError
          ? err.message
          : "Velden laden mislukt."
      )
    }
  }

  useEffect(() => {
    void loadCategories()
  }, [])

  useEffect(() => {
    if (categoryId) void loadFields(categoryId)
  }, [categoryId])

  async function saveField(field: AdminAttribute, patch: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    try {
      await patchCategoryAttribute(categoryId, field.id, patch)
      await loadFields(categoryId)
      setNotice("Veld bijgewerkt.")
    } catch (err) {
      setError(
        err instanceof ProductFieldsAdminApiError
          ? err.message
          : "Opslaan mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  async function addField() {
    setBusy(true)
    setError(null)
    try {
      await createCategoryAttribute(categoryId, {
        name: draft.name,
        code: draft.code,
        data_type: draft.data_type,
        requirement_tier: draft.requirement_tier,
        unit: draft.unit || null,
        help_text: draft.help_text || null,
        sort_order: Number(draft.sort_order) || 100,
        is_active: true,
      })
      setDraft({
        name: "",
        code: "",
        data_type: "Numeriek",
        requirement_tier: "optional",
        unit: "",
        help_text: "",
        sort_order: "100",
      })
      await loadFields(categoryId)
      setNotice("Veld toegevoegd.")
    } catch (err) {
      setError(
        err instanceof ProductFieldsAdminApiError
          ? err.message
          : "Toevoegen mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  async function askAi() {
    if (!categoryId) return
    setBusy(true)
    try {
      const res = await suggestCategoryAttributes(categoryId)
      setAiMessage(res.message)
    } catch (err) {
      setError(
        err instanceof ProductFieldsAdminApiError
          ? err.message
          : "AI-voorstel mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">Productvelden</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Beheer verplichte, aanbevolen en optionele velden per productcategorie.
        AI mag geen compliance-verplichtingen bepalen.
      </p>

      {error ? (
        <div className="mt-4">
          <Notice variant="warning">{error}</Notice>
        </div>
      ) : null}
      {notice ? (
        <div className="mt-4">
          <Notice variant="info">{notice}</Notice>
        </div>
      ) : null}

      <div className="mt-4">
        <label className="mb-1 block text-[11px] font-semibold uppercase text-wf-500">
          Categorie
        </label>
        <select
          className="h-9 rounded border border-wf-400 bg-white px-2 text-xs"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 space-y-2">
        {fields.map((field) => (
          <article
            key={field.id}
            className="rounded border border-wf-300 bg-white p-3 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold text-wf-900">
                  {field.name}{" "}
                  <span className="font-normal text-wf-500">
                    ({field.code})
                  </span>
                </p>
                <p className="mt-1 text-wf-600">
                  {field.data_type}
                  {field.unit ? ` · ${field.unit}` : ""} ·{" "}
                  {field.requirement_tier || "optional"}
                </p>
              </div>
              <Badge>
                {field.is_active === false ? "Inactief" : "Actief"}
              </Badge>
            </div>
            <div className="mt-2 grid gap-2 tablet:grid-cols-3">
              <select
                className="h-8 rounded border border-wf-400 px-2"
                value={field.requirement_tier || "optional"}
                onChange={(e) =>
                  void saveField(field, { requirement_tier: e.target.value })
                }
              >
                {TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
              <Input
                label="Sortering"
                value={String(field.sort_order ?? 0)}
                onChange={(e) =>
                  void saveField(field, {
                    sort_order: Number(e.target.value) || 0,
                  })
                }
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void saveField(field, { is_active: field.is_active === false })
                }
              >
                {field.is_active === false ? "Activeren" : "Deactiveren"}
              </Button>
            </div>
            <Input
              label="Helptekst"
              value={field.help_text || ""}
              onChange={(e) =>
                void saveField(field, { help_text: e.target.value })
              }
            />
          </article>
        ))}
      </div>

      <div className="mt-6 rounded border border-wf-300 bg-white p-3">
        <h2 className="text-xs font-bold">Nieuw veld</h2>
        <div className="mt-2 grid gap-2 tablet:grid-cols-2">
          <Input
            label="Veldnaam"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Input
            label="Technische key"
            value={draft.code}
            onChange={(e) => setDraft({ ...draft, code: e.target.value })}
          />
          <Input
            label="Eenheid"
            value={draft.unit}
            onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
          />
          <Input
            label="Helptekst"
            value={draft.help_text}
            onChange={(e) => setDraft({ ...draft, help_text: e.target.value })}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <select
            className="h-8 rounded border border-wf-400 px-2 text-xs"
            value={draft.data_type}
            onChange={(e) => setDraft({ ...draft, data_type: e.target.value })}
          >
            <option>Numeriek</option>
            <option>Keuzelijst</option>
            <option>Tekst-met-eenheid</option>
          </select>
          <select
            className="h-8 rounded border border-wf-400 px-2 text-xs"
            value={draft.requirement_tier}
            onChange={(e) =>
              setDraft({ ...draft, requirement_tier: e.target.value })
            }
          >
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
          <Button size="sm" disabled={busy} onClick={() => void addField()}>
            Toevoegen
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void askAi()}
        >
          AI-voorstellen (architectuur)
        </Button>
        {aiMessage ? (
          <p className="mt-2 text-xs text-wf-600">{aiMessage}</p>
        ) : null}
      </div>
    </div>
  )
}
