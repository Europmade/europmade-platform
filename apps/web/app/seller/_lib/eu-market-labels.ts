import { EU_MARKET_CODES, type EuMarketCode } from "@europmade/types"

/** Nederlandse landnamen voor EU-marktknoppen (tooltips). */
const LABELS_NL: Record<EuMarketCode, string> = {
  NL: "Nederland",
  BE: "België",
  DE: "Duitsland",
  FR: "Frankrijk",
  ES: "Spanje",
  IT: "Italië",
  AT: "Oostenrijk",
  PL: "Polen",
  PT: "Portugal",
  SE: "Zweden",
  DK: "Denemarken",
  FI: "Finland",
  IE: "Ierland",
  GR: "Griekenland",
  CZ: "Tsjechië",
  SK: "Slowakije",
  HU: "Hongarije",
  RO: "Roemenië",
  BG: "Bulgarije",
  HR: "Kroatië",
  SI: "Slovenië",
  EE: "Estland",
  LV: "Letland",
  LT: "Litouwen",
  LU: "Luxemburg",
  MT: "Malta",
  CY: "Cyprus",
}

export function euMarketLabelNl(code: string): string {
  const c = code.trim().toUpperCase() as EuMarketCode
  return LABELS_NL[c] ?? c
}

export function euMarketCodes(): readonly EuMarketCode[] {
  return EU_MARKET_CODES
}
