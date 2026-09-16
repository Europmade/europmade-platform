/**
 * Structured order addresses (checkout → em_order text fields).
 * Stored as JSON when possible; legacy freeform comma strings still parse.
 */

export type OrderAddress = {
  name: string | null
  street: string | null
  postal_code: string | null
  city: string | null
  province: string | null
  country: string | null
  country_code: string | null
  raw: string
}

const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  nederland: "NL",
  netherlands: "NL",
  belgie: "BE",
  belgië: "BE",
  belgium: "BE",
  duitsland: "DE",
  germany: "DE",
  deutschland: "DE",
  frankrijk: "FR",
  france: "FR",
  spanje: "ES",
  spain: "ES",
  italie: "IT",
  italië: "IT",
  italy: "IT",
  oostenrijk: "AT",
  austria: "AT",
  portugal: "PT",
  ierland: "IE",
  ireland: "IE",
  polen: "PL",
  poland: "PL",
  zweden: "SE",
  sweden: "SE",
  denemarken: "DK",
  denmark: "DK",
  finland: "FI",
  tsjechie: "CZ",
  tsjechië: "CZ",
  "czech republic": "CZ",
  hongarije: "HU",
  hungary: "HU",
  roemenie: "RO",
  roemenië: "RO",
  romania: "RO",
  griekenland: "GR",
  greece: "GR",
  kroatie: "HR",
  kroatië: "HR",
  croatia: "HR",
  slovakije: "SK",
  slovakia: "SK",
  slovenie: "SI",
  slovenië: "SI",
  slovenia: "SI",
  litouwen: "LT",
  lithuania: "LT",
  letland: "LV",
  latvia: "LV",
  estland: "EE",
  estonia: "EE",
  luxemburg: "LU",
  luxembourg: "LU",
  malta: "MT",
  cyprus: "CY",
  bulgarije: "BG",
  bulgaria: "BG",
}

export function normalizeCountryCode(
  input: string | null | undefined
): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase()
  return COUNTRY_NAME_TO_ISO[trimmed.toLowerCase()] ?? null
}

export function serializeOrderAddress(input: {
  name?: string | null
  street?: string | null
  house_number?: string | null
  addition?: string | null
  postal_code?: string | null
  city?: string | null
  province?: string | null
  country?: string | null
  country_code?: string | null
}): string {
  const streetParts = [
    input.street?.trim(),
    input.house_number?.trim(),
    input.addition?.trim(),
  ].filter(Boolean)
  const street =
    streetParts.length > 0 ? streetParts.join(" ") : input.street?.trim() || null
  const country_code =
    normalizeCountryCode(input.country_code) ||
    normalizeCountryCode(input.country)
  const payload: OrderAddress = {
    name: input.name?.trim() || null,
    street,
    postal_code: input.postal_code?.trim() || null,
    city: input.city?.trim() || null,
    province: input.province?.trim() || null,
    country: input.country?.trim() || null,
    country_code,
    raw: "",
  }
  payload.raw = formatOrderAddressLines(payload).join("\n")
  return JSON.stringify({
    v: 1,
    name: payload.name,
    street: payload.street,
    postal_code: payload.postal_code,
    city: payload.city,
    province: payload.province,
    country: payload.country,
    country_code: payload.country_code,
  })
}

export function formatOrderAddressLines(addr: OrderAddress): string[] {
  const lines: string[] = []
  if (addr.name) lines.push(addr.name)
  if (addr.street) lines.push(addr.street)
  const postalCity = [addr.postal_code, addr.city].filter(Boolean).join(" ")
  if (postalCity) lines.push(postalCity)
  if (addr.province) lines.push(addr.province)
  if (addr.country) lines.push(addr.country)
  else if (addr.country_code) lines.push(addr.country_code)
  if (lines.length === 0 && addr.raw) return addr.raw.split(/\n|,/).map((s) => s.trim()).filter(Boolean)
  return lines
}

export function parseOrderAddress(
  raw: string | null | undefined,
  fallbackName?: string | null
): OrderAddress {
  const empty: OrderAddress = {
    name: fallbackName?.trim() || null,
    street: null,
    postal_code: null,
    city: null,
    province: null,
    country: null,
    country_code: null,
    raw: raw?.trim() || "",
  }
  if (!raw?.trim()) return empty

  const trimmed = raw.trim()
  if (trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed) as Record<string, unknown>
      const name =
        (typeof json.name === "string" && json.name.trim()) ||
        fallbackName?.trim() ||
        null
      const country =
        typeof json.country === "string" ? json.country.trim() : null
      const country_code =
        normalizeCountryCode(
          typeof json.country_code === "string" ? json.country_code : country
        )
      return {
        name,
        street: typeof json.street === "string" ? json.street.trim() : null,
        postal_code:
          typeof json.postal_code === "string"
            ? json.postal_code.trim()
            : null,
        city: typeof json.city === "string" ? json.city.trim() : null,
        province:
          typeof json.province === "string" ? json.province.trim() : null,
        country,
        country_code,
        raw: trimmed,
      }
    } catch {
      // fall through to freeform
    }
  }

  // Legacy: "Street 1, 1234 AB City, Province, Country" or newline-separated
  const parts = trimmed
    .split(/\n|,/)
    .map((p) => p.trim())
    .filter(Boolean)

  const result: OrderAddress = { ...empty, raw: trimmed }
  if (fallbackName) result.name = fallbackName.trim()

  if (parts.length === 0) return result

  // Detect postal+city pattern (NL: 1234 AB Amsterdam; DE: 10115 Berlin; BE: 1000 Brussel)
  let postalIdx = -1
  for (let i = 0; i < parts.length; i++) {
    if (/^\d{4}\s*[A-Za-z]{2}\b/.test(parts[i]) || /^\d{4,5}\s+\S+/.test(parts[i])) {
      postalIdx = i
      break
    }
  }

  if (postalIdx >= 0) {
    const postalPart = parts[postalIdx]
    const m =
      postalPart.match(/^(\d{4}\s*[A-Za-z]{2})\s+(.+)$/) ||
      postalPart.match(/^(\d{4,5})\s+(.+)$/)
    if (m) {
      result.postal_code = m[1].replace(/\s+/g, " ").trim()
      result.city = m[2].trim()
    } else {
      result.postal_code = postalPart
    }
    result.street = parts.slice(0, postalIdx).join(", ") || null
    const after = parts.slice(postalIdx + 1)
    if (after.length === 1) {
      result.country = after[0]
    } else if (after.length >= 2) {
      result.province = after[0]
      result.country = after[after.length - 1]
    }
  } else {
    result.street = parts[0] ?? null
    if (parts.length >= 2) result.city = parts[1]
    if (parts.length >= 3) result.country = parts[parts.length - 1]
    if (parts.length >= 4) result.province = parts[parts.length - 2]
  }

  result.country_code = normalizeCountryCode(result.country)
  return result
}
