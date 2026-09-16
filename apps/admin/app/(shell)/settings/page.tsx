"use client"

import Link from "next/link"
import { Notice } from "@europmade/ui"
import { CommercialNavIconsSettings } from "../../../components/cms/commercial-nav-icons-settings"

/**
 * Settings placeholder — geen backend-settings-API in huidige scope.
 */
export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-[19px] font-bold text-wf-900">Instellingen</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Platforminstellingen worden in een latere Admin-fase toegevoegd.
      </p>

      <Notice variant="info" className="mt-5">
        Er is nog geen dedicated admin settings-API. Deze pagina is een
        navigatieanker voor toekomstige configuratie (rollen, platformregels,
        Buy Box-weging, enz.).
      </Notice>

      <section className="mt-6 rounded-lg border border-wf-300 bg-white p-4">
        <h2 className="text-sm font-bold text-wf-900">
          Commerciële hoofdnavigatie ≠ Product Cloud-taxonomie
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-wf-600">
          De storefront-hoofdnavigatie toont de 13 Fase-5-hoofdcategorieën
          (productonderzoek). Product Cloud blijft de 30+{" "}
          <code className="rounded bg-wf-100 px-1">pc_category</code>-records
          beheren. Er worden geen extra Product Cloud-categorieën aangemaakt
          voor samengestelde commerciële groepen; die gebruiken een dunne
          listinglaag over bestaande slugs.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-wf-600">
          Volgorde: eerst aantal gepubliceerde producten. Bezoekerssortering
          (anonieme sessiehash, max. 1× per 14 dagen) start pas bij minstens
          50 categorie-sessies waarvan 6 categorieën ≥ 5 unieke sessies. Er is
          geen bestaande storefront-analytics voor unieke bezoekers; affiliate-
          tracking is daarvoor niet hergebruikt.
        </p>
      </section>

      <CommercialNavIconsSettings />

      <section className="mt-6 rounded-lg border border-wf-300 bg-white p-4">
        <h2 className="text-sm font-bold text-wf-900">
          Storefront-categoriemenu (UAT)
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-wf-600">
          Klanten zien standaard alleen categorieën met gepubliceerde
          Product Cloud-producten. Tijdens bouwen/UAT kun je lege
          taxonomie-takken tijdelijk tonen — niet via een
          consumentenschakelaar, maar via configuratie op de storefront
          (poort 3000):
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-wf-700">
          <li>
            Zet{" "}
            <code className="rounded bg-wf-100 px-1">
              NEXT_PUBLIC_STOREFRONT_SHOW_EMPTY_CATEGORIES=true
            </code>{" "}
            in <code className="rounded bg-wf-100 px-1">apps/web/.env.local</code>{" "}
            en herstart de storefront.
          </li>
          <li>
            Of open een storefront-URL met{" "}
            <code className="rounded bg-wf-100 px-1">?show_empty_nav=1</code>{" "}
            (cookie <code className="rounded bg-wf-100 px-1">em_show_empty_nav</code>
            ). <code className="rounded bg-wf-100 px-1">?show_empty_nav=0</code>{" "}
            zet dit weer uit.
          </li>
        </ul>
        <p className="mt-2 text-[11px] text-wf-500">
          Productie/klantomgeving: schakelaar uit (alleen categorieën met
          producten).
        </p>
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-wf-300 bg-white">
        {[
          "Gebruikers & rollen",
          "Platformregels",
          "Notificaties",
          "Integraties",
        ].map((item, i, arr) => (
          <div
            key={item}
            className={`flex items-center justify-between px-4 py-3 text-xs text-wf-600 ${
              i < arr.length - 1 ? "border-b border-wf-200" : ""
            }`}
          >
            <span>{item}</span>
            <span className="text-[10px] uppercase tracking-[0.04em] text-wf-400">
              Komt later
            </span>
          </div>
        ))}
      </section>

      <p className="mt-4 text-[11px] text-wf-500">
        <Link href="/dashboard" className="underline">
          Terug naar Control Center
        </Link>
      </p>
    </div>
  )
}
