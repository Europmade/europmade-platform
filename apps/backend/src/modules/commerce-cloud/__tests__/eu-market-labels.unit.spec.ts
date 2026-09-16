import { EU_MARKET_CODES } from "@europmade/types"

const LABELS_NL: Record<string, string> = {
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

describe("EU market country labels (seller tooltips)", () => {
  it("covers every EU_MARKET_CODES entry", () => {
    for (const code of EU_MARKET_CODES) {
      expect(LABELS_NL[code]).toBeTruthy()
    }
  })

  it("uses Dutch names for NL/BE/DE/FR", () => {
    expect(LABELS_NL.NL).toBe("Nederland")
    expect(LABELS_NL.BE).toBe("België")
    expect(LABELS_NL.DE).toBe("Duitsland")
    expect(LABELS_NL.FR).toBe("Frankrijk")
  })
})
