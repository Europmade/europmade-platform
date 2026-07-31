/**
 * Deterministische MVP-advisor (ADR-0035) — nooit een beslissingstekst.
 */

export type RecommendationType =
  | "Matchvergelijking"
  | "Consistentiecontrole"
  | "Risicoclassificatie"
  | "Fraude-signaal"

export type AdvisorInput = {
  subject_type: string
  signal_code?: string | null
  case_type?: string | null
  queue?: string | null
}

export type AdvisorOutput = {
  recommendation_type: RecommendationType
  /** 0–1, altijd aanwezig. */
  confidence_score: number
  explanation: string
}

function clampScore(n: number): number {
  return Math.round(Math.min(0.95, Math.max(0.35, n)) * 100) / 100
}

/**
 * Levert uitsluitend advies + score. Geen “keur goed / wijs af”-taal.
 */
export function buildAdvisoryRecommendation(input: AdvisorInput): AdvisorOutput {
  const signal = (input.signal_code ?? "").toLowerCase()
  const caseType = input.case_type ?? ""
  const subject = input.subject_type
  const queue = input.queue ?? ""

  if (
    subject === "moderation_case" &&
    (caseType === "Fraude-signaal" || queue === "fraude" || signal.includes("fraud") || signal.includes("click") || signal.includes("coupon"))
  ) {
    let confidence = 0.62
    let detail =
      "Automatische fraudeheuristiek detecteerde afwijkend gedrag. Controleer bron-entiteit en herhaalpatronen."
    if (signal.includes("click_velocity") || signal.includes("click")) {
      confidence = 0.74
      detail =
        "Click-snelheid of herhaalde clicks wijken af van normale affiliate-patronen. Verifieer consent en bron."
    } else if (signal.includes("coupon")) {
      confidence = 0.71
      detail =
        "Coupongebruik vertoont zelfgebruik- of hergebruiksignalen. Controleer klant- en affiliate-koppeling."
    }
    return {
      recommendation_type: "Fraude-signaal",
      confidence_score: clampScore(confidence),
      explanation: `${detail} Dit is een aanbeveling, geen beslissing.`,
    }
  }

  if (subject === "match_candidate" || queue === "matching") {
    return {
      recommendation_type: "Matchvergelijking",
      confidence_score: clampScore(0.58),
      explanation:
        "Mogelijke productoverlap op basis van identifier/metadata. Vergelijk titels en EAN’s handmatig. Dit is een aanbeveling, geen beslissing.",
    }
  }

  if (subject === "claim" || queue === "claims" || queue === "ownership") {
    return {
      recommendation_type: "Consistentiecontrole",
      confidence_score: clampScore(0.55),
      explanation:
        "Controleer of de claimende seller aansluit bij merk/fabrikantgegevens en documentatie. Dit is een aanbeveling, geen beslissing.",
    }
  }

  if (subject === "product_origin" || queue === "disputes") {
    return {
      recommendation_type: "Consistentiecontrole",
      confidence_score: clampScore(0.52),
      explanation:
        "Vergelijk herkomstclaims met productversie en documentatie. Dit is een aanbeveling, geen beslissing.",
    }
  }

  if (caseType === "Hoog-risico wijziging" || queue === "hoog-risico") {
    return {
      recommendation_type: "Risicoclassificatie",
      confidence_score: clampScore(0.66),
      explanation:
        "Wijziging raakt kritieke productvelden. Beoordeel impact op catalogusconsistentie. Dit is een aanbeveling, geen beslissing.",
    }
  }

  return {
    recommendation_type: "Risicoclassificatie",
    confidence_score: clampScore(0.48),
    explanation:
      "Beperkte context beschikbaar. Gebruik de onderliggende entiteit voor beoordeling. Dit is een aanbeveling, geen beslissing.",
  }
}

/** Weigert teksten die als vooraf ingevulde beslissing klinken. */
export function assertAdvisoryOnly(explanation: string): void {
  const lower = explanation.toLowerCase()
  const banned = [
    "keur goed",
    "keur af",
    "automatisch goedgekeurd",
    "automatisch afgewezen",
    "besluit:",
    "moet worden goedgekeurd",
    "moet worden afgewezen",
  ]
  for (const phrase of banned) {
    if (lower.includes(phrase)) {
      throw new Error(
        `AI-advies mag geen beslissingstekst bevatten (gevonden: "${phrase}").`
      )
    }
  }
}
