/**
 * Login/register e-mailveld: geen HTML type="email" (wireframes gebruiken
 * type=text). Native Chrome-validatie blokkeert anders de submit vóór onze
 * handler en toont cryptische typeMismatch-teksten.
 */

export function normalizeLoginEmail(value: string): string {
  return String(value || "")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
    .replace(/[\r\n\t]+/g, "")
    .replace(/\uFF20/g, "@")
    .trim()
    .replace(/^['"`]+|['"`]+$/g, "")
    .trim()
}

/** Praktische check: één @, lokaal deel en domein met punt. */
export function isValidLoginEmail(value: string): boolean {
  const email = normalizeLoginEmail(value)
  if (email.length < 3 || email.length > 254) return false
  if (/\s/.test(email)) return false
  const at = email.indexOf("@")
  if (at <= 0 || at !== email.lastIndexOf("@")) return false
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  if (!local || !domain) return false
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return false
  }
  if (!domain.includes(".")) return false
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) {
    return false
  }
  return true
}
