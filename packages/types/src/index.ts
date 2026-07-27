/**
 * @europmade/types — gedeelde, generieke TypeScript-types.
 *
 * BELANGRIJK: dit package bevat bewust nog geen domeintypes (Product, Offer,
 * Partner, Verification, e.d.) — die worden pas toegevoegd zodra de bijbehorende
 * businesslogica wordt gebouwd, conform de bevroren functionele specificaties in
 * docs/03-functional-specs/. Op dit moment levert dit package uitsluitend generieke,
 * technische hulptypes.
 */

/** Ondersteunde landen bij MVP-lancering (Blueprint H14.10, tech-stack.md — Medusa Region-model). */
export type SupportedCountry = "NL" | "BE" | "DE" | "FR" | "ES" | "IT";

/** Generieke, discriminated-union resultaatwrapper voor toekomstige API-calls. */
export type Result<TData, TError = string> =
  | { success: true; data: TData }
  | { success: false; error: TError };
