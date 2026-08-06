export function guestCheckoutCustomerId(token: string): string {
  return `guest:${token.trim()}`
}

export function parseGuestCheckoutToken(value: unknown): string | null {
  if (typeof value !== "string") return null
  const token = value.trim()
  return token.length >= 8 ? token : null
}
