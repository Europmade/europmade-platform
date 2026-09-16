/** Parse seller-entered money: accepts "4.95" and "4,95". Returns null while incomplete. */
export function parseMoneyInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Allow mid-edit values like "4," or "4."
  if (/^\d+[.,]?$/.test(trimmed)) {
    if (trimmed.endsWith(",") || trimmed.endsWith(".")) return null
  }
  const normalized = trimmed.replace(",", ".")
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

export function formatMoneyInput(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return ""
  return String(value)
}
