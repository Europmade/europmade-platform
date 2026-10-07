const TOKENS = [
  { key: "voornaam", label: "Voornaam" },
  { key: "bedrijfsnaam", label: "Bedrijfsnaam" },
  { key: "email", label: "E-mail" },
] as const

export function fillMessageTokens(
  value: string,
  values: { voornaam?: string | null; bedrijfsnaam?: string | null; email?: string | null }
): string {
  let next = value
  for (const token of TOKENS) {
    const sample = values[token.key]?.trim()
    if (!sample) continue
    next = next.replaceAll(`{{${token.key}}}`, sample).replaceAll(`[${token.label}]`, sample)
  }
  return next
}
