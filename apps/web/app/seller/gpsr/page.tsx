"use client"

import Link from "next/link"
import Image from "next/image"
import { SellerGate } from "../_components/seller-gate"

export default function SellerGpsrPage() {
  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller", href: "/seller" },
        { label: "GPSR uitleg" },
      ]}
    >
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-xl font-bold text-wf-900">
          GPSR — Algemene productveiligheidsverordening
        </h1>
        <p className="text-sm text-wf-700">
          Deze pagina geeft praktische uitleg over de GPSR (EU 2023/988) voor
          sellers op EuropMade.
        </p>
        <p className="text-sm text-wf-700">
          EuropMade accepteert uitsluitend producten die in Europa zijn
          geproduceerd of geassembleerd. Dit is een voorwaarde van EuropMade en
          staat los van de vraag welke marktdeelnemer volgens de GPSR
          verantwoordelijk is.
        </p>

        <section className="rounded border border-wf-300 bg-white p-4">
          <h2 className="text-sm font-bold text-wf-900">1. Wat is de GPSR?</h2>
          <p className="mt-1 text-xs text-wf-700">
            De GPSR (General Product Safety Regulation) bevat algemene
            productveiligheidsregels voor consumentenproducten op de EU-markt en
            voor online verkoop.
          </p>
        </section>

        <section className="rounded border border-wf-300 bg-white p-4">
          <h2 className="text-sm font-bold text-wf-900">
            2. Voor wie geldt de GPSR?
          </h2>
          <p className="mt-1 text-xs text-wf-700">
            Voor marktdeelnemers die consumentenproducten in de EU aanbieden,
            waaronder fabrikanten, importeurs, distributeurs en online sellers.
          </p>
        </section>

        <section className="rounded border border-wf-300 bg-white p-4">
          <h2 className="text-sm font-bold text-wf-900">
            3. Welke marktdeelnemer ben ik?
          </h2>
          <p className="mt-1 text-xs text-wf-700">
            Dat hangt af van je rol per product. Je kunt per product optreden
            als fabrikant, importeur, distributeur of aanbieder via een
            onlinekanaal.
          </p>
        </section>

        <section className="rounded border border-wf-300 bg-white p-4">
          <h2 className="text-sm font-bold text-wf-900">
            Wie is wie in de productketen?
          </h2>
          <div className="mt-2 space-y-2 text-xs text-wf-700">
            <p>
              <strong>Retailer:</strong> verkoopt het product aan de consument.
            </p>
            <p>
              <strong>Merk:</strong> het handelsmerk waaronder het product wordt
              aangeboden. Een merk is niet automatisch dezelfde juridische
              entiteit als de fabrikant of de verantwoordelijke marktdeelnemer.
            </p>
            <p>
              <strong>Fabrikant:</strong> de natuurlijke of rechtspersoon die
              het product produceert of laat produceren en het onder eigen naam
              of handelsmerk op de markt brengt.
            </p>
            <p>
              <strong>Productielocatie / fabriek:</strong> de daadwerkelijke
              locatie waar het product wordt geproduceerd of geassembleerd
              (Made in Europe).
            </p>
            <p>
              <strong>
                Verantwoordelijke marktdeelnemer (EU verantwoordelijke
                fabrikant):
              </strong>{" "}
              de afzonderlijke GPSR-rol van de in de EU gevestigde
              verantwoordelijke partij voor productveiligheid en markttoezicht.
            </p>
          </div>
        </section>

        <section className="rounded border border-wf-300 bg-white p-3 tablet:p-4">
          <h2 className="text-sm font-bold text-wf-900">
            Visuele samenvatting productketen
          </h2>
          <p className="mt-1 text-xs text-wf-700">
            De infographic hieronder vat de rollen in de productketen samen en
            ondersteunt de uitleg op deze pagina.
          </p>
          <div className="mt-3 overflow-hidden rounded border border-wf-200 bg-white p-2 tablet:p-3">
            <Image
              src="/Infografic%20Merk%20Fabrikant%20verkoper.png"
              alt="Infographic over de rollen van productielocatie, fabrikant, retailer en consument binnen de GPSR productketen"
              width={1600}
              height={900}
              className="h-auto w-full object-contain"
              sizes="(max-width: 768px) 100vw, 900px"
              priority
            />
          </div>
        </section>

        <section className="rounded border border-wf-300 bg-white p-4">
          <h2 className="text-sm font-bold text-wf-900">
            4. Hoe definieert de GPSR een fabrikant?
          </h2>
          <p className="mt-1 text-xs text-wf-700">
            Een fabrikant is de natuurlijke of rechtspersoon die een product
            produceert, of het laat ontwerpen/produceren en onder eigen naam of
            handelsmerk op de markt brengt.
          </p>
        </section>

        <section className="rounded border border-wf-300 bg-white p-4">
          <h2 className="text-sm font-bold text-wf-900">
            5. Wat is een verantwoordelijke marktdeelnemer?
          </h2>
          <p className="mt-1 text-xs text-wf-700">
            Wanneer de fabrikant niet in de EU is gevestigd, moet een in de EU
            gevestigde verantwoordelijke marktdeelnemer beschikbaar zijn, zoals
            een importeur of gemachtigde.
          </p>
        </section>

        <section className="rounded border border-wf-300 bg-white p-4">
          <h2 className="text-sm font-bold text-wf-900">
            6. Welke productgegevens moet ik bij EuropMade invullen?
          </h2>
          <p className="mt-1 text-xs text-wf-700">
            Onder andere fabrikantgegevens, EU-verantwoordelijke gegevens,
            productveiligheidsinformatie, toepasselijke compliancevelden en
            relevante bewijsstukken.
          </p>
        </section>

        <section className="rounded border border-wf-300 bg-white p-4">
          <h2 className="text-sm font-bold text-wf-900">
            7. Welke gegevens zijn zichtbaar voor consumenten?
          </h2>
          <p className="mt-1 text-xs text-wf-700">
            Productinformatie die wettelijk nodig is voor precontractuele
            informatie en veiligheidstransparantie kan zichtbaar worden gemaakt
            in de storefront.
          </p>
        </section>

        <section className="rounded border border-wf-300 bg-white p-4">
          <h2 className="text-sm font-bold text-wf-900">
            8. Welke documenten/bewijzen kunnen nodig zijn?
          </h2>
          <p className="mt-1 text-xs text-wf-700">
            Bijvoorbeeld CE-bewijs, datagebruikdocumentatie en Made in Europe
            bewijsstukken indien van toepassing.
          </p>
        </section>

        <section className="rounded border border-wf-300 bg-white p-4">
          <h2 className="text-sm font-bold text-wf-900">
            9. Wat gebeurt er als gegevens ontbreken?
          </h2>
          <p className="mt-1 text-xs text-wf-700">
            Ontbrekende verplichte gegevens blokkeren de publicatiestap totdat
            de informatie en vereiste bewijsstukken volledig zijn.
          </p>
        </section>

        <section className="rounded border border-wf-300 bg-white p-4">
          <h2 className="text-sm font-bold text-wf-900">
            10. Hoe werkt de beoordeling door EuropMade?
          </h2>
          <p className="mt-1 text-xs text-wf-700">
            EuropMade controleert productinformatie en verplichte bewijsstukken
            voordat een product gepubliceerd kan worden. Het uploaden van
            informatie betekent niet dat deze automatisch is goedgekeurd.
          </p>
          <p className="mt-2 text-xs text-wf-700">
            Een product kan pas worden gepubliceerd wanneer verplichte gegevens
            en relevante bewijsstukken compleet zijn en de beoordelingsstappen
            zijn doorlopen.
          </p>
          <p className="mt-2 text-xs text-wf-700">
            EuropMade accepteert uitsluitend producten die in Europa zijn
            geproduceerd of geassembleerd. Dit is een platformvoorwaarde van
            EuropMade en geen algemene GPSR-regel.
          </p>
        </section>

        <section className="rounded border border-wf-300 bg-white p-4">
          <h2 className="text-sm font-bold text-wf-900">Meer informatie</h2>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-wf-700">
            <li>
              <Link
                href="https://eur-lex.europa.eu/eli/reg/2023/988/oj"
                className="underline"
              >
                EUR-Lex — Regulation (EU) 2023/988
              </Link>
            </li>
            <li>
              <Link
                href="https://ec.europa.eu/safety-gate/#/screen/pages/general-product-safety-regulation"
                className="underline"
              >
                Europese Commissie — GPSR informatie
              </Link>
            </li>
          </ul>
          <p className="mt-3 text-[11px] text-wf-600">
            Deze informatie is bedoeld als praktische uitleg en vormt geen
            juridisch advies. Raadpleeg bij twijfel een juridisch of
            compliance-specialist.
          </p>
        </section>
      </div>
    </SellerGate>
  )
}
