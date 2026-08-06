"use client"

import { useState } from "react"
import { Badge, Button, FileUpload, Input } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import { DEMO_COMPANY } from "../_lib/demo-data"

type SettingsSectionId =
  | "company"
  | "bank"
  | "vat"
  | "logo"
  | "banner"
  | "return_address"
  | "shipping_address"
  | "notifications"
  | "security"
  | "api_keys"

const SECTIONS: Array<{ id: SettingsSectionId; title: string }> = [
  { id: "company", title: "Bedrijfsgegevens" },
  { id: "bank", title: "Bankrekening" },
  { id: "vat", title: "BTW" },
  { id: "logo", title: "Logo" },
  { id: "banner", title: "Banner" },
  { id: "return_address", title: "Retouradres" },
  { id: "shipping_address", title: "Verzendadres" },
  { id: "notifications", title: "Notificaties" },
  { id: "security", title: "Beveiliging" },
  { id: "api_keys", title: "API Keys" },
]

/**
 * Instellingen — submenu links + secties met demo bedrijfsgegevens.
 */
export default function SellerSettingsPage() {
  const [active, setActive] = useState<SettingsSectionId>("company")
  const [actionNote, setActionNote] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [returnAddress, setReturnAddress] = useState(
    DEMO_COMPANY.return_address
  )
  const [shippingAddress, setShippingAddress] = useState(
    DEMO_COMPANY.shipping_address
  )
  const company = DEMO_COMPANY

  function markSaved(label: string) {
    setActionNote(`${label} lokaal bijgewerkt (demo).`)
  }

  const activeTitle =
    SECTIONS.find((s) => s.id === active)?.title ?? "Instellingen"

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Instellingen" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Instellingen</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Bedrijf, bank, BTW, branding, adressen, notificaties en beveiliging.
      </p>

      {actionNote ? (
        <p className="mt-4 text-xs text-wf-600">{actionNote}</p>
      ) : null}

      <div className="mt-6 flex flex-col gap-5 tablet:flex-row">
        <nav
          className="w-full shrink-0 tablet:w-[200px]"
          aria-label="Instellingen submenu"
        >
          <ul className="rounded-lg border border-wf-300 bg-white p-2">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => setActive(section.id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-xs ${
                    active === section.id
                      ? "bg-wf-900 font-semibold text-white"
                      : "text-wf-700 hover:bg-wf-100"
                  }`}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <section className="min-w-0 flex-1 rounded-lg border border-wf-300 bg-white px-5 py-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-xs font-semibold text-wf-900">{activeTitle}</h2>
            <Badge variant="outline">Beschikbaar</Badge>
          </div>

          {active === "company" ? (
            <dl className="grid gap-2 text-xs text-wf-800 tablet:grid-cols-2">
              <div>
                <dt className="text-[10.5px] uppercase tracking-[0.04em] text-wf-500">
                  Bedrijfsnaam
                </dt>
                <dd>{company.legal_name}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-[0.04em] text-wf-500">
                  KvK
                </dt>
                <dd>{company.chamber_of_commerce_number}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-[0.04em] text-wf-500">
                  Land
                </dt>
                <dd>{company.country_code}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-[0.04em] text-wf-500">
                  Rollen
                </dt>
                <dd>Retailer</dd>
              </div>
            </dl>
          ) : null}

          {active === "bank" ? (
            <p className="text-xs text-wf-800">
              IBAN: {company.iban.replace(/^(.{4}).+(.{4})$/, "$1••••••••$2")}
            </p>
          ) : null}

          {active === "vat" ? (
            <p className="text-xs text-wf-800">{company.vat_number}</p>
          ) : null}

          {active === "logo" ? (
            <div className="max-w-md">
              <div className="mb-4 rounded-[5px] border border-wf-200 bg-wf-50 px-4 py-3 text-[11.5px] text-wf-700">
                <p className="font-semibold text-wf-800">Aanbevolen formaat</p>
                <p className="mt-1">1000 × 1000 px</p>
                <p>PNG of SVG</p>
                <p>Maximaal 5 MB</p>
                <p className="mt-2 font-semibold text-wf-800">Toepassing</p>
                <ul className="mt-1 list-disc pl-4">
                  <li>Seller profiel</li>
                  <li>Productpagina</li>
                  <li>Zoekresultaten</li>
                </ul>
              </div>
              <FileUpload
                label="Logo uploaden"
                requirementLabel="PNG of SVG, max. 5 MB"
                accept="image/png,image/svg+xml,.svg,.png"
                value={logoFile}
                onChange={setLogoFile}
              />
              <div className="mt-3">
                <Button type="button" onClick={() => markSaved("Logo")}>
                  Opslaan
                </Button>
              </div>
            </div>
          ) : null}

          {active === "banner" ? (
            <div className="max-w-md">
              <div className="mb-4 rounded-[5px] border border-wf-200 bg-wf-50 px-4 py-3 text-[11.5px] text-wf-700">
                <p className="font-semibold text-wf-800">Aanbevolen formaat</p>
                <p className="mt-1">2400 × 600 px</p>
                <p>PNG of JPG</p>
                <p>Maximaal 10 MB</p>
                <p className="mt-2 font-semibold text-wf-800">Toepassing</p>
                <ul className="mt-1 list-disc pl-4">
                  <li>Seller homepage</li>
                  <li>Winkelpagina</li>
                  <li>Marketingpagina</li>
                </ul>
              </div>
              <FileUpload
                label="Banner uploaden"
                requirementLabel="PNG of JPG, max. 10 MB"
                accept="image/jpeg,image/png"
                value={bannerFile}
                onChange={setBannerFile}
              />
              <div className="mt-3">
                <Button type="button" onClick={() => markSaved("Banner")}>
                  Opslaan
                </Button>
              </div>
            </div>
          ) : null}

          {active === "return_address" ? (
            <div className="max-w-xl">
              <Input
                label="Retouradres"
                value={returnAddress}
                onChange={(e) => setReturnAddress(e.target.value)}
              />
              <div className="mt-3">
                <Button
                  type="button"
                  onClick={() => markSaved("Retouradres")}
                >
                  Opslaan
                </Button>
              </div>
            </div>
          ) : null}

          {active === "shipping_address" ? (
            <div className="max-w-xl">
              <Input
                label="Verzendadres"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
              />
              <div className="mt-3">
                <Button
                  type="button"
                  onClick={() => markSaved("Verzendadres")}
                >
                  Opslaan
                </Button>
              </div>
            </div>
          ) : null}

          {active === "notifications" ? (
            <div className="space-y-2 text-xs text-wf-800">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                E-mail bij nieuwe order
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                E-mail bij nieuw bericht
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                E-mail bij retouraanvraag
              </label>
              <div className="mt-3">
                <Button
                  type="button"
                  onClick={() => markSaved("Notificaties")}
                >
                  Opslaan
                </Button>
              </div>
            </div>
          ) : null}

          {active === "security" ? (
            <div className="space-y-3 text-xs text-wf-800">
              <p>Wachtwoord laatst gewijzigd: 12 juni 2026</p>
              <p>Tweestapsverificatie: Uit</p>
              <Button type="button" onClick={() => markSaved("Beveiliging")}>
                Wachtwoord wijzigen
              </Button>
            </div>
          ) : null}

          {active === "api_keys" ? (
            <div className="text-xs text-wf-800">
              <p className="mb-2">
                Nog geen API-sleutels. Genereer een sleutel wanneer de
                integratie-API live is.
              </p>
              <Button type="button" onClick={() => markSaved("API Keys")}>
                Nieuwe sleutel
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </SellerGate>
  )
}
