"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button, Input, Notice } from "@europmade/ui"
import {
  CategoryAdminApiError,
  addCategoryRedirect,
  createTaxonomyCategory,
  decideCategoryProposal,
  getTaxonomyCategory,
  listCategoryProposals,
  listTaxonomyCategories,
  patchTaxonomyCategory,
  type AdminTaxonomyCategory,
  type CategoryProposalRow,
  type CategoryRedirectRow,
  type CategoryTranslationRow,
} from "../../../../lib/category-admin-api"
import {
  ProductCloudTranslationsApiError,
  saveManualTranslation,
} from "../../../../lib/product-cloud-translations-api"

const LOCALES = ["nl", "en", "de", "fr"] as const

/**
 * Minimale Admin Category UI (ADR-0042) — pc_category CRUD + vertalingen + redirects.
 */
export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminTaxonomyCategory[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [parentId, setParentId] = useState("")
  const [createName, setCreateName] = useState("")
  const [createSlug, setCreateSlug] = useState("")
  const [createParent, setCreateParent] = useState("")
  const [translations, setTranslations] = useState<CategoryTranslationRow[]>([])
  const [redirects, setRedirects] = useState<CategoryRedirectRow[]>([])
  const [proposals, setProposals] = useState<CategoryProposalRow[]>([])
  const [localeValues, setLocaleValues] = useState<Record<string, string>>({
    nl: "",
    en: "",
    de: "",
    fr: "",
  })
  const [fromSlug, setFromSlug] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const selected = useMemo(
    () => categories.find((c) => c.id === selectedId) ?? null,
    [categories, selectedId]
  )

  const loadList = useCallback(async () => {
    const res = await listTaxonomyCategories()
    setCategories(res.categories)
    return res.categories
  }, [])

  const loadDetail = useCallback(async (id: string) => {
    const res = await getTaxonomyCategory(id)
    setName(res.category.name)
    setSlug(res.category.slug ?? "")
    setParentId(res.category.parent_category_id ?? "")
    setTranslations(res.translations)
    setRedirects(res.redirects)
    const next: Record<string, string> = { nl: "", en: "", de: "", fr: "" }
    for (const row of res.translations) {
      if (row.field_name === "name" && row.language_code in next) {
        next[row.language_code] = row.value
      }
    }
    setLocaleValues(next)
  }, [])

  const loadProposals = useCallback(async () => {
    const res = await listCategoryProposals()
    setProposals(res.proposals)
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const list = await loadList()
        await loadProposals()
        setSelectedId((current) => current || list[0]?.id || "")
      } catch (err) {
        setError(
          err instanceof CategoryAdminApiError
            ? err.message
            : "Categorieën laden mislukt."
        )
      }
    })()
  }, [loadList, loadProposals])

  useEffect(() => {
    if (!selectedId) return
    void loadDetail(selectedId).catch((err: unknown) => {
      setError(
        err instanceof CategoryAdminApiError
          ? err.message
          : "Categorie laden mislukt."
      )
    })
  }, [selectedId, loadDetail])

  async function handleCreate() {
    setBusy(true)
    setError(null)
    try {
      const res = await createTaxonomyCategory({
        name: createName,
        slug: createSlug || undefined,
        parent_category_id: createParent || null,
        seed_attributes: false,
      })
      setNotice("Categorie aangemaakt.")
      setCreateName("")
      setCreateSlug("")
      setCreateParent("")
      const list = await loadList()
      const id = res.category.id
      if (list.some((c) => c.id === id)) setSelectedId(id)
    } catch (err) {
      setError(
        err instanceof CategoryAdminApiError ? err.message : "Aanmaken mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleSave() {
    if (!selectedId) return
    setBusy(true)
    setError(null)
    try {
      await patchTaxonomyCategory(selectedId, {
        name,
        slug: slug || null,
        parent_category_id: parentId || null,
      })
      setNotice("Categorie bijgewerkt.")
      await loadList()
      await loadDetail(selectedId)
    } catch (err) {
      setError(
        err instanceof CategoryAdminApiError ? err.message : "Opslaan mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveTranslation(locale: string) {
    if (!selectedId) return
    setBusy(true)
    setError(null)
    try {
      await saveManualTranslation({
        entity_type: "category",
        entity_id: selectedId,
        field_name: "name",
        language_code: locale,
        value: localeValues[locale] ?? "",
        publish: true,
      })
      setNotice(`Vertaling ${locale} opgeslagen.`)
      await loadDetail(selectedId)
    } catch (err) {
      setError(
        err instanceof ProductCloudTranslationsApiError
          ? err.message
          : "Vertaling opslaan mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleAddRedirect() {
    if (!selectedId || !fromSlug.trim()) return
    setBusy(true)
    setError(null)
    try {
      await addCategoryRedirect(selectedId, fromSlug.trim(), slug || undefined)
      setFromSlug("")
      setNotice("Redirect opgeslagen.")
      await loadDetail(selectedId)
    } catch (err) {
      setError(
        err instanceof CategoryAdminApiError
          ? err.message
          : "Redirect opslaan mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleProposal(id: string, decision: "accept" | "reject") {
    setBusy(true)
    setError(null)
    try {
      await decideCategoryProposal(id, decision)
      setNotice(decision === "accept" ? "Voorstel geaccepteerd." : "Voorstel afgewezen.")
      await loadProposals()
      await loadList()
    } catch (err) {
      setError(
        err instanceof CategoryAdminApiError
          ? err.message
          : "Voorstel bijwerken mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Producten &gt; <b className="font-semibold text-wf-800">Categorieën</b>
      </p>
      <h1 className="text-lg font-bold text-wf-900">Categorieën</h1>
      <p className="mt-1.5 max-w-2xl text-xs text-wf-600">
        Canonieke taxonomie (`pc_category`). Actief/inactief en volgorde zitten
        niet in het model (P2). Soft-delete is geen publicatiestatus.
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}
      {notice ? (
        <Notice variant="info" className="mt-4">
          {notice}
        </Notice>
      ) : null}

      <section className="mt-6 rounded-lg border border-wf-200 bg-white p-4">
        <h2 className="text-sm font-bold text-wf-900">Nieuwe categorie</h2>
        <div className="mt-3 grid gap-2 tablet:grid-cols-3">
          <Input
            label="Naam"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
          <Input
            label="Slug"
            value={createSlug}
            onChange={(e) => setCreateSlug(e.target.value)}
          />
          <label className="block text-[11px] font-semibold text-wf-700">
            Parent
            <select
              className="mt-1 h-9 w-full rounded border border-wf-300 px-2 text-xs"
              value={createParent}
              onChange={(e) => setCreateParent(e.target.value)}
            >
              <option value="">— top-level —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button
          className="mt-3"
          type="button"
          disabled={busy || !createName.trim()}
          onClick={() => void handleCreate()}
        >
          Aanmaken
        </Button>
      </section>

      <div className="mt-6 grid gap-4 desktop:grid-cols-[280px_1fr]">
        <ul className="rounded-lg border border-wf-200 bg-white">
          {categories.map((c) => (
            <li key={c.id} className="border-b border-wf-100 last:border-b-0">
              <button
                type="button"
                className={`w-full px-3 py-2 text-left text-xs ${
                  c.id === selectedId ? "bg-wf-100 font-semibold" : ""
                }`}
                onClick={() => setSelectedId(c.id)}
              >
                {c.name}
                <span className="mt-0.5 block text-[10px] font-normal text-wf-500">
                  {c.slug ?? "geen slug"}
                  {c.parent_category_id ? " · child" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {selected ? (
          <div className="space-y-4">
            <section className="rounded-lg border border-wf-200 bg-white p-4">
              <h2 className="text-sm font-bold text-wf-900">Wijzigen</h2>
              <div className="mt-3 grid gap-2 tablet:grid-cols-2">
                <Input
                  label="Naam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  label="Slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
                <label className="block text-[11px] font-semibold text-wf-700 tablet:col-span-2">
                  Parent
                  <select
                    className="mt-1 h-9 w-full rounded border border-wf-300 px-2 text-xs"
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                  >
                    <option value="">— top-level —</option>
                    {categories
                      .filter((c) => c.id !== selectedId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <Button
                className="mt-3"
                type="button"
                disabled={busy}
                onClick={() => void handleSave()}
              >
                Opslaan
              </Button>
            </section>

            <section className="rounded-lg border border-wf-200 bg-white p-4">
              <h2 className="text-sm font-bold text-wf-900">Vertalingen (naam)</h2>
              <div className="mt-3 grid gap-2 tablet:grid-cols-2">
                {LOCALES.map((locale) => (
                  <div key={locale}>
                    <Input
                      label={locale.toUpperCase()}
                      value={localeValues[locale] ?? ""}
                      onChange={(e) =>
                        setLocaleValues((prev) => ({
                          ...prev,
                          [locale]: e.target.value,
                        }))
                      }
                    />
                    <Button
                      className="mt-1"
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void handleSaveTranslation(locale)}
                    >
                      Opslaan {locale}
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-wf-200 bg-white p-4">
              <h2 className="text-sm font-bold text-wf-900">Slug-redirects (301)</h2>
              <p className="mt-1 text-[11px] text-wf-500">
                Opgeslagen in bestaande `pc_translation` (field former_slug), geen
                extra databasekolom.
              </p>
              <ul className="mt-2 text-xs text-wf-700">
                {redirects.length === 0 ? (
                  <li>Geen redirects.</li>
                ) : (
                  redirects.map((r) => (
                    <li key={r.id}>
                      /{r.from_slug} → /{r.to_slug}
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Input
                  label="Oude slug"
                  value={fromSlug}
                  onChange={(e) => setFromSlug(e.target.value)}
                />
                <Button
                  type="button"
                  disabled={busy || !fromSlug.trim()}
                  onClick={() => void handleAddRedirect()}
                >
                  Redirect toevoegen
                </Button>
              </div>
            </section>
          </div>
        ) : null}
      </div>

      <section className="mt-6 rounded-lg border border-wf-200 bg-white p-4">
        <h2 className="text-sm font-bold text-wf-900">Seller-voorstellen</h2>
        {proposals.length === 0 ? (
          <p className="mt-2 text-xs text-wf-500">Geen open voorstellen.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {proposals.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-wf-100 pb-2 text-xs"
              >
                <span>
                  {p.name}{" "}
                  <span className="text-wf-500">({p.suggested_slug})</span>
                </span>
                <span className="flex gap-2">
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleProposal(p.id, "accept")}
                  >
                    Accepteren
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void handleProposal(p.id, "reject")}
                  >
                    Afwijzen
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
