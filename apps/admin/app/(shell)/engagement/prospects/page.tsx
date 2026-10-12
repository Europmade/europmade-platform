"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Notice } from "@europmade/ui"
import {
  EngagementAdminApiError,
  ONBOARDING_STATUSES,
  SELECTABLE_ORGANIZATION_ROLES,
  OUTREACH_STATUSES,
  SALES_MODELS,
  createEngagementOrganization,
  eventStatusLabel,
  formatEngagementDate,
  listEngagementOrganizations,
  onboardingLabel,
  outreachStatusLabel,
  roleLabel,
  salesModelLabel,
  sourceChoices,
  sourceLabel,
  DEFAULT_OUTREACH_PURPOSE,
  type EngagementOrganization,
} from "../../../../lib/engagement-admin-api"
import { listTaxonomyCategories, type AdminTaxonomyCategory } from "../../../../lib/category-admin-api"
import { ProspectImportWizard } from "./_components/import-wizard"

const fieldClass =
  "mt-1 h-8 w-full rounded border border-wf-400 bg-white px-2 text-xs text-wf-900"

function messageOf(err: unknown, fallback: string): string {
  return err instanceof EngagementAdminApiError ? err.message : fallback
}

function primaryContact(organization: EngagementOrganization) {
  return organization.contacts[0] ?? null
}

function listMeta(organization: EngagementOrganization): string {
  const roleText = organization.roles.length
    ? organization.roles.map(roleLabel).join(", ")
    : "Onbekend"
  const salesText = salesModelLabel(organization.sales_model)
  const identity =
    roleText === "Onbekend" && salesText === "Onbekend"
      ? "Onbekend"
      : `${roleText} · ${salesText}`
  return [organization.website, identity].filter(Boolean).join(" · ")
}

export default function EngagementProspectsPage() {
  const [rows, setRows] = useState<EngagementOrganization[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [role, setRole] = useState("")
  const [salesModel, setSalesModel] = useState("")
  const [onboarding, setOnboarding] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [hideList, setHideList] = useState(false)
  const hideTimer = useRef<number | null>(null)
  const router = useRouter()

  function load(filters?: {
    q?: string
    status?: string
    role?: string
    sales_model?: string
    onboarding?: string
  }) {
    setLoading(true)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setHideList(true), 200)
    return listEngagementOrganizations(filters)
      .then((res) => {
        setRows(res.organizations)
        setCount(res.count)
        setError(null)
      })
      .catch((err: unknown) => {
        setError(messageOf(err, "Prospects laden mislukt."))
        setRows([])
        setCount(0)
      })
      .finally(() => {
        if (hideTimer.current) window.clearTimeout(hideTimer.current)
        setHideList(false)
        setLoading(false)
      })
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const statusParam = params.get("status") ?? ""
    const onboardingParam = params.get("onboarding") ?? ""
    if (statusParam) setStatus(statusParam)
    if (onboardingParam) setOnboarding(onboardingParam)
    load({
      status: statusParam || undefined,
      onboarding: onboardingParam || undefined,
    })
  }, [])

  const filters = {
    q,
    status,
    role,
    sales_model: salesModel,
    onboarding,
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">Prospects</h1>
          <p className="mt-1 text-xs text-wf-600">
            Bedrijven en hun contactpersonen. Er wordt niets verzonden.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="h-8 rounded border border-wf-400 bg-white px-3 text-[11px] font-medium text-wf-900"
            onClick={() => setImportOpen(true)}
          >
            Importeren
          </button>
          <button
            type="button"
            className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white"
            onClick={() => setDialogOpen(true)}
          >
            + Nieuw prospect
          </button>
        </div>
      </div>

      <form
        className="mt-3 grid gap-2 rounded-lg border border-wf-300 bg-white p-2 sm:grid-cols-2 lg:grid-cols-6"
        onSubmit={(event) => {
          event.preventDefault()
          void load(filters)
        }}
      >
        <label className="text-[11px] text-wf-600 lg:col-span-2">
          Zoeken
          <input
            className={fieldClass}
            value={q}
            placeholder="Bedrijf, contact of e-mail"
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              void load({ ...filters, q: event.currentTarget.value })
            }}
          />
        </label>
        <label className="text-[11px] text-wf-600">
          Status
          <select className={fieldClass} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Alle</option>
            {OUTREACH_STATUSES.map((item) => (
              <option key={item} value={item}>
                {outreachStatusLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-wf-600">
          Rol
          <select className={fieldClass} value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">Alle</option>
            {SELECTABLE_ORGANIZATION_ROLES.map((item) => (
              <option key={item} value={item}>
                {roleLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-wf-600">
          Verkoopmodel
          <select
            className={fieldClass}
            value={salesModel}
            onChange={(event) => setSalesModel(event.target.value)}
          >
            <option value="">Alle</option>
            {SALES_MODELS.map((item) => (
              <option key={item} value={item}>
                {salesModelLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-wf-600">
          Onboarding
          <select
            className={fieldClass}
            value={onboarding}
            onChange={(event) => setOnboarding(event.target.value)}
          >
            <option value="">Alle</option>
            <option value="not_started">Nog niet gestart</option>
            {ONBOARDING_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2 lg:col-span-6">
          <button
            type="submit"
            className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
            disabled={loading}
          >
            Filteren
          </button>
          <button
            type="button"
            className="h-8 rounded border border-wf-400 px-3 text-[11px] text-wf-800"
            onClick={() => {
              setQ("")
              setStatus("")
              setRole("")
              setSalesModel("")
              setOnboarding("")
              void load({})
            }}
          >
            Wissen
          </button>
          <span className="text-[11px] text-wf-500">
            {loading ? "Laden…" : `${count} prospect${count === 1 ? "" : "s"}`}
          </span>
        </div>
      </form>

      {error ? (
        <div className="mt-3">
          <Notice variant="warning">{error}</Notice>
        </div>
      ) : null}

      <div className="mt-3 overflow-hidden rounded-lg border border-wf-300 bg-white">
        {hideList || (loading && rows.length === 0) ? (
          <p className="px-3 py-4 text-xs text-wf-600">
            {hideList ? "Zoeken…" : "Laden…"}
          </p>
        ) : !loading && rows.length === 0 ? (
          <p className="px-3 py-4 text-xs text-wf-500">Geen prospects.</p>
        ) : (
          rows.map((row) => {
            const contact = primaryContact(row)
            const meta = listMeta(row)
            return (
              <Link
                key={row.id}
                href={`/engagement/prospects/${row.id}`}
                className="block border-b border-wf-200 px-3 py-2 last:border-b-0 hover:bg-wf-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-wf-900">{row.company_name}</div>
                    <div className="truncate text-[11px] text-wf-600">{meta || "—"}</div>
                    <div className="truncate text-[11px] text-wf-700">
                      {contact
                        ? `${contact.name || "Contact"} · ${contact.email}`
                        : "Geen contactpersoon"}
                    </div>
                    {row.last_communication ? (
                      <div className="mt-0.5 text-[11px] text-wf-500">
                        {formatEngagementDate(row.last_communication.created_at)}
                        {" · "}
                        {row.last_communication.template_name || "Bericht"}
                        {" · "}
                        {eventStatusLabel(row.last_communication.status)}
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right text-[11px]">
                    <div className="font-medium text-wf-900">
                      {outreachStatusLabel(row.outreach_status)}
                    </div>
                    <div className="text-wf-600">Onboarding: {onboardingLabel(row)}</div>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
      {dialogOpen ? (
        <NewProspectDialog
          onClose={() => setDialogOpen(false)}
          onCreated={(organizationId) => {
            setDialogOpen(false)
            router.push(`/engagement/prospects/${organizationId}`)
          }}
        />
      ) : null}
      {importOpen ? (
        <ProspectImportWizard
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false)
            void load()
          }}
        />
      ) : null}
    </div>
  )
}

function NewProspectDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (organizationId: string) => void
}) {
  const [companyName, setCompanyName] = useState("")
  const [website, setWebsite] = useState("")
  const [category, setCategory] = useState("")
  const [role, setRole] = useState("")
  const [salesModel, setSalesModel] = useState("")
  const [purpose, setPurpose] = useState(DEFAULT_OUTREACH_PURPOSE)
  const [source, setSource] = useState("handmatig")
  const [categories, setCategories] = useState<AdminTaxonomyCategory[]>([])

  useEffect(() => {
    listTaxonomyCategories()
      .then((result) => setCategories(result.categories))
      .catch(() => setCategories([]))
  }, [])
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog">
      <form
        className="w-full max-w-3xl rounded-lg border border-wf-300 bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault()
          setSaving(true)
          setError(null)
          createEngagementOrganization({
            company_name: companyName,
            website,
            category,
            sales_model: salesModel || "unknown",
            outreach_status: "nieuw",
            source: source || "handmatig",
            outreach_purpose: purpose.trim() || DEFAULT_OUTREACH_PURPOSE,
            self_classification_payload: null,
            roles: role ? [role] : undefined,
            contact_name: contactName,
            contact_email: contactEmail,
          })
            .then((organization) => {
              onCreated(organization.id)
            })
            .catch((err: unknown) => {
              setError(messageOf(err, "Prospect aanmaken mislukt."))
              setSaving(false)
            })
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-wf-900">Nieuw prospect</h2>
          <button type="button" className="text-[11px] text-wf-600" onClick={onClose}>
            Sluiten
          </button>
        </div>
        {error ? (
          <div className="mt-2">
            <Notice variant="warning">{error}</Notice>
          </div>
        ) : null}
        <div className="mt-3 grid items-start gap-3 sm:grid-cols-2">
          <fieldset className="rounded-lg border border-wf-300 p-3">
            <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
              Bedrijfsgegevens
            </legend>
            <label className="block text-[11px] text-wf-600">
              Bedrijfsnaam *
              <input className={fieldClass} required value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            </label>
            <label className="mt-2 block text-[11px] text-wf-600">
              Website
              <input className={fieldClass} value={website} onChange={(event) => setWebsite(event.target.value)} />
            </label>
            <label className="mt-2 block text-[11px] text-wf-600">
              Categorie
              <select className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">Geen categorie</option>
                {category && !categories.some((item) => item.name === category) ? (
                  <option value={category}>{category}</option>
                ) : null}
                {categories.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-2 block text-[11px] text-wf-600">
              Contactpersoon
              <input className={fieldClass} value={contactName} onChange={(event) => setContactName(event.target.value)} />
            </label>
            <label className="mt-2 block text-[11px] text-wf-600">
              E-mail *
              <input
                className={fieldClass}
                required
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
              />
            </label>
          </fieldset>
          <fieldset className="rounded-lg border border-wf-300 p-3">
            <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
              Benadering
            </legend>
            <label className="block text-[11px] text-wf-600">
              Rol
              <select className={fieldClass} value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="">Geen rol</option>
                {SELECTABLE_ORGANIZATION_ROLES.map((item) => (
                  <option key={item} value={item}>
                    {roleLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-2 block text-[11px] text-wf-600">
              Verkoopmodel
              <select className={fieldClass} value={salesModel} onChange={(event) => setSalesModel(event.target.value)}>
                <option value="">Geen verkoopmodel</option>
                {SALES_MODELS.map((item) => (
                  <option key={item} value={item}>
                    {salesModelLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-2 block text-[11px] text-wf-600">
              Doel van benadering
              <textarea
                className="mt-1 min-h-[72px] w-full rounded border border-wf-400 bg-white px-2 py-1.5 text-xs text-wf-900"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
              />
            </label>
            <label className="mt-2 block text-[11px] text-wf-600">
              Bron
              <select className={fieldClass} value={source} onChange={(event) => setSource(event.target.value)}>
                {sourceChoices(source).map((item) => (
                  <option key={item} value={item}>
                    {sourceLabel(item)}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
            disabled={saving}
          >
            Opslaan
          </button>
        </div>
      </form>
    </div>
  )
}
