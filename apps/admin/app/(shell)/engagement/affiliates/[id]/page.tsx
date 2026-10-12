"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Notice } from "@europmade/ui"
import {
  EngagementAdminApiError,
  getAffiliatePartner,
  saveAffiliatePartner,
  type AffiliatePartner,
} from "../../../../../lib/engagement-admin-api"

const TYPES = [
  { value: "comparison", label: "Vergelijkingswebsite" },
  { value: "review", label: "Reviewwebsite" },
  { value: "blog", label: "Blog/contentwebsite" },
  { value: "influencer", label: "Influencer" },
  { value: "creator", label: "Content creator" },
  { value: "social", label: "Social media creator" },
  { value: "news", label: "Nieuwsplatform" },
  { value: "other", label: "Overig" },
]

const CHANNELS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "other", label: "Overig" },
]

const fieldClass = "mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-sm text-wf-900"

export default function AffiliatePartnerPage() {
  const { id } = useParams<{ id: string }>()
  const [partner, setPartner] = useState<AffiliatePartner | null>(null)
  const [partnerType, setPartnerType] = useState("")
  const [contactName, setContactName] = useState("")
  const [locale, setLocale] = useState("")
  const [contactedAt, setContactedAt] = useState("")
  const [preferences, setPreferences] = useState<Record<string, boolean>>({})
  const [channels, setChannels] = useState<Array<{ channel: string; url: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function apply(next: AffiliatePartner) {
    setPartner(next)
    setPartnerType(next.partner_type ?? "")
    setContactName(next.contact_name ?? "")
    setLocale(next.locale ?? "")
    setContactedAt(next.contacted_at ?? "")
    setPreferences(Object.fromEntries(next.preferences.map((item) => [item.key, item.enabled])))
    setChannels(next.social_channels.map((item) => ({ channel: item.channel, url: item.url })))
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getAffiliatePartner(id)
      .then((row) => {
        if (!cancelled) apply(row)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof EngagementAdminApiError ? err.message : "Dossier laden mislukt.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (!partner && !error) return <p className="text-xs text-wf-500">Laden…</p>
  if (!partner) return error ? <Notice variant="warning">{error}</Notice> : null

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/engagement/affiliates" className="text-[11px] text-wf-600 hover:text-wf-900">
        ← Affiliate Partners
      </Link>
      <h1 className="mt-2 text-[19px] font-bold text-wf-900">{partner.organization}</h1>
      <p className="mt-1 text-xs text-wf-600">Status: {partner.status}</p>
      {error ? (
        <div className="mt-3">
          <Notice variant="warning">{error}</Notice>
        </div>
      ) : null}
      {notice ? <p className="mt-3 text-xs text-wf-700">{notice}</p> : null}
      <div className="mt-4 grid grid-cols-1 gap-3 tablet:grid-cols-2">
        <Field label="Organisatie" value={partner.organization} />
        <label className="text-[11px] text-wf-600">
          Contactpersoon
          <input className={fieldClass} value={contactName} onChange={(event) => setContactName(event.target.value)} />
        </label>
        <Field label="E-mail" value={partner.email || "Niet bekend"} />
        <Field label="Website" value={partner.website || "Niet bekend"} />
        <label className="text-[11px] text-wf-600">
          Type partner
          <select className={fieldClass} value={partnerType} onChange={(event) => setPartnerType(event.target.value)}>
            <option value="">Kies een type</option>
            {TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <Field label="Land" value={partner.country || "Niet bekend"} />
        <label className="text-[11px] text-wf-600">
          Taal
          <select className={fieldClass} value={locale} onChange={(event) => setLocale(event.target.value)}>
            <option value="">Nog niet gekozen</option>
            <option value="nl">Nederlands</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="fr">Français</option>
          </select>
        </label>
        <label className="text-[11px] text-wf-600">
          Datum contact
          <input className={fieldClass} type="date" value={contactedAt} onChange={(event) => setContactedAt(event.target.value)} />
        </label>
        <Field label="Commissie" value={partner.commission || "Nog niet beschikbaar"} />
        <Field
          label="Attributie"
          value={partner.attribution_days ? `${partner.attribution_days} dagen` : "Nog niet beschikbaar"}
        />
      </div>
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-wf-900">Social kanalen</h2>
        <p className="mt-1 text-[11px] text-wf-600">
          Alleen vastleggen welk kanaal bekend is. Er is geen koppeling met Instagram, TikTok of een ander netwerk.
        </p>
        {channels.map((item, index) => (
          <div key={index} className="mt-2 grid grid-cols-1 gap-2 tablet:grid-cols-[180px_1fr_auto]">
            <select
              className={fieldClass}
              value={item.channel}
              onChange={(event) =>
                setChannels((current) =>
                  current.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, channel: event.target.value } : row
                  )
                )
              }
            >
              {CHANNELS.map((channel) => (
                <option key={channel.value} value={channel.value}>
                  {channel.label}
                </option>
              ))}
            </select>
            <input
              className={fieldClass}
              value={item.url}
              placeholder="Profiel of kanaal"
              onChange={(event) =>
                setChannels((current) =>
                  current.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, url: event.target.value } : row
                  )
                )
              }
            />
            <button
              type="button"
              className="text-[11px] text-wf-700 underline"
              onClick={() => setChannels((current) => current.filter((_, rowIndex) => rowIndex !== index))}
            >
              Verwijderen
            </button>
          </div>
        ))}
        <button
          type="button"
          className="mt-2 text-[11px] text-wf-800 underline"
          onClick={() => setChannels((current) => [...current, { channel: "instagram", url: "" }])}
        >
          Kanaal toevoegen
        </button>
      </section>
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-wf-900">Communicatievoorkeuren</h2>
        <p className="mt-1 text-[11px] text-wf-600">De voorkeur wordt opgeslagen. Er wordt niets verzonden.</p>
        <ul className="mt-2 space-y-2">
          {partner.preferences.map((item) => (
            <li key={item.key}>
              <label className="flex items-center gap-2 text-sm text-wf-800">
                <input
                  type="checkbox"
                  checked={preferences[item.key] === true}
                  onChange={(event) =>
                    setPreferences((current) => ({ ...current, [item.key]: event.target.checked }))
                  }
                />
                {item.label}
              </label>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-wf-900">Gekoppelde producten</h2>
        {(partner.products ?? []).length === 0 ? (
          <p className="mt-1 text-[11px] text-wf-600">Geen productlink in de bestaande trackinglinks.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-xs text-wf-800">
            {(partner.products ?? []).map((product) => (
              <li key={product.url}>{product.url}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-wf-900">Trackinglinks</h2>
        {partner.links.length === 0 ? (
          <p className="mt-1 text-[11px] text-wf-600">Deze partner heeft nog geen trackinglink.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-xs text-wf-800">
            {partner.links.map((link) => (
              <li key={link.url}>{link.url}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-wf-900">Communicatie</h2>
        <p className="mt-1 text-[11px] text-wf-600">{partner.history_note}</p>
      </section>
      <button
        type="button"
        disabled={busy}
        className="mt-6 h-8 rounded bg-wf-900 px-3 text-[11px] font-medium text-white disabled:opacity-50"
        onClick={() => {
          setBusy(true)
          setError(null)
          saveAffiliatePartner(id, {
            partner_type: partnerType || null,
            contact_name: contactName,
            locale: locale || null,
            contacted_at: contactedAt || null,
            communication_preferences: Object.fromEntries(
              partner.preferences.map((item) => [item.key, preferences[item.key] === true])
            ),
            social_channels: channels.filter((item) => item.url.trim()),
          })
            .then((saved) => {
              apply(saved)
              setNotice("Dossier opgeslagen. Er is niets verzonden.")
            })
            .catch((err: unknown) => {
              setError(err instanceof EngagementAdminApiError ? err.message : "Dossier opslaan mislukt.")
            })
            .finally(() => setBusy(false))
        }}
      >
        Dossier opslaan
      </button>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[11px] text-wf-600">
      {label}
      <p className="mt-1 text-sm text-wf-900">{value}</p>
    </div>
  )
}
