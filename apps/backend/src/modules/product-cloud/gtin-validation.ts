/**
 * GTIN/EAN validation (format + MOD-10 checksum).
 */

export function normalizeGtinDigits(value: string): string {
  return value.replace(/\s/g, "")
}

export function isValidGtinChecksum(digits: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(digits)) return false
  const body = digits.slice(0, -1)
  const check = Number(digits.slice(-1))
  let sum = 0
  const reversed = body.split("").reverse()
  for (let i = 0; i < reversed.length; i++) {
    const n = Number(reversed[i])
    sum += i % 2 === 0 ? n * 3 : n
  }
  const calc = (10 - (sum % 10)) % 10
  return calc === check
}

export function isValidGtin(value: string | null | undefined): boolean {
  if (!value) return false
  const digits = normalizeGtinDigits(value)
  return isValidGtinChecksum(digits)
}
