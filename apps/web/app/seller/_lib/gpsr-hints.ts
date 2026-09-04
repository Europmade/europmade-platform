/**
 * Seller-facing GPSR explanations (Regulation (EU) 2023/988).
 * Based primarily on Article 16 (responsible economic operator in the Union).
 * Article 19 GPSR also requires clear manufacturer / responsible-person contact
 * information for distance sales offers — keep copy practical, not legal advice.
 */

export const GPSR_HINTS: Record<string, string> = {
  gpsr_manufacturer_name:
    "Volgens de GPSR is de fabrikant de natuurlijke of rechtspersoon die het product produceert of het product laat ontwerpen of produceren en het onder eigen naam of handelsmerk op de markt brengt. De fabrikant is dus niet per definitie dezelfde partij als de daadwerkelijke productielocatie.",
  gpsr_manufacturer_address:
    "Postadres van de fabrikant (straat + huisnummer). Dit adres hoort op het product, de verpakking of de begeleidende documenten herkenbaar te zijn, en bij online verkoop vóór aankoop beschikbaar.",
  gpsr_manufacturer_postal_city:
    "Postcode en plaats van de fabrikant. Vul het officiële vestigings-/postadres volledig in.",
  gpsr_manufacturer_country:
    "Land van vestiging van de fabrikant / verantwoordelijke marktdeelnemer (EU verantwoordelijke fabrikant). EuropMade accepteert uitsluitend producten die in Europa zijn geproduceerd of geassembleerd.",
  gpsr_manufacturer_email:
    "Elektronisch contactpunt van de fabrikant (e-mail of vergelijkbaar). Moet bereikbaar zijn voor productveiligheidsvragen.",
  gpsr_eu_responsible_name:
    "Naam van de verantwoordelijke marktdeelnemer (EU verantwoordelijke fabrikant). Dit is een aparte GPSR-rol en niet hetzelfde als merk of productielocatie.",
  gpsr_eu_responsible_address:
    "Adres in de EU van de verantwoordelijke marktdeelnemer (EU verantwoordelijke fabrikant). Dit moet een echt bereikbaar adres in de Unie zijn.",
  gpsr_eu_responsible_postal_city:
    "Postcode en plaats van de verantwoordelijke marktdeelnemer (EU verantwoordelijke fabrikant).",
  gpsr_eu_responsible_country:
    "EU-land van vestiging van de verantwoordelijke marktdeelnemer (EU verantwoordelijke fabrikant).",
  gpsr_eu_responsible_contact:
    "E-mail en/of telefoon van de verantwoordelijke marktdeelnemer (EU verantwoordelijke fabrikant) voor markttoezicht en productveiligheid.",
  gpsr_safety_warnings:
    "Veiligheidswaarschuwingen en gebruiksinstructies die de koper vóór aankoop moet kunnen zien, in de taal van de markt.",
  ce_marking:
    "Een CE-bewijs is verplicht wanneer je aangeeft dat het product zichtbaar CE-gemarkeerd is. Kies Zichtbaar alleen als de markering daadwerkelijk op product, verpakking of documenten staat. Kies Niet van toepassing als er geen zichtbare CE-markering is; dan is CE-bewijs niet verplicht. Een upload is geen automatische goedkeuring.",
  app_required:
    "Kies Ja als de koper een app (smartphone/tablet) nodig heeft om het product volledig te gebruiken, bijvoorbeeld voor bediening, updates of koppeling. Kies Nee als het product zonder app volledig werkt.",
  collects_data:
    "Alleen verplicht wanneer het product gegevens van gebruikers verwerkt. Dat kan bijvoorbeeld bij producten met een app, account, camera, microfoon, locatieverwerking of cloudverbinding. Een gewone elektronische machine zonder zulke gegevensverwerking hoeft dit document niet.",
  product_languages:
    "Talen waarin de productinformatie (naam, beschrijving, specificaties) wordt aangeboden. Je kunt meerdere talen selecteren.",
  manual_languages:
    "Talen van de meegeleverde handleiding. Selecteer alle talen die daadwerkelijk in de handleiding voorkomen. Meerdere talen mogelijk.",
}

export function gpsrHint(code: string | null | undefined): string | null {
  if (!code) return null
  if (GPSR_HINTS[code]) return GPSR_HINTS[code]
  if (code.startsWith("gpsr_")) return GPSR_HINTS.gpsr_manufacturer_name
  return null
}
