import { EU_MARKET_CODES, type EuMarketCode } from "@europmade/types"

/** Admin NL labels — centrale codes uit EU_MARKET_CODES. */
const LABELS: Record<EuMarketCode, string> = {
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

export function adminMarketLabel(code: string): string {
  const c = code.toUpperCase() as EuMarketCode
  return LABELS[c] ?? c
}

export function adminMarketOptions() {
  return EU_MARKET_CODES.map((code) => ({
    code,
    label: LABELS[code],
  }))
}
