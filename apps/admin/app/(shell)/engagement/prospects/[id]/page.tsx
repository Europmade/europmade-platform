"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Notice } from "@europmade/ui"
import {
  EngagementAdminApiError,
  SELECTABLE_ORGANIZATION_ROLES,
  OUTREACH_STATUSES,
  SALES_MODELS,
  addEngagementOrganizationRole,
  createEngagementContact,
  eventStatusLabel,
  getEngagementOrganization,
  listEngagementEvents,
  onboardingLabel,
  outreachStatusLabel,
  removeEngagementOrganizationRole,
  roleLabel,
  salesModelLabel,
  sourceChoices,
  sourceLabel,
  updateEngagementContact,
  updateEngagementOrganization,
  DEFAULT_OUTREACH_PURPOSE,
  type EngagementEvent,
  type EngagementOrganization,
} from "../../../../../lib/engagement-admin-api"
import { listTaxonomyCategories, type AdminTaxonomyCategory } from "../../../../../lib/category-admin-api"

const fieldClass =
  "mt-1 h-8 w-full rounded border border-wf-400 bg-white px-2 text-xs text-wf-900"

const CONVERSION_LABELS = {
  customer: "Heeft een account",
  seller: "Partner",
  both: "Partner met account",
  none: "Nog geen partner",
} as const

function prospectWhen(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(date)
}

function messageOf(err: unknown, fallback: string): string {
  return err instanceof EngagementAdminApiError ? err.message : fallback
}

function classificationLines(
  payload: Record<string, unknown> | null
): { label: string; value: string }[] {
  if (!payload) return []
  return Object.entries(payload)
    .filter(([, value]) => value != null && typeof value !== "object")
    .map(([key, value]) => ({
      label: key.replaceAll("_", " "),
      value: String(value),
    }))
}

function statusOptions(current: string): { value: string; label: string }[] {
  const options = OUTREACH_STATUSES.map((item) => ({
    value: item === "nieuw" && current === "new" ? "new" : item,
    label: outreachStatusLabel(item),
  }))
  if (
    current &&
    current !== "new" &&
    !OUTREACH_STATUSES.includes(current as (typeof OUTREACH_STATUSES)[number])
  ) {
    return [{ value: current, label: outreachStatusLabel(current) }, ...options]
  }
  return options
}

export default function EngagementProspectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [row, setRow] = useState<EngagementOrganization | null>(null)
  const [events, setEvents] = useState<EngagementEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState("")
  const [website, setWebsite] = useState("")
  const [category, setCategory] = useState("")
  const [salesModel, setSalesModel] = useState("unknown")
  const [source, setSource] = useState("")
  const [purpose, setPurpose] = useState("")
  const [saving, setSaving] = useState(false)
  const [role, setRole] = useState("brand")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [confirmRole, setConfirmRole] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [categories, setCategories] = useState<AdminTaxonomyCategory[]>([])

  function apply(organization: EngagementOrganization) {
    setRow(organization)
    setCompanyName(organization.company_name)
    setWebsite(organization.website ?? "")
    setCategory(organization.category ?? "")
    setSalesModel(organization.sales_model || "unknown")
    setSource(organization.source)
    setPurpose(organization.outreach_purpose?.trim() || DEFAULT_OUTREACH_PURPOSE)
    const nextRole = SELECTABLE_ORGANIZATION_ROLES.find((item) => !organization.roles.includes(item))
    if (nextRole) setRole(nextRole)
    setConfirmRole(null)
  }

  function load(organizationId: string) {
    return Promise.all([
      getEngagementOrganization(organizationId),
      listEngagementEvents({ organization_id: organizationId }).catch(() => ({
        events: [] as EngagementEvent[],
        count: 0,
      })),
    ]).then(([organization, history]) => {
      apply(organization)
      setEvents(history.events)
      setError(null)
    })
  }

  useEffect(() => {
    listTaxonomyCategories()
      .then((result) => setCategories(result.categories))
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    load(id)
      .catch((err: unknown) => {
        if (cancelled) return
        setError(messageOf(err, "Prospect laden mislukt."))
        setRow(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function persist(next: Partial<EngagementOrganization> & { outreach_status?: string }) {
    if (!row) return
    const organization = await updateEngagementOrganization(row.id, {
      company_name: next.company_name ?? companyName,
      website: next.website ?? website,
      category: next.category ?? category,
      sales_model: next.sales_model ?? salesModel,
      outreach_status: next.outreach_status ?? row.outreach_status,
      source: next.source ?? source,
      outreach_purpose: next.outreach_purpose ?? purpose,
      self_classification_payload: row.self_classification_payload,
    })
    apply(organization)
  }

  const lines = classificationLines(row?.self_classification_payload ?? null)

  return (
    <div>
      <Link href="/engagement/prospects" className="text-[11px] text-wf-700 underline">
        Terug naar prospects
      </Link>
      {error ? (
        <div className="mt-3">
          <Notice variant="warning">{error}</Notice>
        </div>
      ) : null}
      {loading ? <p className="mt-3 text-xs text-wf-600">Laden…</p> : null}
      {row ? (
        <>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-[19px] font-bold text-wf-900">{row.company_name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                <label className="text-wf-600">
                  Status
                  <select
                    className="ml-1 h-7 rounded border border-wf-400 bg-white px-2"
                    value={row.outreach_status}
                    onChange={(event) => {
                      const next = event.target.value
                      persist({ outreach_status: next }).catch((err: unknown) => {
                        setError(messageOf(err, "Status opslaan mislukt."))
                      })
                    }}
                  >
                    {statusOptions(row.outreach_status).map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="text-wf-700">{row.roles.map(roleLabel).join(", ")}</span>
                <span className="rounded-full border border-wf-300 bg-wf-100 px-2 py-0.5 text-wf-700">
                  Onboarding: {onboardingLabel(row)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <a href="#contact-toevoegen" className="h-8 rounded border border-wf-400 px-3 text-[11px] leading-8 text-wf-800">
                Contactpersoon toevoegen
              </a>
              {row.onboarding_state === "linked" && row.converted_seller_id ? (
                <Link
                  href={`/partners/${row.converted_seller_id}`}
                  className="h-8 rounded bg-wf-900 px-3 text-[11px] leading-8 text-white"
                >
                  Seller-dossier
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <section className="rounded-lg border border-wf-300 bg-white p-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">Bedrijfsgegevens</h2>
              <label className="mt-2 block text-[11px] text-wf-600">
                Bedrijfsnaam *
                <input className={fieldClass} value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
              </label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="text-[11px] text-wf-600">
                  Website
                  <input className={fieldClass} value={website} onChange={(event) => setWebsite(event.target.value)} />
                </label>
                <label className="text-[11px] text-wf-600">
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
              </div>
              {row.country_code ? (
                <p className="mt-2 text-[11px] text-wf-600">Land: {row.country_code}</p>
              ) : null}

              <h2 className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                Contactpersonen
              </h2>
              <ul className="mt-2 divide-y divide-wf-200">
                {row.contacts.length === 0 ? (
                  <li className="py-2 text-[11px] text-wf-500">Geen contactpersoon.</li>
                ) : (
                  row.contacts.map((contact) => (
                    <li key={contact.id} className="py-2">
                      {editingId === contact.id ? (
                        <ContactEditor
                          name={editName}
                          email={editEmail}
                          onName={setEditName}
                          onEmail={setEditEmail}
                          onCancel={() => setEditingId(null)}
                          onSave={() => {
                            updateEngagementContact(row.id, contact.id, {
                              name: editName,
                              email: editEmail,
                            })
                              .then(apply)
                              .then(() => setEditingId(null))
                              .catch((err: unknown) =>
                                setError(messageOf(err, "Contact opslaan mislukt."))
                              )
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-wf-900">
                            <span className="font-medium">{contact.name || "Zonder naam"}</span>
                            <span className="text-wf-600"> · {contact.email}</span>
                          </div>
                          <button
                            type="button"
                            className="text-[11px] text-wf-700 underline"
                            onClick={() => {
                              setEditingId(contact.id)
                              setEditName(contact.name ?? "")
                              setEditEmail(contact.email)
                            }}
                          >
                            Wijzigen
                          </button>
                        </div>
                      )}
                    </li>
                  ))
                )}
              </ul>
              <form
                id="contact-toevoegen"
                className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault()
                  createEngagementContact(row.id, {
                    name: contactName,
                    email: contactEmail,
                  })
                    .then((organization) => {
                      apply(organization)
                      setContactName("")
                      setContactEmail("")
                    })
                    .catch((err: unknown) =>
                      setError(messageOf(err, "Contact toevoegen mislukt."))
                    )
                }}
              >
                <input
                  className={fieldClass}
                  placeholder="Contactpersoon"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                />
                <input
                  className={fieldClass}
                  required
                  type="email"
                  placeholder="E-mail *"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                />
                <button type="submit" className="h-8 rounded border border-wf-400 px-3 text-[11px] text-wf-800">
                  Toevoegen
                </button>
              </form>
              <button
                type="button"
                className="mt-3 h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
                disabled={saving}
                onClick={() => {
                  setSaving(true)
                  persist({ company_name: companyName, website, category })
                    .catch((err: unknown) => setError(messageOf(err, "Bedrijfsgegevens opslaan mislukt.")))
                    .finally(() => setSaving(false))
                }}
              >
                Bedrijfsgegevens opslaan
              </button>
            </section>

            <section className="rounded-lg border border-wf-300 bg-white p-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                Benadering
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-wf-600">
                Rol, verkoopmodel en doel zijn drie verschillende dingen. De rol zegt welke plek de
                organisatie in de keten heeft. Het verkoopmodel zegt hoe zij zelf verkoopt. Het doel
                zegt waarom EuropMade contact zoekt.
              </p>
              <div className="mt-3">
                <div className="text-[11px] font-semibold text-wf-900">Rol</div>
                <p className="text-[11px] text-wf-500">Plek in de product- en verkoopketen.</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                {row.roles.map((item) =>
                  confirmRole === item ? (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1 rounded-full border border-wf-400 px-2 py-0.5 text-[11px] text-wf-800"
                    >
                      {roleLabel(item)} verwijderen?
                      <button
                        type="button"
                        className="font-semibold underline"
                        onClick={() => {
                          removeEngagementOrganizationRole(row.id, item)
                            .then(apply)
                            .catch((err: unknown) =>
                              setError(messageOf(err, "Rol verwijderen mislukt."))
                            )
                        }}
                      >
                        Ja
                      </button>
                      <button
                        type="button"
                        className="text-wf-500"
                        onClick={() => setConfirmRole(null)}
                      >
                        Nee
                      </button>
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className="rounded-full border border-wf-300 px-2 py-0.5 text-[11px] text-wf-800"
                      onClick={() => setConfirmRole(item)}
                    >
                      {roleLabel(item)} ×
                    </button>
                  )
                )}
                {SELECTABLE_ORGANIZATION_ROLES.some((item) => !row.roles.includes(item)) ? (
                  <>
                    <select className="h-7 rounded border border-wf-400 px-2 text-[11px]" value={role} onChange={(event) => setRole(event.target.value)}>
                      {SELECTABLE_ORGANIZATION_ROLES.filter((item) => !row.roles.includes(item)).map((item) => (
                        <option key={item} value={item}>
                          {roleLabel(item)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="text-[11px] text-wf-800 underline"
                      onClick={() => {
                        const next = row.roles.includes(role)
                          ? SELECTABLE_ORGANIZATION_ROLES.find((item) => !row.roles.includes(item))
                          : role
                        if (!next) return
                        addEngagementOrganizationRole(row.id, next)
                          .then(apply)
                          .catch((err: unknown) => setError(messageOf(err, "Rol toevoegen mislukt.")))
                      }}
                    >
                      Rol toevoegen
                    </button>
                  </>
                ) : null}
                </div>
              </div>
              <label className="mt-3 block text-[11px] text-wf-600">
                <span className="font-semibold text-wf-900">Verkoopmodel</span>
                <span className="mt-0.5 block font-normal text-wf-500">
                  Hoe verkoopt deze organisatie haar producten?
                </span>
                <select className={fieldClass} value={salesModel} onChange={(event) => setSalesModel(event.target.value)}>
                  {SALES_MODELS.map((item) => (
                    <option key={item} value={item}>
                      {salesModelLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block text-[11px] text-wf-600">
                <span className="font-semibold text-wf-900">Doel van benadering</span>
                <span className="mt-0.5 block font-normal text-wf-500">
                  Waarom benaderen wij deze organisatie?
                </span>
                <textarea
                  className="mt-1 min-h-[72px] w-full rounded border border-wf-400 bg-white px-2 py-1.5 text-xs text-wf-900"
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                />
              </label>
              <label className="mt-3 block text-[11px] text-wf-600">
                Bron
                <span className="mt-0.5 block font-normal text-wf-500">
                  Hoe is deze prospect bij EuropMade terechtgekomen?
                </span>
                <select className={fieldClass} value={source} onChange={(event) => setSource(event.target.value)}>
                  {sourceChoices(source).map((item) => (
                    <option key={item} value={item}>
                      {sourceLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="mt-3 h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
                disabled={saving}
                onClick={() => {
                  setSaving(true)
                  persist({ sales_model: salesModel, source, outreach_purpose: purpose })
                    .catch((err: unknown) => setError(messageOf(err, "Prospect opslaan mislukt.")))
                    .finally(() => setSaving(false))
                }}
              >
                Benadering opslaan
              </button>

              <h2 className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                Onboarding
              </h2>
              <p className="mt-1 text-xs text-wf-900">{onboardingLabel(row)}</p>

              <h2 className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
                Partnerstatus
              </h2>
              <p className="mt-1 text-xs text-wf-900">{CONVERSION_LABELS[row.conversion]}</p>
              {lines.length > 0 ? (
                <ul className="mt-3 space-y-1 text-[11px] text-wf-700">
                  {lines.map((line) => (
                    <li key={line.label}>
                      {line.label}: {line.value}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </div>

          <section className="mt-3 rounded-lg border border-wf-300 bg-white p-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
              Communicatie
            </h2>
            {events.length === 0 ? (
              <p className="mt-2 text-xs text-wf-500">Nog geen communicatie.</p>
            ) : (
              <ul className="mt-2 divide-y divide-wf-200">
                {events.map((event) => (
                  <li key={event.id} className="flex items-start justify-between gap-3 py-2 text-xs">
                    <div className="min-w-0">
                      <div className="text-[11px] text-wf-500">{prospectWhen(event.created_at)}</div>
                      <div className="font-medium text-wf-900">{event.template_name || "Bericht"}</div>
                      <div className="text-[11px] text-wf-700">{eventStatusLabel(event.status)}</div>
                    </div>
                    <Link
                      href={`/engagement/history/${event.id}`}
                      className="shrink-0 text-[11px] font-medium text-wf-900 underline"
                    >
                      Bekijken
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}

function ContactEditor({
  name,
  email,
  onName,
  onEmail,
  onSave,
  onCancel,
}: {
  name: string
  email: string
  onName: (value: string) => void
  onEmail: (value: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
      <input className={fieldClass} value={name} onChange={(event) => onName(event.target.value)} />
      <input className={fieldClass} value={email} onChange={(event) => onEmail(event.target.value)} />
      <button type="button" className="h-8 text-[11px] text-wf-800 underline" onClick={onSave}>
        Opslaan
      </button>
      <button type="button" className="h-8 text-[11px] text-wf-500" onClick={onCancel}>
        Annuleren
      </button>
    </div>
  )
}
