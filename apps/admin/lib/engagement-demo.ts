/** Testdata blijft in de database, maar hoort niet in de gewone schermen. */
export function isDemoRecordName(value: string | null | undefined): boolean {
  return /\bp1ux|\bp1final\b|^p10[24]\b/i.test(value ?? "")
}
