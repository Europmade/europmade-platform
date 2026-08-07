/**
 * UI chrome messages (NL/EN/DE/FR) — mock until full i18n pipeline.
 */

import {
  L,
  pickLocalized,
  type LocalizedString,
  type StorefrontLocale,
} from "./locales"

const M = {
  language: L("Taal", "Language", "Sprache", "Langue"),
  currency: L("Valuta", "Currency", "Währung", "Devise"),
  languageAndCurrency: L(
    "Taal en valuta",
    "Language and currency",
    "Sprache und Währung",
    "Langue et devise"
  ),
  advertisement: L("Advertentie", "Advertisement", "Anzeige", "Publicité"),
  adSlotAvailable: L(
    "Advertentieruimte beschikbaar",
    "Ad space available",
    "Werbefläche verfügbar",
    "Espace publicitaire disponible"
  ),
  adSlotHint: L(
    "Partners kunnen hier een campagne tonen met kop, omschrijving en call-to-action.",
    "Partners can show a campaign here with headline, copy and call-to-action.",
    "Partner können hier eine Kampagne mit Headline, Text und Call-to-Action zeigen.",
    "Les partenaires peuvent afficher ici une campagne avec titre, texte et appel à l’action."
  ),
  productsSuffix: L("producten", "products", "Produkte", "produits"),
  viewProducer: L(
    "Bekijk producent",
    "View producer",
    "Produzent ansehen",
    "Voir le producteur"
  ),
  position: L("Positie", "Position", "Position", "Position"),
  prevCampaigns: L(
    "Vorige campagnes",
    "Previous campaigns",
    "Vorherige Kampagnen",
    "Campagnes précédentes"
  ),
  nextCampaigns: L(
    "Volgende campagnes",
    "Next campaigns",
    "Nächste Kampagnen",
    "Campagnes suivantes"
  ),
} as const satisfies Record<string, LocalizedString>

export type StorefrontMessageKey = keyof typeof M

export function t(
  key: StorefrontMessageKey,
  locale: StorefrontLocale
): string {
  return pickLocalized(M[key], locale)
}
